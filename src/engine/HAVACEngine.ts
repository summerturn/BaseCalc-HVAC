// BaseCalc HVAC calculation engine. Pure functions, no UI deps.

// ─── Types ───────────────────────────────────────────────────────────

export interface CalculationResult {
  value: number;
  unit: string;
  passes: boolean;
  limit?: number;
  message: string;
  details: string[];
}

export interface MetricField {
  label: string;
  value: string;
  unit?: string;
  emphasis?: boolean;
}

export interface MetricResult {
  ok: boolean;
  message: string;
  fields: MetricField[];
  details: string[];
}

export type RefrigerantType = 'R410A' | 'R32' | 'R454B' | 'R22';
export type LiquidLineSize = '3/8' | '1/2' | '5/8';
export type SuctionLineSize = '3/4' | '7/8' | '1-1/8';

// ─── Validation Helpers ──────────────────────────────────────────────

function validatePositive(value: number, name: string): string | null {
  if (isNaN(value) || value <= 0) return `${name} must be a positive number`;
  return null;
}

function validateNonNegative(value: number, name: string): string | null {
  if (isNaN(value) || value < 0) return `${name} must be a non-negative number`;
  return null;
}

function validateRange(value: number, min: number, max: number, name: string): string | null {
  if (isNaN(value)) return `${name} must be a valid number`;
  if (value < min) return `${name} must be at least ${min}`;
  if (value > max) return `${name} must not exceed ${max}`;
  return null;
}

function fmt(n: number, d: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ─── Psychrometric Helpers ───────────────────────────────────────────

function saturationHumidityRatio(T: number): number {
  // Rough approximation used for field psychrometrics.
  return 0.0006 * Math.exp(0.0576 * T);
}

function humidityRatio(db: number, wb: number): number {
  const Wc = saturationHumidityRatio(wb);
  return ((1093 - 0.556 * wb) * Wc) / (1093 + 0.444 * db - wb);
}

function enthalpy(db: number, wb: number): number {
  const W = humidityRatio(db, wb);
  return 0.24 * db + W * (1061 + 0.444 * db);
}

// ─── Refrigerant Line Tables ─────────────────────────────────────────

const SUCTION_LINE_TABLE: Record<RefrigerantType, { tons: number; size: string }[]> = {
  R410A: [
    { tons: 1, size: '3/4' },
    { tons: 2, size: '7/8' },
    { tons: 3, size: '1-1/8' },
    { tons: 5, size: '1-3/8' },
  ],
  R32: [
    { tons: 1.5, size: '3/4' },
    { tons: 3, size: '7/8' },
    { tons: 5, size: '1-1/8' },
  ],
  R454B: [
    { tons: 1.5, size: '3/4' },
    { tons: 3, size: '7/8' },
    { tons: 5, size: '1-1/8' },
  ],
  R22: [
    { tons: 1, size: '3/4' },
    { tons: 2, size: '7/8' },
    { tons: 3.5, size: '1-1/8' },
    { tons: 5, size: '1-3/8' },
  ],
};

const LIQUID_LINE_TABLE: Record<RefrigerantType, { tons: number; size: string }[]> = {
  R410A: [
    { tons: 2, size: '3/8' },
    { tons: 3.5, size: '1/2' },
    { tons: 5, size: '5/8' },
  ],
  R32: [
    { tons: 2.5, size: '3/8' },
    { tons: 4, size: '1/2' },
    { tons: 5, size: '5/8' },
  ],
  R454B: [
    { tons: 2.5, size: '3/8' },
    { tons: 4, size: '1/2' },
    { tons: 5, size: '5/8' },
  ],
  R22: [
    { tons: 2, size: '3/8' },
    { tons: 3.5, size: '1/2' },
    { tons: 5, size: '5/8' },
  ],
};

function recommendLineSize(table: { tons: number; size: string }[], tons: number): string {
  for (const row of table) {
    if (tons <= row.tons) return row.size;
  }
  return table[table.length - 1]?.size ?? 'unknown';
}

// ─── Refrigerant Charge Tables (oz/ft) ───────────────────────────────

const LIQUID_CHARGE_OZ_PER_FT: Record<RefrigerantType, Record<LiquidLineSize, number>> = {
  R410A: { '3/8': 0.4, '1/2': 0.65, '5/8': 1.0 },
  R32: { '3/8': 0.35, '1/2': 0.58, '5/8': 0.9 },
  R454B: { '3/8': 0.36, '1/2': 0.59, '5/8': 0.92 },
  R22: { '3/8': 0.45, '1/2': 0.75, '5/8': 1.15 },
};

const SUCTION_CHARGE_OZ_PER_FT: Record<RefrigerantType, Record<SuctionLineSize, number>> = {
  R410A: { '3/4': 0.2, '7/8': 0.28, '1-1/8': 0.45 },
  R32: { '3/4': 0.18, '7/8': 0.25, '1-1/8': 0.4 },
  R454B: { '3/4': 0.18, '7/8': 0.26, '1-1/8': 0.41 },
  R22: { '3/4': 0.23, '7/8': 0.33, '1-1/8': 0.52 },
};

// ─── Calculator Engine ───────────────────────────────────────────────

export const HAVACEngine = {
  btuTons(inputs: { btu?: number; tons?: number }): MetricResult {
    const hasBtu = typeof inputs.btu === 'number' && isFinite(inputs.btu);
    const hasTons = typeof inputs.tons === 'number' && isFinite(inputs.tons);

    if (!hasBtu && !hasTons) {
      return { ok: false, message: 'Enter BTU/hr or tons to convert.', fields: [], details: [] };
    }

    if (hasBtu && hasTons) {
      const calcTons = inputs.btu! / 12000;
      const calcBtu = inputs.tons! * 12000;
      return {
        ok: true,
        message: `${fmt(inputs.btu!, 0)} BTU/hr = ${fmt(calcTons, 2)} tons · ${fmt(inputs.tons!, 2)} tons = ${fmt(calcBtu, 0)} BTU/hr`,
        fields: [
          { label: 'BTU/hr', value: fmt(inputs.btu!, 0), unit: 'BTU/hr', emphasis: true },
          { label: 'Tons', value: fmt(inputs.tons!, 2), unit: 'tons', emphasis: true },
        ],
        details: ['1 refrigeration ton = 12,000 BTU/hr'],
      };
    }

    if (hasBtu) {
      const tons = inputs.btu! / 12000;
      return {
        ok: true,
        message: `${fmt(inputs.btu!, 0)} BTU/hr = ${fmt(tons, 2)} tons`,
        fields: [
          { label: 'BTU/hr', value: fmt(inputs.btu!, 0), unit: 'BTU/hr', emphasis: true },
          { label: 'Tons', value: fmt(tons, 2), unit: 'tons', emphasis: true },
        ],
        details: ['1 refrigeration ton = 12,000 BTU/hr'],
      };
    }

    const btu = inputs.tons! * 12000;
    return {
      ok: true,
      message: `${fmt(inputs.tons!, 2)} tons = ${fmt(btu, 0)} BTU/hr`,
      fields: [
        { label: 'Tons', value: fmt(inputs.tons!, 2), unit: 'tons', emphasis: true },
        { label: 'BTU/hr', value: fmt(btu, 0), unit: 'BTU/hr', emphasis: true },
      ],
      details: ['1 refrigeration ton = 12,000 BTU/hr'],
    };
  },

  cfmFromBtu(inputs: { btu: number; deltaT: number }): MetricResult {
    const errs = [
      validatePositive(inputs.btu, 'BTU/hr'),
      validatePositive(inputs.deltaT, 'Temperature difference'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const cfm = inputs.btu / (1.08 * inputs.deltaT);
    return {
      ok: true,
      message: `${fmt(cfm, 0)} CFM required`,
      fields: [
        { label: 'CFM', value: fmt(cfm, 0), unit: 'CFM', emphasis: true },
        { label: 'BTU/hr', value: fmt(inputs.btu, 0), unit: 'BTU/hr' },
        { label: 'ΔT', value: fmt(inputs.deltaT, 1), unit: '°F' },
      ],
      details: [`CFM = ${fmt(inputs.btu, 0)} ÷ (1.08 × ${fmt(inputs.deltaT, 1)}) = ${fmt(cfm, 0)} CFM`],
    };
  },

  btuFromCfm(inputs: { cfm: number; deltaT: number }): MetricResult {
    const errs = [
      validatePositive(inputs.cfm, 'CFM'),
      validatePositive(inputs.deltaT, 'Temperature difference'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const btu = inputs.cfm * 1.08 * inputs.deltaT;
    const tons = btu / 12000;
    return {
      ok: true,
      message: `${fmt(btu, 0)} BTU/hr`,
      fields: [
        { label: 'BTU/hr', value: fmt(btu, 0), unit: 'BTU/hr', emphasis: true },
        { label: 'Tons', value: fmt(tons, 2), unit: 'tons' },
        { label: 'CFM', value: fmt(inputs.cfm, 0), unit: 'CFM' },
        { label: 'ΔT', value: fmt(inputs.deltaT, 1), unit: '°F' },
      ],
      details: [`BTU/hr = ${fmt(inputs.cfm, 0)} × 1.08 × ${fmt(inputs.deltaT, 1)} = ${fmt(btu, 0)} BTU/hr`],
    };
  },

  ductSizing(inputs: { cfm: number; velocity: number; aspectRatio?: number }): CalculationResult {
    const errs = [
      validatePositive(inputs.cfm, 'CFM'),
      validatePositive(inputs.velocity, 'Velocity'),
    ].filter(Boolean) as string[];
    if (errs.length) return { value: 0, unit: 'in', passes: false, message: errs.join('; '), details: [] };

    const area = inputs.cfm / inputs.velocity; // ft²
    const diameterIn = Math.sqrt((4 * area * 144) / Math.PI);
    const ar = inputs.aspectRatio && inputs.aspectRatio > 0 ? inputs.aspectRatio : 1;
    const heightIn = Math.sqrt((area * 144) / ar);
    const widthIn = heightIn * ar;
    const limit = 900;
    const passes = inputs.velocity <= limit;

    return {
      value: diameterIn,
      unit: 'in Ø',
      passes,
      limit,
      message: passes
        ? `Round duct ≈ ${fmt(diameterIn, 1)}" Ø at ${fmt(inputs.velocity, 0)} FPM`
        : `Velocity ${fmt(inputs.velocity, 0)} FPM exceeds typical ${limit} FPM residential return limit. Increase duct size.`,
      details: [
        `Area = ${fmt(area, 4)} ft²`,
        `Round diameter = ${fmt(diameterIn, 2)}"`,
        `Equivalent rectangular (${ar}:1) = ${fmt(widthIn, 1)}" × ${fmt(heightIn, 1)}"`,
        `Velocity = ${fmt(inputs.velocity, 0)} FPM`,
      ],
    };
  },

  airVelocity(inputs: { cfm: number; area: number }): MetricResult {
    const errs = [
      validatePositive(inputs.cfm, 'CFM'),
      validatePositive(inputs.area, 'Area'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const velocity = inputs.cfm / inputs.area;
    return {
      ok: true,
      message: `${fmt(velocity, 0)} FPM air velocity`,
      fields: [
        { label: 'Velocity', value: fmt(velocity, 0), unit: 'FPM', emphasis: true },
        { label: 'CFM', value: fmt(inputs.cfm, 0), unit: 'CFM' },
        { label: 'Area', value: fmt(inputs.area, 2), unit: 'ft²' },
      ],
      details: [`Velocity = ${fmt(inputs.cfm, 0)} CFM ÷ ${fmt(inputs.area, 2)} ft² = ${fmt(velocity, 0)} FPM`],
    };
  },

  psychrometrics(inputs: {
    cfm: number;
    enterDb: number;
    enterWb: number;
    leaveDb: number;
    leaveWb: number;
  }): MetricResult {
    const errs = [
      validatePositive(inputs.cfm, 'CFM'),
      validateRange(inputs.enterDb, -40, 180, 'Entering dry-bulb'),
      validateRange(inputs.enterWb, -40, 180, 'Entering wet-bulb'),
      validateRange(inputs.leaveDb, -40, 180, 'Leaving dry-bulb'),
      validateRange(inputs.leaveWb, -40, 180, 'Leaving wet-bulb'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const hIn = enthalpy(inputs.enterDb, inputs.enterWb);
    const hOut = enthalpy(inputs.leaveDb, inputs.leaveWb);
    const total = Math.abs(4.5 * inputs.cfm * (hOut - hIn));
    const sensible = Math.abs(1.08 * inputs.cfm * (inputs.leaveDb - inputs.enterDb));
    const latent = total - sensible;

    return {
      ok: true,
      message: `${fmt(Math.abs(total), 0)} BTU/hr total capacity`,
      fields: [
        { label: 'Total', value: fmt(total, 0), unit: 'BTU/hr', emphasis: true },
        { label: 'Sensible', value: fmt(sensible, 0), unit: 'BTU/hr', emphasis: true },
        { label: 'Latent', value: fmt(latent, 0), unit: 'BTU/hr' },
        { label: 'Enter enthalpy', value: fmt(hIn, 2), unit: 'BTU/lb' },
        { label: 'Leave enthalpy', value: fmt(hOut, 2), unit: 'BTU/lb' },
      ],
      details: [
        `h_in ≈ ${fmt(hIn, 2)} BTU/lb`,
        `h_out ≈ ${fmt(hOut, 2)} BTU/lb`,
        `Total = 4.5 × CFM × Δh = ${fmt(total, 0)} BTU/hr`,
        `Sensible = 1.08 × CFM × ΔDB = ${fmt(sensible, 0)} BTU/hr`,
        `Latent = total − sensible = ${fmt(latent, 0)} BTU/hr`,
        'Note: humidity ratio approximation is rough; verify with a psychrometric chart for critical work.',
      ],
    };
  },

  refrigerantLines(inputs: {
    tons: number;
    refrigerant: 'R410A' | 'R32' | 'R454B';
    lineLength: number;
  }): MetricResult {
    const errs = [
      validatePositive(inputs.tons, 'Tonnage'),
      validatePositive(inputs.lineLength, 'Line length'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const suction = recommendLineSize(SUCTION_LINE_TABLE[inputs.refrigerant], inputs.tons);
    const liquid = recommendLineSize(LIQUID_LINE_TABLE[inputs.refrigerant], inputs.tons);

    return {
      ok: true,
      message: `${inputs.refrigerant}: suction ${suction}", liquid ${liquid}"`,
      fields: [
        { label: 'Suction line', value: suction, unit: '"', emphasis: true },
        { label: 'Liquid line', value: liquid, unit: '"', emphasis: true },
        { label: 'System', value: inputs.refrigerant },
        { label: 'Line length', value: fmt(inputs.lineLength, 0), unit: 'ft' },
      ],
      details: [
        `System: ${inputs.refrigerant}`,
        `Capacity: ${fmt(inputs.tons, 1)} tons`,
        `Recommended suction line: ${suction}"`,
        `Recommended liquid line: ${liquid}"`,
        'Field note: verify against manufacturer line sizing tables and equivalent line length.',
      ],
    };
  },

  superheatSubcool(inputs: {
    refrigerant: 'R410A' | 'R22' | 'R32';
    outdoorTemp: number;
    indoorWb: number;
    mode: 'superheat' | 'subcool';
  }): MetricResult {
    const errs = [
      validateRange(inputs.outdoorTemp, -40, 140, 'Outdoor temperature'),
      validateRange(inputs.indoorWb, 0, 100, 'Indoor wet-bulb'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    if (inputs.mode === 'subcool') {
      return {
        ok: true,
        message: 'Typical subcooling target: 10°F',
        fields: [
          { label: 'Target subcooling', value: '10.0', unit: '°F', emphasis: true },
          { label: 'Refrigerant', value: inputs.refrigerant },
        ],
        details: [
          '10°F subcooling is a common field target for many residential split systems.',
          'Verify exact target with the manufacturer charging chart.',
        ],
      };
    }

    let targetSH = 30 + (inputs.indoorWb - 67) * 0.4 - (inputs.outdoorTemp - 95) * 0.1;
    targetSH = Math.max(5, Math.min(30, targetSH));

    return {
      ok: true,
      message: `Target superheat: ${fmt(targetSH, 1)}°F`,
      fields: [
        { label: 'Target superheat', value: fmt(targetSH, 1), unit: '°F', emphasis: true },
        { label: 'Outdoor temp', value: fmt(inputs.outdoorTemp, 1), unit: '°F' },
        { label: 'Indoor WB', value: fmt(inputs.indoorWb, 1), unit: '°F' },
      ],
      details: [
        `Target = 30 + (${fmt(inputs.indoorWb, 1)} − 67) × 0.4 − (${fmt(inputs.outdoorTemp, 1)} − 95) × 0.1`,
        `Clamped to 5–30°F range: ${fmt(targetSH, 1)}°F`,
        'Field note: manufacturer charging charts take precedence.',
      ],
    };
  },

  roomLoad(inputs: {
    area: number;
    ceilingHeight: number;
    loadFactor: number;
    occupants: number;
    windows: number;
    infiltration: number;
    climateFactor: number;
  }): MetricResult {
    const errs = [
      validatePositive(inputs.area, 'Area'),
      validatePositive(inputs.ceilingHeight, 'Ceiling height'),
      validatePositive(inputs.loadFactor, 'Load factor'),
      validateNonNegative(inputs.occupants, 'Occupants'),
      validateNonNegative(inputs.windows, 'Windows'),
      validateNonNegative(inputs.infiltration, 'Infiltration'),
      validatePositive(inputs.climateFactor, 'Climate factor'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const volume = inputs.area * inputs.ceilingHeight;
    const baseLoad = volume * inputs.loadFactor * inputs.climateFactor;
    const occupantLoad = inputs.occupants * 300;
    const windowLoad = inputs.windows * 1000;
    const infiltrationLoad = inputs.infiltration * 1000;
    const total = baseLoad + occupantLoad + windowLoad + infiltrationLoad;
    const tons = total / 12000;

    return {
      ok: true,
      message: `${fmt(total, 0)} BTU/hr room load`,
      fields: [
        { label: 'Total load', value: fmt(total, 0), unit: 'BTU/hr', emphasis: true },
        { label: 'Tons', value: fmt(tons, 2), unit: 'tons', emphasis: true },
        { label: 'Volume', value: fmt(volume, 0), unit: 'ft³' },
      ],
      details: [
        `Volume = ${fmt(inputs.area, 0)} sq ft × ${fmt(inputs.ceilingHeight, 1)} ft = ${fmt(volume, 0)} ft³`,
        `Base load = ${fmt(baseLoad, 0)} BTU/hr`,
        `Occupants = ${inputs.occupants} × 300 = ${fmt(occupantLoad, 0)} BTU/hr`,
        `Windows = ${inputs.windows} × 1,000 = ${fmt(windowLoad, 0)} BTU/hr`,
        `Infiltration = ${inputs.infiltration} × 1,000 = ${fmt(infiltrationLoad, 0)} BTU/hr`,
      ],
    };
  },

  heatPumpBalance(inputs: {
    designTemp: number;
    capacityAt47: number;
    capacityAt17: number;
    heatLossPerDegree: number;
  }): MetricResult {
    const errs = [
      validateRange(inputs.designTemp, -40, 80, 'Design temperature'),
      validatePositive(inputs.capacityAt47, 'Capacity at 47°F'),
      validatePositive(inputs.capacityAt17, 'Capacity at 17°F'),
      validatePositive(inputs.heatLossPerDegree, 'Heat loss per degree'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const slope = (inputs.capacityAt17 - inputs.capacityAt47) / (17 - 47);
    const capacityAtDesign = inputs.capacityAt47 + (inputs.designTemp - 47) * slope;
    // Balance point: capacity = heatLossPerDegree * (balanceTemp - designTemp)
    // capacityAt47 + (t - 47) * slope = heatLossPerDegree * (t - designTemp)
    // Solve for t.
    const balanceTemp = (inputs.heatLossPerDegree * inputs.designTemp - inputs.capacityAt47 + 47 * slope) /
      (inputs.heatLossPerDegree - slope);
    const heatLossAtDesign = inputs.heatLossPerDegree * (balanceTemp - inputs.designTemp);

    return {
      ok: true,
      message: `Balance point ≈ ${fmt(balanceTemp, 1)}°F`,
      fields: [
        { label: 'Balance point', value: fmt(balanceTemp, 1), unit: '°F', emphasis: true },
        { label: 'Capacity at design', value: fmt(capacityAtDesign, 0), unit: 'BTU/hr', emphasis: true },
        { label: 'Heat loss at balance', value: fmt(heatLossAtDesign, 0), unit: 'BTU/hr' },
      ],
      details: [
        `Capacity slope = (${fmt(inputs.capacityAt17, 0)} − ${fmt(inputs.capacityAt47, 0)}) ÷ (17 − 47)`,
        `Capacity at ${fmt(inputs.designTemp, 0)}°F ≈ ${fmt(capacityAtDesign, 0)} BTU/hr`,
        `Balance point solves capacity = heat loss per degree × (T − design temp)`,
      ],
    };
  },

  hydronics(inputs: { btu?: number; gpm?: number; deltaT: number }): MetricResult {
    const errs = [validatePositive(inputs.deltaT, 'Temperature difference')].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const hasBtu = typeof inputs.btu === 'number' && isFinite(inputs.btu);
    const hasGpm = typeof inputs.gpm === 'number' && isFinite(inputs.gpm);

    if (hasBtu && hasGpm) {
      const calcDeltaT = inputs.btu! / (inputs.gpm! * 500);
      return {
        ok: true,
        message: `ΔT = ${fmt(calcDeltaT, 1)}°F`,
        fields: [
          { label: 'BTU/hr', value: fmt(inputs.btu!, 0), unit: 'BTU/hr', emphasis: true },
          { label: 'GPM', value: fmt(inputs.gpm!, 1), unit: 'GPM', emphasis: true },
          { label: 'ΔT', value: fmt(calcDeltaT, 1), unit: '°F' },
        ],
        details: [`ΔT = ${fmt(inputs.btu!, 0)} ÷ (${fmt(inputs.gpm!, 1)} × 500) = ${fmt(calcDeltaT, 1)}°F`],
      };
    }

    if (hasBtu) {
      const gpm = inputs.btu! / (500 * inputs.deltaT);
      return {
        ok: true,
        message: `${fmt(gpm, 1)} GPM required`,
        fields: [
          { label: 'GPM', value: fmt(gpm, 1), unit: 'GPM', emphasis: true },
          { label: 'BTU/hr', value: fmt(inputs.btu!, 0), unit: 'BTU/hr' },
          { label: 'ΔT', value: fmt(inputs.deltaT, 1), unit: '°F' },
        ],
        details: [`GPM = ${fmt(inputs.btu!, 0)} ÷ (500 × ${fmt(inputs.deltaT, 1)}) = ${fmt(gpm, 1)} GPM`],
      };
    }

    if (hasGpm) {
      const btu = inputs.gpm! * 500 * inputs.deltaT;
      return {
        ok: true,
        message: `${fmt(btu, 0)} BTU/hr`,
        fields: [
          { label: 'BTU/hr', value: fmt(btu, 0), unit: 'BTU/hr', emphasis: true },
          { label: 'GPM', value: fmt(inputs.gpm!, 1), unit: 'GPM' },
          { label: 'ΔT', value: fmt(inputs.deltaT, 1), unit: '°F' },
        ],
        details: [`BTU/hr = ${fmt(inputs.gpm!, 1)} × 500 × ${fmt(inputs.deltaT, 1)} = ${fmt(btu, 0)} BTU/hr`],
      };
    }

    return { ok: false, message: 'Enter BTU/hr or GPM to solve.', fields: [], details: [] };
  },

  mixedAir(inputs: { oaPercent: number; oaTemp: number; raTemp: number }): MetricResult {
    const errs = [
      validateRange(inputs.oaPercent, 0, 100, 'OA percent'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const mat = (inputs.oaPercent / 100) * inputs.oaTemp + ((100 - inputs.oaPercent) / 100) * inputs.raTemp;
    return {
      ok: true,
      message: `Mixed air temperature ≈ ${fmt(mat, 1)}°F`,
      fields: [
        { label: 'Mixed air', value: fmt(mat, 1), unit: '°F', emphasis: true },
        { label: 'OA %', value: fmt(inputs.oaPercent, 0), unit: '%' },
        { label: 'OA temp', value: fmt(inputs.oaTemp, 1), unit: '°F' },
        { label: 'RA temp', value: fmt(inputs.raTemp, 1), unit: '°F' },
      ],
      details: [
        `MAT = (${fmt(inputs.oaPercent, 0)}% × ${fmt(inputs.oaTemp, 1)}°F) + (${fmt(100 - inputs.oaPercent, 0)}% × ${fmt(inputs.raTemp, 1)}°F)`,
        `MAT = ${fmt(mat, 1)}°F`,
      ],
    };
  },

  airChanges(inputs: { cfm: number; volume: number }): MetricResult {
    const errs = [
      validatePositive(inputs.cfm, 'CFM'),
      validatePositive(inputs.volume, 'Volume'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const ach = (inputs.cfm * 60) / inputs.volume;
    return {
      ok: true,
      message: `${fmt(ach, 1)} air changes per hour`,
      fields: [
        { label: 'ACH', value: fmt(ach, 1), unit: 'ACH', emphasis: true },
        { label: 'CFM', value: fmt(inputs.cfm, 0), unit: 'CFM' },
        { label: 'Volume', value: fmt(inputs.volume, 0), unit: 'ft³' },
      ],
      details: [`ACH = (${fmt(inputs.cfm, 0)} × 60) ÷ ${fmt(inputs.volume, 0)} = ${fmt(ach, 1)}`],
    };
  },

  evaporativeCooling(inputs: {
    oaDb: number;
    oaWb: number;
    efficiency: number;
    cfm: number;
    cfmPerTon?: number;
  }): MetricResult {
    const errs = [
      validateRange(inputs.oaDb, 0, 140, 'Outdoor dry-bulb'),
      validateRange(inputs.oaWb, 0, 100, 'Outdoor wet-bulb'),
      validateRange(inputs.efficiency, 0, 1, 'Efficiency'),
      validatePositive(inputs.cfm, 'CFM'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const supplyDb = inputs.oaDb - inputs.efficiency * (inputs.oaDb - inputs.oaWb);
    const cfmPerTon = inputs.cfmPerTon && inputs.cfmPerTon > 0 ? inputs.cfmPerTon : 400;
    const tons = inputs.cfm / cfmPerTon;

    return {
      ok: true,
      message: `Supply DB ≈ ${fmt(supplyDb, 1)}°F · ${fmt(tons, 1)} tons`,
      fields: [
        { label: 'Supply DB', value: fmt(supplyDb, 1), unit: '°F', emphasis: true },
        { label: 'Tons', value: fmt(tons, 1), unit: 'tons', emphasis: true },
        { label: 'Efficiency', value: fmt(inputs.efficiency * 100, 0), unit: '%' },
        { label: 'Wet-bulb depression', value: fmt(inputs.oaDb - inputs.oaWb, 1), unit: '°F' },
      ],
      details: [
        `Supply DB = ${fmt(inputs.oaDb, 1)} − ${fmt(inputs.efficiency * 100, 0)}% × (${fmt(inputs.oaDb, 1)} − ${fmt(inputs.oaWb, 1)})`,
        `Supply DB = ${fmt(supplyDb, 1)}°F`,
        `Tons = ${fmt(inputs.cfm, 0)} CFM ÷ ${cfmPerTon} CFM/ton = ${fmt(tons, 1)} tons`,
      ],
    };
  },

  filterVelocity(inputs: {
    cfm: number;
    filterWidth: number;
    filterHeight: number;
  }): CalculationResult {
    const errs = [
      validatePositive(inputs.cfm, 'CFM'),
      validatePositive(inputs.filterWidth, 'Filter width'),
      validatePositive(inputs.filterHeight, 'Filter height'),
    ].filter(Boolean) as string[];
    if (errs.length) return { value: 0, unit: 'FPM', passes: false, message: errs.join('; '), details: [] };

    const area = (inputs.filterWidth * inputs.filterHeight) / 144;
    const velocity = inputs.cfm / area;
    const pressureDrop = Math.pow(velocity / 300, 2) * 0.1;
    const limit = 500;
    const passes = velocity <= limit;

    return {
      value: velocity,
      unit: 'FPM',
      passes,
      limit,
      message: passes
        ? `Face velocity ${fmt(velocity, 0)} FPM — within ${limit} FPM guidance`
        : `Face velocity ${fmt(velocity, 0)} FPM exceeds ${limit} FPM guidance. Increase filter area.`,
      details: [
        `Filter area = ${fmt(inputs.filterWidth, 1)}" × ${fmt(inputs.filterHeight, 1)}" ÷ 144 = ${fmt(area, 2)} ft²`,
        `Velocity = ${fmt(inputs.cfm, 0)} ÷ ${fmt(area, 2)} = ${fmt(velocity, 0)} FPM`,
        `Approx. pressure drop ≈ ${fmt(pressureDrop, 3)}" wc`,
      ],
    };
  },

  combustionAnalysis(inputs: {
    fuel: 'naturalGas' | 'propane' | 'oil';
    o2: number;
    co2?: number;
  }): MetricResult {
    const errs = [validateRange(inputs.o2, 0, 21, 'O2 percent')].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const stoichCO2: Record<typeof inputs.fuel, number> = {
      naturalGas: 11.8,
      propane: 13.8,
      oil: 15.5,
    };

    let excessAir: number;
    let method: string;

    if (inputs.co2 != null && inputs.co2 > 0) {
      excessAir = (stoichCO2[inputs.fuel] / inputs.co2 - 1) * 100;
      method = 'CO2-based';
    } else {
      excessAir = (inputs.o2 / (20.9 - inputs.o2)) * 100;
      method = 'O2-based (natural-gas approximation)';
    }

    return {
      ok: true,
      message: `${fmt(excessAir, 1)}% excess air`,
      fields: [
        { label: 'Excess air', value: fmt(excessAir, 1), unit: '%', emphasis: true },
        { label: 'Fuel', value: inputs.fuel },
        { label: 'O2', value: fmt(inputs.o2, 1), unit: '%' },
        ...(inputs.co2 != null ? [{ label: 'CO2', value: fmt(inputs.co2, 1), unit: '%' }] : []),
      ],
      details: [
        `Fuel: ${inputs.fuel}`,
        `Stoichiometric CO2 ≈ ${stoichCO2[inputs.fuel]}%`,
        `Method: ${method}`,
        `Excess air = ${fmt(excessAir, 1)}%`,
      ],
    };
  },

  refrigerantWeight(inputs: {
    liquidLineLength: number;
    suctionLineLength: number;
    liquidLineSize: LiquidLineSize;
    suctionLineSize: SuctionLineSize;
    refrigerant: 'R410A' | 'R22';
  }): MetricResult {
    const errs = [
      validateNonNegative(inputs.liquidLineLength, 'Liquid line length'),
      validateNonNegative(inputs.suctionLineLength, 'Suction line length'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const liquidOz = inputs.liquidLineLength * LIQUID_CHARGE_OZ_PER_FT[inputs.refrigerant][inputs.liquidLineSize];
    const suctionOz = inputs.suctionLineLength * SUCTION_CHARGE_OZ_PER_FT[inputs.refrigerant][inputs.suctionLineSize];
    const totalOz = liquidOz + suctionOz;
    const totalLb = totalOz / 16;

    return {
      ok: true,
      message: `${fmt(totalOz, 1)} oz (${fmt(totalLb, 2)} lb) line-set charge`,
      fields: [
        { label: 'Total charge', value: fmt(totalOz, 1), unit: 'oz', emphasis: true },
        { label: 'Pounds', value: fmt(totalLb, 2), unit: 'lb', emphasis: true },
        { label: 'Liquid line', value: fmt(liquidOz, 1), unit: 'oz' },
        { label: 'Suction line', value: fmt(suctionOz, 1), unit: 'oz' },
      ],
      details: [
        `Liquid: ${fmt(inputs.liquidLineLength, 0)} ft × ${LIQUID_CHARGE_OZ_PER_FT[inputs.refrigerant][inputs.liquidLineSize]} oz/ft = ${fmt(liquidOz, 1)} oz`,
        `Suction: ${fmt(inputs.suctionLineLength, 0)} ft × ${SUCTION_CHARGE_OZ_PER_FT[inputs.refrigerant][inputs.suctionLineSize]} oz/ft = ${fmt(suctionOz, 1)} oz`,
        'Field note: add manufacturer-specified base charge and weigh refrigerant for accuracy.',
      ],
    };
  },

  economizer(inputs: {
    zoneArea: number;
    occupancyDensity: number;
    cfmPerPerson: number;
    cfmPerArea: number;
  }): MetricResult {
    const errs = [
      validatePositive(inputs.zoneArea, 'Zone area'),
      validatePositive(inputs.occupancyDensity, 'Occupancy density'),
      validateNonNegative(inputs.cfmPerPerson, 'CFM per person'),
      validateNonNegative(inputs.cfmPerArea, 'CFM per area'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const people = inputs.zoneArea / inputs.occupancyDensity;
    const oaCfm = people * inputs.cfmPerPerson + inputs.zoneArea * inputs.cfmPerArea;

    return {
      ok: true,
      message: `${fmt(oaCfm, 0)} CFM outdoor air required`,
      fields: [
        { label: 'OA CFM', value: fmt(oaCfm, 0), unit: 'CFM', emphasis: true },
        { label: 'Occupants', value: fmt(people, 1) },
        { label: 'Zone area', value: fmt(inputs.zoneArea, 0), unit: 'ft²' },
      ],
      details: [
        `People = ${fmt(inputs.zoneArea, 0)} ÷ ${fmt(inputs.occupancyDensity, 1)} = ${fmt(people, 1)}`,
        `OA CFM = ${fmt(people, 1)} × ${fmt(inputs.cfmPerPerson, 0)} + ${fmt(inputs.zoneArea, 0)} × ${fmt(inputs.cfmPerArea, 2)}`,
        `OA CFM = ${fmt(oaCfm, 0)} CFM`,
      ],
    };
  },
};

// BaseCalc HVAC calculation engine. Pure functions, no UI deps.

// ─── Types ───────────────────────────────────────────────────────────

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

// ─── Validation Helpers ──────────────────────────────────────────────

function validatePositive(value: number, name: string): string | null {
  if (!Number.isFinite(value) || value <= 0) return `${name} must be a finite positive number`;
  return null;
}

function validateRange(value: number, min: number, max: number, name: string): string | null {
  if (!Number.isFinite(value)) return `${name} must be a finite number`;
  if (value < min) return `${name} must be at least ${min}`;
  if (value > max) return `${name} must not exceed ${max}`;
  return null;
}

function validateOptionalRange(
  value: number | undefined,
  min: number,
  max: number,
  name: string
): string | null {
  return value === undefined ? null : validateRange(value, min, max, name);
}

function fmt(n: number, d: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ─── Psychrometric Helpers ───────────────────────────────────────────

const STANDARD_ATMOSPHERIC_PRESSURE_PA = 101325;

function fahrenheitToCelsius(value: number): number {
  return (value - 32) * (5 / 9);
}

// ASHRAE Fundamentals saturation-pressure equations over liquid water/ice.
function saturationVaporPressurePa(temperatureC: number): number {
  const temperatureK = temperatureC + 273.15;
  const logPressure = temperatureC <= 0
    ? -5674.5359 / temperatureK
      + 6.3925247
      - 0.009677843 * temperatureK
      + 0.00000062215701 * temperatureK ** 2
      + 0.0000000020747825 * temperatureK ** 3
      - 0.0000000000009484024 * temperatureK ** 4
      + 4.1635019 * Math.log(temperatureK)
    : -5800.2206 / temperatureK
      + 1.3914993
      - 0.048640239 * temperatureK
      + 0.000041764768 * temperatureK ** 2
      - 0.000000014452093 * temperatureK ** 3
      + 6.5459673 * Math.log(temperatureK);
  return Math.exp(logPressure);
}

function humidityRatioFromDryAndWetBulb(dbF: number, wbF: number): number {
  const dbC = fahrenheitToCelsius(dbF);
  const wbC = fahrenheitToCelsius(wbF);
  const saturationPressure = saturationVaporPressurePa(wbC);
  const saturationRatio = 0.621945 * saturationPressure
    / (STANDARD_ATMOSPHERIC_PRESSURE_PA - saturationPressure);

  if (wbC >= 0) {
    return ((2501 - 2.326 * wbC) * saturationRatio - 1.006 * (dbC - wbC))
      / (2501 + 1.86 * dbC - 4.186 * wbC);
  }

  return ((2830 - 0.24 * wbC) * saturationRatio - 1.006 * (dbC - wbC))
    / (2830 + 1.86 * dbC - 2.1 * wbC);
}

function enthalpyBtuPerLb(dbF: number, wbF: number): number {
  const humidityRatio = humidityRatioFromDryAndWetBulb(dbF, wbF);
  return 0.24 * dbF + humidityRatio * (1061 + 0.444 * dbF);
}

// ─── Calculator Engine ───────────────────────────────────────────────

export const HAVACEngine = {
  btuTons(inputs: { btu?: number; tons?: number }): MetricResult {
    const hasBtu = typeof inputs.btu === 'number';
    const hasTons = typeof inputs.tons === 'number';

    if (!hasBtu && !hasTons) {
      return { ok: false, message: 'Enter BTU/hr or tons to convert.', fields: [], details: [] };
    }

    const errs = [
      hasBtu ? validatePositive(inputs.btu!, 'BTU/hr') : null,
      hasTons ? validatePositive(inputs.tons!, 'Tons') : null,
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

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
      validatePositive(inputs.btu, 'Sensible heat'),
      validatePositive(inputs.deltaT, 'Temperature difference'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const cfm = inputs.btu / (1.08 * inputs.deltaT);
    return {
      ok: true,
      message: `${fmt(cfm, 0)} CFM for the supplied sensible heat`,
      fields: [
        { label: 'CFM', value: fmt(cfm, 0), unit: 'CFM', emphasis: true },
        { label: 'Sensible heat', value: fmt(inputs.btu, 0), unit: 'BTU/hr' },
        { label: 'ΔT', value: fmt(inputs.deltaT, 1), unit: '°F' },
      ],
      details: [
        `CFM = ${fmt(inputs.btu, 0)} ÷ (1.08 × ${fmt(inputs.deltaT, 1)}) = ${fmt(cfm, 0)} CFM`,
        'The 1.08 factor is a near-sea-level standard-air approximation. This is sensible heat only, not total equipment capacity.',
      ],
    };
  },

  btuFromCfm(inputs: { cfm: number; deltaT: number }): MetricResult {
    const errs = [
      validatePositive(inputs.cfm, 'CFM'),
      validatePositive(inputs.deltaT, 'Temperature difference'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const btu = inputs.cfm * 1.08 * inputs.deltaT;
    return {
      ok: true,
      message: `${fmt(btu, 0)} sensible BTU/hr`,
      fields: [
        { label: 'Sensible heat', value: fmt(btu, 0), unit: 'BTU/hr', emphasis: true },
        { label: 'CFM', value: fmt(inputs.cfm, 0), unit: 'CFM' },
        { label: 'ΔT', value: fmt(inputs.deltaT, 1), unit: '°F' },
      ],
      details: [
        `Sensible BTU/hr = ${fmt(inputs.cfm, 0)} × 1.08 × ${fmt(inputs.deltaT, 1)} = ${fmt(btu, 0)} BTU/hr`,
        'The 1.08 factor is a near-sea-level standard-air approximation. Latent load and total equipment capacity are not calculated.',
      ],
    };
  },

  ductSizing(inputs: { cfm: number; velocity: number; aspectRatio?: number }): MetricResult {
    const errs = [
      validatePositive(inputs.cfm, 'CFM'),
      validatePositive(inputs.velocity, 'Velocity'),
      inputs.aspectRatio === undefined ? null : validateRange(inputs.aspectRatio, 1, 10, 'Aspect ratio'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const area = inputs.cfm / inputs.velocity; // ft²
    const diameterIn = Math.sqrt((4 * area * 144) / Math.PI);
    const ar = inputs.aspectRatio && inputs.aspectRatio > 0 ? inputs.aspectRatio : 1;
    const heightIn = Math.sqrt((area * 144) / ar);
    const widthIn = heightIn * ar;
    return {
      ok: true,
      message: `Round duct area equivalent: ${fmt(diameterIn, 1)}" diameter`,
      fields: [
        { label: 'Round diameter', value: fmt(diameterIn, 1), unit: 'in', emphasis: true },
        { label: 'Rectangular width', value: fmt(widthIn, 1), unit: 'in' },
        { label: 'Rectangular height', value: fmt(heightIn, 1), unit: 'in' },
        { label: 'Area', value: fmt(area, 3), unit: 'ft²' },
        { label: 'Design velocity', value: fmt(inputs.velocity, 0), unit: 'FPM' },
      ],
      details: [
        `Area = ${fmt(inputs.cfm, 0)} CFM ÷ ${fmt(inputs.velocity, 0)} FPM = ${fmt(area, 4)} ft²`,
        `Equivalent rectangular (${ar}:1) = ${fmt(widthIn, 1)}" × ${fmt(heightIn, 1)}"`,
        'The entered velocity is a design input. Friction rate, static-pressure budget, fittings, noise, and duct role are not validated.',
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
      inputs.enterWb > inputs.enterDb ? 'Entering wet-bulb must not exceed entering dry-bulb' : null,
      inputs.leaveWb > inputs.leaveDb ? 'Leaving wet-bulb must not exceed leaving dry-bulb' : null,
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const hIn = enthalpyBtuPerLb(inputs.enterDb, inputs.enterWb);
    const hOut = enthalpyBtuPerLb(inputs.leaveDb, inputs.leaveWb);
    const enteringHumidityRatio = humidityRatioFromDryAndWetBulb(inputs.enterDb, inputs.enterWb);
    const leavingHumidityRatio = humidityRatioFromDryAndWetBulb(inputs.leaveDb, inputs.leaveWb);
    if (![hIn, hOut, enteringHumidityRatio, leavingHumidityRatio].every(Number.isFinite)
      || enteringHumidityRatio < 0 || leavingHumidityRatio < 0) {
      return {
        ok: false,
        message: 'The supplied dry-bulb and wet-bulb values do not describe a valid standard-atmosphere air state.',
        fields: [],
        details: [],
      };
    }
    if (hIn <= hOut || inputs.enterDb <= inputs.leaveDb) {
      return {
        ok: false,
        message: 'Entering air must be warmer and have higher enthalpy than leaving air for this cooling-capacity calculation.',
        fields: [],
        details: [],
      };
    }

    const total = 4.5 * inputs.cfm * (hIn - hOut);
    const sensible = 1.08 * inputs.cfm * (inputs.enterDb - inputs.leaveDb);
    const latent = total - sensible;
    if (latent < 0) {
      return {
        ok: false,
        message: 'The supplied air states imply negative latent cooling. Verify all dry-bulb and wet-bulb readings.',
        fields: [],
        details: [],
      };
    }

    return {
      ok: true,
      message: `${fmt(total, 0)} BTU/hr air-side cooling capacity`,
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
        'Calculated at standard atmospheric pressure (101.325 kPa). Adjust for site elevation when required.',
      ],
    };
  },

  refrigerantLines(inputs: {
    tons: number;
    refrigerant: 'R410A' | 'R32' | 'R454B';
    equivalentLineLength: number;
    manufacturerMaxEquivalentLength?: number;
    manufacturerSuctionSize?: string;
    manufacturerLiquidSize?: string;
  }): MetricResult {
    const errs = [
      validateRange(inputs.tons, 0.25, 100, 'Tonnage'),
      validateRange(inputs.equivalentLineLength, 0.1, 10000, 'Equivalent line length'),
      validateOptionalRange(inputs.manufacturerMaxEquivalentLength, 0.1, 10000, 'Manufacturer maximum equivalent length'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const suction = inputs.manufacturerSuctionSize?.trim();
    const liquid = inputs.manufacturerLiquidSize?.trim();
    const maxLength = inputs.manufacturerMaxEquivalentLength;
    if (!suction || !liquid || maxLength === undefined) {
      return {
        ok: false,
        message: 'Manufacturer line sizes and maximum equivalent line length are required. BaseCalc does not infer universal tubing sizes.',
        fields: [],
        details: [],
      };
    }

    if (suction.length > 32 || liquid.length > 32) {
      return {
        ok: false,
        message: 'Manufacturer line-size entries must be 32 characters or fewer.',
        fields: [],
        details: [],
      };
    }

    if (inputs.equivalentLineLength > maxLength) {
      return {
        ok: false,
        message: `Equivalent line length ${fmt(inputs.equivalentLineLength, 0)} ft exceeds the supplied manufacturer limit of ${fmt(maxLength, 0)} ft.`,
        fields: [],
        details: [],
      };
    }

    const remainingLength = maxLength - inputs.equivalentLineLength;

    return {
      ok: true,
      message: 'Supplied manufacturer line data is within the entered equivalent-length limit.',
      fields: [
        { label: 'Suction line', value: suction, emphasis: true },
        { label: 'Liquid line', value: liquid, emphasis: true },
        { label: 'System', value: inputs.refrigerant },
        { label: 'Equivalent length', value: fmt(inputs.equivalentLineLength, 0), unit: 'ft' },
        { label: 'Length margin', value: fmt(remainingLength, 0), unit: 'ft' },
      ],
      details: [
        `Equipment data entered for ${inputs.refrigerant}, ${fmt(inputs.tons, 1)} tons`,
        `Equivalent length check: ${fmt(inputs.equivalentLineLength, 0)} ft ≤ ${fmt(maxLength, 0)} ft`,
        'Sizes are recorded from manufacturer data; BaseCalc has not selected or verified them independently.',
      ],
    };
  },

  superheatSubcool(inputs: {
    refrigerant: RefrigerantType;
    mode: 'superheat' | 'subcool';
    manufacturerTarget?: number;
  }): MetricResult {
    const errs = [validateOptionalRange(inputs.manufacturerTarget, 0.1, 100, 'Manufacturer target')].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    if (inputs.manufacturerTarget === undefined) {
      return {
        ok: false,
        message: `Enter the equipment manufacturer's ${inputs.mode} target. BaseCalc does not generate a universal charging target.`,
        fields: [],
        details: [],
      };
    }

    const label = inputs.mode === 'superheat' ? 'Superheat target' : 'Subcooling target';

    return {
      ok: true,
      message: `${label} recorded from manufacturer data: ${fmt(inputs.manufacturerTarget, 1)}°F`,
      fields: [
        { label, value: fmt(inputs.manufacturerTarget, 1), unit: '°F', emphasis: true },
        { label: 'Refrigerant', value: inputs.refrigerant },
        { label: 'Source', value: 'Manufacturer data' },
      ],
      details: [
        'Use the exact charging procedure, metering-device method, and operating conditions published for the equipment.',
        'BaseCalc records the entered target and does not calculate or certify charge.',
      ],
    };
  },

  roomLoad(inputs: {
    area: number;
    loadFactor: number;
  }): MetricResult {
    const errs = [
      validateRange(inputs.area, 1, 1000000, 'Area'),
      validateRange(inputs.loadFactor, 5, 100, 'Area load factor'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const total = inputs.area * inputs.loadFactor;
    const tons = total / 12000;

    return {
      ok: true,
      message: `${fmt(total, 0)} BTU/hr preliminary area-factor estimate`,
      fields: [
        { label: 'Planning load', value: fmt(total, 0), unit: 'BTU/hr', emphasis: true },
        { label: 'Nominal tons', value: fmt(tons, 2), unit: 'tons' },
        { label: 'Area factor', value: fmt(inputs.loadFactor, 1), unit: 'BTU/hr·ft²' },
      ],
      details: [
        `${fmt(inputs.area, 0)} ft² × ${fmt(inputs.loadFactor, 1)} BTU/hr·ft² = ${fmt(total, 0)} BTU/hr`,
        'The load factor is user supplied. This planning estimate is not ACCA Manual J and must not be the sole basis for equipment selection.',
      ],
    };
  },

  heatPumpBalance(inputs: {
    designTemp: number;
    capacityAt47: number;
    capacityAt17: number;
    heatLossPerDegree: number;
    indoorSetpoint: number;
  }): MetricResult {
    const errs = [
      validateRange(inputs.designTemp, -40, 80, 'Design temperature'),
      validateRange(inputs.indoorSetpoint, 50, 85, 'Indoor setpoint'),
      validatePositive(inputs.capacityAt47, 'Capacity at 47°F'),
      validatePositive(inputs.capacityAt17, 'Capacity at 17°F'),
      validatePositive(inputs.heatLossPerDegree, 'Heat loss per degree'),
      inputs.capacityAt47 <= inputs.capacityAt17 ? 'Capacity at 47°F must exceed capacity at 17°F' : null,
      inputs.designTemp >= inputs.indoorSetpoint ? 'Design temperature must be below the indoor setpoint' : null,
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const slope = (inputs.capacityAt47 - inputs.capacityAt17) / (47 - 17);
    const designHeatLoss = inputs.heatLossPerDegree * (inputs.indoorSetpoint - inputs.designTemp);
    const balanceTemp = (inputs.heatLossPerDegree * inputs.indoorSetpoint - inputs.capacityAt47 + 47 * slope)
      / (inputs.heatLossPerDegree + slope);
    const heatLossAtBalance = inputs.heatLossPerDegree * (inputs.indoorSetpoint - balanceTemp);

    if (![designHeatLoss, balanceTemp, heatLossAtBalance].every(Number.isFinite)
      || designHeatLoss <= 0 || heatLossAtBalance <= 0) {
      return {
        ok: false,
        message: 'The supplied capacity and heat-loss data do not produce a physical positive balance result.',
        fields: [],
        details: [],
      };
    }

    if (balanceTemp < 17 || balanceTemp > 47) {
      return {
        ok: false,
        message: `No balance point is bracketed by the supplied 17°F and 47°F capacity data. Add manufacturer capacity data nearer the expected crossing instead of extrapolating to ${fmt(balanceTemp, 1)}°F.`,
        fields: [],
        details: [],
      };
    }

    const designIsBracketed = inputs.designTemp >= 17 && inputs.designTemp <= 47;
    const capacityAtDesign = designIsBracketed
      ? inputs.capacityAt17 + (inputs.designTemp - 17) * slope
      : null;

    return {
      ok: true,
      message: `Balance point ≈ ${fmt(balanceTemp, 1)}°F`,
      fields: [
        { label: 'Balance point', value: fmt(balanceTemp, 1), unit: '°F', emphasis: true },
        { label: 'Heat loss at balance', value: fmt(heatLossAtBalance, 0), unit: 'BTU/hr', emphasis: true },
        ...(capacityAtDesign === null
          ? []
          : [{ label: 'Capacity at design', value: fmt(capacityAtDesign, 0), unit: 'BTU/hr' }]),
        { label: 'Design heat loss', value: fmt(designHeatLoss, 0), unit: 'BTU/hr' },
      ],
      details: [
        `Capacity slope = (${fmt(inputs.capacityAt47, 0)} − ${fmt(inputs.capacityAt17, 0)}) ÷ 30 = ${fmt(slope, 1)} BTU/hr·°F`,
        `Building heat loss = ${fmt(inputs.heatLossPerDegree, 0)} × (${fmt(inputs.indoorSetpoint, 1)} − outdoor temperature)`,
        designIsBracketed
          ? `Capacity at ${fmt(inputs.designTemp, 1)}°F is interpolated between the supplied manufacturer points.`
          : `Capacity at ${fmt(inputs.designTemp, 1)}°F is not shown because it falls outside the supplied 17–47°F manufacturer-data bracket.`,
        'The balance point is linearly interpolated only within the supplied manufacturer-data bracket.',
      ],
    };
  },

  hydronics(inputs: { btu?: number; gpm?: number; deltaT?: number }): MetricResult {
    const hasBtu = typeof inputs.btu === 'number';
    const hasGpm = typeof inputs.gpm === 'number';
    const hasDeltaT = typeof inputs.deltaT === 'number';
    const errs = [
      hasBtu ? validatePositive(inputs.btu!, 'BTU/hr') : null,
      hasGpm ? validatePositive(inputs.gpm!, 'GPM') : null,
      hasDeltaT ? validatePositive(inputs.deltaT!, 'Temperature difference') : null,
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const suppliedCount = Number(hasBtu) + Number(hasGpm) + Number(hasDeltaT);
    if (suppliedCount < 2) {
      return { ok: false, message: 'Enter any two of BTU/hr, GPM, or temperature difference.', fields: [], details: [] };
    }

    if (hasBtu && hasGpm && hasDeltaT) {
      const calculatedBtu = inputs.gpm! * 500 * inputs.deltaT!;
      const differencePercent = Math.abs(calculatedBtu - inputs.btu!) / inputs.btu! * 100;
      const consistent = differencePercent <= 2;
      return {
        ok: consistent,
        message: consistent
          ? `The three water-side inputs agree within ${fmt(differencePercent, 1)}%`
          : `The three water-side inputs differ by ${fmt(differencePercent, 1)}%; correct one input`,
        fields: [
          { label: 'Entered heat', value: fmt(inputs.btu!, 0), unit: 'BTU/hr', emphasis: true },
          { label: 'Calculated heat', value: fmt(calculatedBtu, 0), unit: 'BTU/hr' },
          { label: 'Difference', value: fmt(differencePercent, 1), unit: '%' },
        ],
        details: ['Water-side check uses BTU/hr = GPM × 500 × ΔT. The 500 factor is not valid for glycol without adjustment.'],
      };
    }

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
        details: [
          `ΔT = ${fmt(inputs.btu!, 0)} ÷ (${fmt(inputs.gpm!, 1)} × 500) = ${fmt(calcDeltaT, 1)}°F`,
          'Water-side calculation only. Adjust the heat-transfer factor for glycol or other fluids.',
        ],
      };
    }

    if (hasBtu && hasDeltaT) {
      const gpm = inputs.btu! / (500 * inputs.deltaT!);
      return {
        ok: true,
        message: `${fmt(gpm, 1)} GPM required`,
        fields: [
          { label: 'GPM', value: fmt(gpm, 1), unit: 'GPM', emphasis: true },
          { label: 'BTU/hr', value: fmt(inputs.btu!, 0), unit: 'BTU/hr' },
          { label: 'ΔT', value: fmt(inputs.deltaT!, 1), unit: '°F' },
        ],
        details: [
          `GPM = ${fmt(inputs.btu!, 0)} ÷ (500 × ${fmt(inputs.deltaT!, 1)}) = ${fmt(gpm, 1)} GPM`,
          'Water-side calculation only. Adjust the heat-transfer factor for glycol or other fluids.',
        ],
      };
    }

    if (hasGpm && hasDeltaT) {
      const btu = inputs.gpm! * 500 * inputs.deltaT!;
      return {
        ok: true,
        message: `${fmt(btu, 0)} BTU/hr`,
        fields: [
          { label: 'BTU/hr', value: fmt(btu, 0), unit: 'BTU/hr', emphasis: true },
          { label: 'GPM', value: fmt(inputs.gpm!, 1), unit: 'GPM' },
          { label: 'ΔT', value: fmt(inputs.deltaT!, 1), unit: '°F' },
        ],
        details: [
          `BTU/hr = ${fmt(inputs.gpm!, 1)} × 500 × ${fmt(inputs.deltaT!, 1)} = ${fmt(btu, 0)} BTU/hr`,
          'Water-side calculation only. Adjust the heat-transfer factor for glycol or other fluids.',
        ],
      };
    }

    return { ok: false, message: 'Enter any two valid water-side values.', fields: [], details: [] };
  },

  mixedAir(inputs: { oaPercent: number; oaTemp: number; raTemp: number }): MetricResult {
    const errs = [
      validateRange(inputs.oaPercent, 0, 100, 'OA percent'),
      validateRange(inputs.oaTemp, -100, 200, 'Outdoor-air temperature'),
      validateRange(inputs.raTemp, -100, 200, 'Return-air temperature'),
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
  }): MetricResult {
    const errs = [
      validateRange(inputs.oaDb, 0, 140, 'Outdoor dry-bulb'),
      validateRange(inputs.oaWb, 0, 100, 'Outdoor wet-bulb'),
      validateRange(inputs.efficiency, 0.01, 1, 'Saturation efficiency'),
      validatePositive(inputs.cfm, 'CFM'),
      inputs.oaWb > inputs.oaDb ? 'Outdoor wet-bulb must not exceed outdoor dry-bulb' : null,
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const supplyDb = inputs.oaDb - inputs.efficiency * (inputs.oaDb - inputs.oaWb);
    const sensibleCooling = 1.08 * inputs.cfm * (inputs.oaDb - supplyDb);

    return {
      ok: true,
      message: `Supply dry-bulb ≈ ${fmt(supplyDb, 1)}°F`,
      fields: [
        { label: 'Supply DB', value: fmt(supplyDb, 1), unit: '°F', emphasis: true },
        { label: 'Sensible estimate', value: fmt(sensibleCooling, 0), unit: 'BTU/hr', emphasis: true },
        { label: 'Efficiency', value: fmt(inputs.efficiency * 100, 0), unit: '%' },
        { label: 'Wet-bulb depression', value: fmt(inputs.oaDb - inputs.oaWb, 1), unit: '°F' },
      ],
      details: [
        `Supply DB = ${fmt(inputs.oaDb, 1)} − ${fmt(inputs.efficiency * 100, 0)}% × (${fmt(inputs.oaDb, 1)} − ${fmt(inputs.oaWb, 1)})`,
        `Sensible air-side estimate = 1.08 × ${fmt(inputs.cfm, 0)} × ${fmt(inputs.oaDb - supplyDb, 1)} = ${fmt(sensibleCooling, 0)} BTU/hr`,
        'This is not equipment tonnage and excludes fan heat, water use, humidity effects, and manufacturer performance limits.',
      ],
    };
  },

  filterVelocity(inputs: {
    cfm: number;
    filterWidth: number;
    filterHeight: number;
  }): MetricResult {
    const errs = [
      validatePositive(inputs.cfm, 'CFM'),
      validatePositive(inputs.filterWidth, 'Filter width'),
      validatePositive(inputs.filterHeight, 'Filter height'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const area = (inputs.filterWidth * inputs.filterHeight) / 144;
    const velocity = inputs.cfm / area;

    return {
      ok: true,
      message: `Filter face velocity: ${fmt(velocity, 0)} FPM`,
      fields: [
        { label: 'Face velocity', value: fmt(velocity, 0), unit: 'FPM', emphasis: true },
        { label: 'Face area', value: fmt(area, 2), unit: 'ft²' },
      ],
      details: [
        `Filter area = ${fmt(inputs.filterWidth, 1)}" × ${fmt(inputs.filterHeight, 1)}" ÷ 144 = ${fmt(area, 2)} ft²`,
        `Velocity = ${fmt(inputs.cfm, 0)} ÷ ${fmt(area, 2)} = ${fmt(velocity, 0)} FPM`,
        'Use the exact filter manufacturer pressure-drop curve at the intended media type and loading. BaseCalc does not estimate pressure drop.',
      ],
    };
  },

  combustionAnalysis(inputs: { o2: number }): MetricResult {
    const errs = [validateRange(inputs.o2, 0, 20, 'O2 percent')].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const excessAir = (inputs.o2 / (20.9 - inputs.o2)) * 100;

    if (!Number.isFinite(excessAir) || excessAir < 0) {
      return { ok: false, message: 'Readings do not produce a finite non-negative excess-air estimate.', fields: [], details: [] };
    }

    return {
      ok: true,
      message: `${fmt(excessAir, 1)}% theoretical excess air from measured O₂`,
      fields: [
        { label: 'Theoretical excess air', value: fmt(excessAir, 1), unit: '%', emphasis: true },
        { label: 'Measured O₂', value: fmt(inputs.o2, 1), unit: '%' },
      ],
      details: [
        `Excess air = O₂ ÷ (20.9 − O₂) × 100 = ${fmt(excessAir, 1)}%`,
        'This dry-flue-gas dilution estimate is not a combustion-efficiency, pass/fail, or safety result.',
        'Follow the appliance procedure and use a calibrated analyzer for CO, draft, stack temperature, and combustion safety.',
      ],
    };
  },

  refrigerantWeight(inputs: {
    installedLineLength: number;
    factoryAllowance: number;
    manufacturerChargeRate?: number;
    refrigerant: RefrigerantType;
  }): MetricResult {
    const errs = [
      validateRange(inputs.installedLineLength, 0, 10000, 'Installed line length'),
      validateRange(inputs.factoryAllowance, 0, 10000, 'Factory line allowance'),
      validateOptionalRange(inputs.manufacturerChargeRate, 0.001, 100, 'Manufacturer charge rate'),
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    if (inputs.manufacturerChargeRate === undefined) {
      return {
        ok: false,
        message: 'Manufacturer additional-charge rate is required. BaseCalc does not assume a refrigerant or tubing charge rate.',
        fields: [],
        details: [],
      };
    }

    if (inputs.installedLineLength < inputs.factoryAllowance) {
      return {
        ok: false,
        message: 'Installed line length is below the factory allowance. Consult the exact equipment instructions; BaseCalc does not infer refrigerant removal for shorter line sets.',
        fields: [],
        details: [],
      };
    }

    const additionalLength = inputs.installedLineLength - inputs.factoryAllowance;
    const totalOz = additionalLength * inputs.manufacturerChargeRate;
    const totalLb = totalOz / 16;

    return {
      ok: true,
      message: `${fmt(totalOz, 1)} oz additional charge from supplied manufacturer data`,
      fields: [
        { label: 'Additional charge', value: fmt(totalOz, 1), unit: 'oz', emphasis: true },
        { label: 'Pounds', value: fmt(totalLb, 2), unit: 'lb', emphasis: true },
        { label: 'Chargeable length', value: fmt(additionalLength, 1), unit: 'ft' },
        { label: 'Refrigerant', value: inputs.refrigerant },
      ],
      details: [
        `Chargeable length = ${fmt(inputs.installedLineLength, 1)} − ${fmt(inputs.factoryAllowance, 1)} = ${fmt(additionalLength, 1)} ft`,
        `Additional charge = ${fmt(additionalLength, 1)} ft × ${fmt(inputs.manufacturerChargeRate, 3)} oz/ft = ${fmt(totalOz, 1)} oz`,
        'Use only the allowance and rate from the exact equipment installation instructions; weigh in charge as directed.',
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
      validateRange(inputs.zoneArea, 1, 10000000, 'Zone area'),
      validateRange(inputs.occupancyDensity, 1, 1000000, 'Occupancy density'),
      validateRange(inputs.cfmPerPerson, 0, 100, 'CFM per person'),
      validateRange(inputs.cfmPerArea, 0, 10, 'CFM per area'),
      inputs.cfmPerPerson === 0 && inputs.cfmPerArea === 0 ? 'At least one supplied outdoor-air rate must be greater than zero' : null,
    ].filter(Boolean) as string[];
    if (errs.length) return { ok: false, message: errs.join('; '), fields: [], details: [] };

    const people = inputs.zoneArea / inputs.occupancyDensity;
    const oaCfm = people * inputs.cfmPerPerson + inputs.zoneArea * inputs.cfmPerArea;

    return {
      ok: true,
      message: `${fmt(oaCfm, 0)} CFM breathing-zone outdoor airflow from supplied rates`,
      fields: [
        { label: 'Breathing-zone OA', value: fmt(oaCfm, 0), unit: 'CFM', emphasis: true },
        { label: 'Design people', value: fmt(people, 1) },
        { label: 'Zone area', value: fmt(inputs.zoneArea, 0), unit: 'ft²' },
      ],
      details: [
        `People = ${fmt(inputs.zoneArea, 0)} ÷ ${fmt(inputs.occupancyDensity, 1)} = ${fmt(people, 1)}`,
        `OA CFM = ${fmt(people, 1)} × ${fmt(inputs.cfmPerPerson, 0)} + ${fmt(inputs.zoneArea, 0)} × ${fmt(inputs.cfmPerArea, 2)}`,
        `OA CFM = ${fmt(oaCfm, 0)} CFM`,
        'This arithmetic does not determine economizer operation, zone air-distribution effectiveness, system ventilation efficiency, or code compliance.',
      ],
    };
  },
};

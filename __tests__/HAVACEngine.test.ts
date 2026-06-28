import { HAVACEngine } from '../src/engine/HAVACEngine';

// ─── BTU ↔ Tons Tests ────────────────────────────────────────────────

describe('BTU ↔ Tons Calculator', () => {
  test('converts BTU/hr to tons', () => {
    const result = HAVACEngine.btuTons({ btu: 24000 });
    expect(result.ok).toBe(true);
    expect(result.fields.find((f) => f.label === 'Tons')?.value).toBe('2.00');
  });

  test('converts tons to BTU/hr', () => {
    const result = HAVACEngine.btuTons({ tons: 3 });
    expect(result.ok).toBe(true);
    expect(result.fields.find((f) => f.label === 'BTU/hr')?.value).toBe('36,000');
  });

  test('requires at least one value', () => {
    const result = HAVACEngine.btuTons({});
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Enter');
  });
});

// ─── CFM from BTU Tests ──────────────────────────────────────────────

describe('CFM from BTU Calculator', () => {
  test('calculates CFM from load and delta T', () => {
    const result = HAVACEngine.cfmFromBtu({ btu: 24000, deltaT: 20 });
    expect(result.ok).toBe(true);
    expect(result.fields.find((f) => f.label === 'CFM')?.value).toBe('1,111');
  });

  test('validates positive inputs', () => {
    const result = HAVACEngine.cfmFromBtu({ btu: 0, deltaT: 20 });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('BTU/hr');
  });
});

// ─── Duct Sizing Tests ───────────────────────────────────────────────

describe('Duct Sizing Calculator', () => {
  test('calculates round duct diameter', () => {
    const result = HAVACEngine.ductSizing({ cfm: 1000, velocity: 700 });
    expect(result.passes).toBe(true);
    expect(result.value).toBeCloseTo(16.2, 0);
    expect(result.unit).toBe('in Ø');
  });

  test('fails when velocity exceeds 900 FPM', () => {
    const result = HAVACEngine.ductSizing({ cfm: 1000, velocity: 1200 });
    expect(result.passes).toBe(false);
    expect(result.message).toContain('exceeds');
  });
});

// ─── Air Velocity Tests ──────────────────────────────────────────────

describe('Air Velocity Calculator', () => {
  test('calculates velocity from CFM and area', () => {
    const result = HAVACEngine.airVelocity({ cfm: 1000, area: 1.5 });
    expect(result.ok).toBe(true);
    expect(result.fields.find((f) => f.label === 'Velocity')?.value).toBe('667');
  });
});

// ─── Psychrometrics Tests ────────────────────────────────────────────

describe('Psychrometrics Calculator', () => {
  test('calculates total, sensible, and latent BTU/hr', () => {
    const result = HAVACEngine.psychrometrics({
      cfm: 1000,
      enterDb: 75,
      enterWb: 62,
      leaveDb: 55,
      leaveWb: 52,
    });
    expect(result.ok).toBe(true);
    const total = result.fields.find((f) => f.label === 'Total');
    expect(total).toBeDefined();
    expect(Number(total?.value.replace(/,/g, ''))).toBeGreaterThan(0);
  });
});

// ─── Refrigerant Lines Tests ─────────────────────────────────────────

describe('Refrigerant Lines Calculator', () => {
  test('recommends suction and liquid line sizes', () => {
    const result = HAVACEngine.refrigerantLines({ tons: 3, refrigerant: 'R410A', lineLength: 25 });
    expect(result.ok).toBe(true);
    expect(result.fields.find((f) => f.label === 'Suction line')?.value).toBe('1-1/8');
    expect(result.fields.find((f) => f.label === 'Liquid line')?.value).toBe('1/2');
  });
});

// ─── Superheat / Subcooling Tests ────────────────────────────────────

describe('Superheat / Subcooling Calculator', () => {
  test('returns typical subcooling target', () => {
    const result = HAVACEngine.superheatSubcool({
      refrigerant: 'R410A',
      outdoorTemp: 85,
      indoorWb: 63,
      mode: 'subcool',
    });
    expect(result.ok).toBe(true);
    expect(result.fields.find((f) => f.label === 'Target subcooling')?.value).toBe('10.0');
  });

  test('calculates target superheat within clamped range', () => {
    const result = HAVACEngine.superheatSubcool({
      refrigerant: 'R410A',
      outdoorTemp: 95,
      indoorWb: 67,
      mode: 'superheat',
    });
    expect(result.ok).toBe(true);
    const sh = Number(result.fields.find((f) => f.label === 'Target superheat')?.value);
    expect(sh).toBeGreaterThanOrEqual(5);
    expect(sh).toBeLessThanOrEqual(30);
  });
});

// ─── Room Load Tests ─────────────────────────────────────────────────

describe('Room Load Calculator', () => {
  test('calculates total room load', () => {
    const result = HAVACEngine.roomLoad({
      area: 300,
      ceilingHeight: 8,
      loadFactor: 35,
      occupants: 2,
      windows: 2,
      infiltration: 1,
      climateFactor: 1,
    });
    expect(result.ok).toBe(true);
    const total = Number(result.fields.find((f) => f.label === 'Total load')?.value.replace(/,/g, ''));
    expect(total).toBeGreaterThan(0);
  });
});

// ─── Hydronics Tests ─────────────────────────────────────────────────

describe('Hydronics Calculator', () => {
  test('solves GPM from BTU and delta T', () => {
    const result = HAVACEngine.hydronics({ btu: 50000, deltaT: 20 });
    expect(result.ok).toBe(true);
    expect(result.fields.find((f) => f.label === 'GPM')?.value).toBe('5.0');
  });

  test('solves BTU from GPM and delta T', () => {
    const result = HAVACEngine.hydronics({ gpm: 5, deltaT: 20 });
    expect(result.ok).toBe(true);
    expect(result.fields.find((f) => f.label === 'BTU/hr')?.value).toBe('50,000');
  });

  test('requires at least two values', () => {
    const result = HAVACEngine.hydronics({ deltaT: 20 });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Enter');
  });
});

// ─── Mixed Air Tests ─────────────────────────────────────────────────

describe('Mixed Air Calculator', () => {
  test('calculates mixed air temperature', () => {
    const result = HAVACEngine.mixedAir({ oaPercent: 20, oaTemp: 95, raTemp: 75 });
    expect(result.ok).toBe(true);
    expect(result.fields.find((f) => f.label === 'Mixed air')?.value).toBe('79.0');
  });
});

// ─── Air Changes Tests ───────────────────────────────────────────────

describe('Air Changes Calculator', () => {
  test('calculates ACH from CFM and volume', () => {
    const result = HAVACEngine.airChanges({ cfm: 1000, volume: 8000 });
    expect(result.ok).toBe(true);
    expect(result.fields.find((f) => f.label === 'ACH')?.value).toBe('7.5');
  });
});

// ─── Filter Velocity Tests ───────────────────────────────────────────

describe('Filter Velocity Calculator', () => {
  test('calculates face velocity', () => {
    const result = HAVACEngine.filterVelocity({ cfm: 1200, filterWidth: 16, filterHeight: 25 });
    expect(result.passes).toBe(true);
    expect(result.value).toBeCloseTo(432, 0);
  });

  test('fails when velocity exceeds 500 FPM', () => {
    const result = HAVACEngine.filterVelocity({ cfm: 2000, filterWidth: 16, filterHeight: 20 });
    expect(result.passes).toBe(false);
    expect(result.message).toContain('exceeds');
  });
});

// ─── Combustion Analysis Tests ───────────────────────────────────────

describe('Combustion Analysis Calculator', () => {
  test('calculates excess air from O2 for natural gas', () => {
    const result = HAVACEngine.combustionAnalysis({ fuel: 'naturalGas', o2: 6 });
    expect(result.ok).toBe(true);
    const excess = Number(result.fields.find((f) => f.label === 'Excess air')?.value);
    expect(excess).toBeGreaterThan(0);
  });

  test('calculates excess air from CO2 when provided', () => {
    const result = HAVACEngine.combustionAnalysis({ fuel: 'propane', o2: 6, co2: 8 });
    expect(result.ok).toBe(true);
    const excess = Number(result.fields.find((f) => f.label === 'Excess air')?.value);
    expect(excess).toBeGreaterThan(0);
  });
});

// ─── Refrigerant Weight Tests ────────────────────────────────────────

describe('Refrigerant Weight Calculator', () => {
  test('calculates line-set charge in ounces and pounds', () => {
    const result = HAVACEngine.refrigerantWeight({
      liquidLineLength: 15,
      suctionLineLength: 15,
      liquidLineSize: '3/8',
      suctionLineSize: '3/4',
      refrigerant: 'R410A',
    });
    expect(result.ok).toBe(true);
    const totalOz = Number(result.fields.find((f) => f.label === 'Total charge')?.value);
    expect(totalOz).toBeGreaterThan(0);
  });
});

// ─── Economizer Tests ────────────────────────────────────────────────

describe('Economizer Calculator', () => {
  test('calculates minimum outdoor air CFM', () => {
    const result = HAVACEngine.economizer({
      zoneArea: 1000,
      occupancyDensity: 100,
      cfmPerPerson: 5,
      cfmPerArea: 0.06,
    });
    expect(result.ok).toBe(true);
    expect(result.fields.find((f) => f.label === 'OA CFM')?.value).toBe('110');
  });
});

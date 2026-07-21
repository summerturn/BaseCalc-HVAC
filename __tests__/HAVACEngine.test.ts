import { HAVACEngine, type MetricResult } from '../src/engine/HAVACEngine';

function fieldValue(result: MetricResult, label: string): string {
  const field = result.fields.find((candidate) => candidate.label === label);
  if (!field) throw new Error(`Missing result field: ${label}`);
  return field.value;
}

describe('BTU ↔ Tons Calculator', () => {
  test('converts the 12,000 BTU/hr refrigeration-ton definition', () => {
    expect(fieldValue(HAVACEngine.btuTons({ btu: 24000 }), 'Tons')).toBe('2.00');
    expect(fieldValue(HAVACEngine.btuTons({ tons: 3 }), 'BTU/hr')).toBe('36,000');
  });

  test('rejects missing and non-finite values', () => {
    expect(HAVACEngine.btuTons({}).ok).toBe(false);
    expect(HAVACEngine.btuTons({ btu: Number.NaN }).message).toContain('finite');
    expect(HAVACEngine.btuTons({ tons: Number.POSITIVE_INFINITY }).message).toContain('finite');
  });
});

describe('Sensible Airflow Calculators', () => {
  test('uses Q = 1.08 × CFM × ΔT in both directions', () => {
    const airflow = HAVACEngine.cfmFromBtu({ btu: 24000, deltaT: 20 });
    const capacity = HAVACEngine.btuFromCfm({ cfm: 1111.111111, deltaT: 20 });

    expect(fieldValue(airflow, 'CFM')).toBe('1,111');
    expect(fieldValue(capacity, 'Sensible heat')).toBe('24,000');
    expect(capacity.fields.some((field) => field.label === 'Tons')).toBe(false);
    expect(capacity.details.join(' ')).toContain('total equipment capacity are not calculated');
  });

  test('rejects zero and non-finite inputs', () => {
    expect(HAVACEngine.cfmFromBtu({ btu: 0, deltaT: 20 }).ok).toBe(false);
    expect(HAVACEngine.btuFromCfm({ cfm: Number.POSITIVE_INFINITY, deltaT: 20 }).ok).toBe(false);
  });
});

describe('Duct And Velocity Calculators', () => {
  test('calculates round duct diameter from area', () => {
    const result = HAVACEngine.ductSizing({ cfm: 1000, velocity: 700 });
    expect(result.ok).toBe(true);
    expect(fieldValue(result, 'Round diameter')).toBe('16.2');
    expect(result.details.join(' ')).toContain('not validated');
  });

  test('rejects an invalid rectangular aspect ratio', () => {
    const result = HAVACEngine.ductSizing({ cfm: 1000, velocity: 700, aspectRatio: 0.5 });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Aspect ratio');
  });

  test('calculates air velocity from CFM and area', () => {
    expect(fieldValue(HAVACEngine.airVelocity({ cfm: 1000, area: 1.5 }), 'Velocity')).toBe('667');
  });
});

describe('Psychrometrics Calculator', () => {
  test('matches a standard-atmosphere dry/wet-bulb golden vector', () => {
    const result = HAVACEngine.psychrometrics({
      cfm: 1000,
      enterDb: 75,
      enterWb: 62,
      leaveDb: 55,
      leaveWb: 52,
    });

    expect(result.ok).toBe(true);
    expect(fieldValue(result, 'Enter enthalpy')).toBe('27.71');
    expect(fieldValue(result, 'Leave enthalpy')).toBe('21.38');
    expect(fieldValue(result, 'Total')).toBe('28,457');
    expect(fieldValue(result, 'Sensible')).toBe('21,600');
    expect(fieldValue(result, 'Latent')).toBe('6,857');
  });

  test('rejects wet bulb above dry bulb and impossible cooling states', () => {
    expect(HAVACEngine.psychrometrics({
      cfm: 1000,
      enterDb: 70,
      enterWb: 71,
      leaveDb: 55,
      leaveWb: 52,
    }).message).toContain('must not exceed');

    expect(HAVACEngine.psychrometrics({
      cfm: 1000,
      enterDb: 55,
      enterWb: 52,
      leaveDb: 75,
      leaveWb: 62,
    }).message).toContain('Entering air must be warmer');
  });
});

describe('Manufacturer-data Refrigerant Contracts', () => {
  test('fails closed when line-sizing manufacturer data is absent', () => {
    const result = HAVACEngine.refrigerantLines({
      tons: 3,
      refrigerant: 'R410A',
      equivalentLineLength: 80,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Manufacturer line sizes');
  });

  test('validates supplied line sizes only within the supplied length limit', () => {
    const inputs = {
      tons: 3,
      refrigerant: 'R410A' as const,
      equivalentLineLength: 80,
      manufacturerMaxEquivalentLength: 100,
      manufacturerSuctionSize: '7/8 in',
      manufacturerLiquidSize: '3/8 in',
    };
    const result = HAVACEngine.refrigerantLines(inputs);

    expect(result.ok).toBe(true);
    expect(fieldValue(result, 'Suction line')).toBe('7/8 in');
    expect(fieldValue(result, 'Liquid line')).toBe('3/8 in');
    expect(fieldValue(result, 'Length margin')).toBe('20');
    expect(HAVACEngine.refrigerantLines({ ...inputs, equivalentLineLength: 101 }).message).toContain('exceeds');
  });

  test('records a manufacturer charging target without inventing one', () => {
    const missing = HAVACEngine.superheatSubcool({ refrigerant: 'R454B', mode: 'subcool' });
    const supplied = HAVACEngine.superheatSubcool({
      refrigerant: 'R454B',
      mode: 'subcool',
      manufacturerTarget: 12.5,
    });

    expect(missing.ok).toBe(false);
    expect(missing.message).toContain("manufacturer's subcool target");
    expect(supplied.ok).toBe(true);
    expect(fieldValue(supplied, 'Subcooling target')).toBe('12.5');
  });

  test('calculates additional charge only from supplied allowance and rate', () => {
    const result = HAVACEngine.refrigerantWeight({
      installedLineLength: 40,
      factoryAllowance: 15,
      manufacturerChargeRate: 0.6,
      refrigerant: 'R410A',
    });

    expect(result.ok).toBe(true);
    expect(fieldValue(result, 'Chargeable length')).toBe('25.0');
    expect(fieldValue(result, 'Additional charge')).toBe('15.0');
    expect(fieldValue(result, 'Pounds')).toBe('0.94');
  });

  test('rejects missing rates and shorter runs that need equipment instructions', () => {
    expect(HAVACEngine.refrigerantWeight({
      installedLineLength: 40,
      factoryAllowance: 15,
      refrigerant: 'R32',
    }).message).toContain('Manufacturer additional-charge rate is required');

    expect(HAVACEngine.refrigerantWeight({
      installedLineLength: 10,
      factoryAllowance: 15,
      manufacturerChargeRate: 0.6,
      refrigerant: 'R32',
    }).message).toContain('does not infer refrigerant removal');
  });
});

describe('Planning Load And Heat Pump Balance', () => {
  test('uses only the user-supplied area factor for the planning load', () => {
    const result = HAVACEngine.roomLoad({ area: 300, loadFactor: 25 });

    expect(result.ok).toBe(true);
    expect(fieldValue(result, 'Planning load')).toBe('7,500');
    expect(fieldValue(result, 'Nominal tons')).toBe('0.63');
    expect(result.details.join(' ')).toContain('not ACCA Manual J');
  });

  test('rejects out-of-range area factors and non-finite areas', () => {
    expect(HAVACEngine.roomLoad({ area: 300, loadFactor: 2 }).ok).toBe(false);
    expect(HAVACEngine.roomLoad({ area: Number.NaN, loadFactor: 25 }).ok).toBe(false);
  });

  test('interpolates a balance point from the two manufacturer capacity points', () => {
    const result = HAVACEngine.heatPumpBalance({
      designTemp: 20,
      capacityAt47: 36000,
      capacityAt17: 22000,
      heatLossPerDegree: 1000,
      indoorSetpoint: 70,
    });

    expect(result.ok).toBe(true);
    expect(fieldValue(result, 'Balance point')).toBe('38.1');
    expect(fieldValue(result, 'Heat loss at balance')).toBe('31,864');
    expect(fieldValue(result, 'Capacity at design')).toBe('23,400');
    expect(fieldValue(result, 'Design heat loss')).toBe('50,000');
  });

  test('does not extrapolate a balance point beyond supplied capacity data', () => {
    const result = HAVACEngine.heatPumpBalance({
      designTemp: 0,
      capacityAt47: 36000,
      capacityAt17: 34000,
      heatLossPerDegree: 200,
      indoorSetpoint: 70,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('No balance point is bracketed');
  });

  test('omits design capacity rather than extrapolating below 17°F', () => {
    const result = HAVACEngine.heatPumpBalance({
      designTemp: 0,
      capacityAt47: 36000,
      capacityAt17: 22000,
      heatLossPerDegree: 1000,
      indoorSetpoint: 70,
    });

    expect(result.ok).toBe(true);
    expect(result.fields.some((field) => field.label === 'Capacity at design')).toBe(false);
    expect(result.details.join(' ')).toContain('not shown');
  });
});

describe('Hydronics, Mixed Air, And Air Changes', () => {
  test('solves the water-side 500-factor relationship in both directions', () => {
    expect(fieldValue(HAVACEngine.hydronics({ btu: 50000, deltaT: 20 }), 'GPM')).toBe('5.0');
    expect(fieldValue(HAVACEngine.hydronics({ gpm: 5, deltaT: 20 }), 'BTU/hr')).toBe('50,000');
    expect(fieldValue(HAVACEngine.hydronics({ btu: 50000, gpm: 5 }), 'ΔT')).toBe('20.0');
  });

  test('requires a hydronic load or flow input', () => {
    expect(HAVACEngine.hydronics({ deltaT: 20 }).message).toContain('any two');
  });

  test('checks three supplied water-side values instead of ignoring one', () => {
    expect(HAVACEngine.hydronics({ btu: 50000, gpm: 5, deltaT: 20 }).ok).toBe(true);
    const mismatch = HAVACEngine.hydronics({ btu: 75000, gpm: 5, deltaT: 20 });
    expect(mismatch.ok).toBe(false);
    expect(mismatch.message).toContain('correct one input');
  });

  test('calculates a dry-bulb mixed-air weighted average', () => {
    expect(fieldValue(HAVACEngine.mixedAir({ oaPercent: 20, oaTemp: 95, raTemp: 75 }), 'Mixed air')).toBe('79.0');
  });

  test('calculates ACH from CFM and volume', () => {
    expect(fieldValue(HAVACEngine.airChanges({ cfm: 1000, volume: 8000 }), 'ACH')).toBe('7.5');
  });
});

describe('Evaporative Cooling And Filter Face Velocity', () => {
  test('matches the direct-evaporative supply-temperature golden vector', () => {
    const result = HAVACEngine.evaporativeCooling({ oaDb: 95, oaWb: 68, efficiency: 0.8, cfm: 1600 });

    expect(result.ok).toBe(true);
    expect(fieldValue(result, 'Supply DB')).toBe('73.4');
    expect(fieldValue(result, 'Sensible estimate')).toBe('37,325');
  });

  test('rejects wet bulb above dry bulb', () => {
    expect(HAVACEngine.evaporativeCooling({ oaDb: 70, oaWb: 71, efficiency: 0.8, cfm: 1600 }).ok).toBe(false);
  });

  test('reports filter face velocity without fabricated pressure drop or pass/fail', () => {
    const result = HAVACEngine.filterVelocity({ cfm: 1200, filterWidth: 16, filterHeight: 25 });

    expect(result.ok).toBe(true);
    expect(fieldValue(result, 'Face velocity')).toBe('432');
    expect(fieldValue(result, 'Face area')).toBe('2.78');
    expect(result.details.join(' ')).not.toContain('Approx. pressure drop');
    expect(result.details.join(' ')).toContain('manufacturer pressure-drop curve');
  });

  test('rejects non-finite filter dimensions', () => {
    expect(HAVACEngine.filterVelocity({
      cfm: 1200,
      filterWidth: Number.POSITIVE_INFINITY,
      filterHeight: 25,
    }).ok).toBe(false);
  });
});

describe('O₂ Excess Air Screening', () => {
  test('matches the dry-flue-gas dilution equation', () => {
    const result = HAVACEngine.combustionAnalysis({ o2: 6 });

    expect(result.ok).toBe(true);
    expect(fieldValue(result, 'Theoretical excess air')).toBe('40.3');
    expect(result.details.join(' ')).toContain('not a combustion-efficiency, pass/fail, or safety result');
  });

  test('rejects readings too close to ambient oxygen', () => {
    expect(HAVACEngine.combustionAnalysis({ o2: 20.1 }).ok).toBe(false);
  });
});

describe('Supplied-rate Outdoor Airflow', () => {
  test('matches Vbz = Rp × Pz + Ra × Az for supplied rates', () => {
    const result = HAVACEngine.economizer({
      zoneArea: 1000,
      occupancyDensity: 100,
      cfmPerPerson: 5,
      cfmPerArea: 0.06,
    });

    expect(result.ok).toBe(true);
    expect(fieldValue(result, 'Breathing-zone OA')).toBe('110');
    expect(fieldValue(result, 'Design people')).toBe('10.0');
    expect(result.details.join(' ')).toContain('does not determine economizer operation');
  });

  test('rejects zero supplied rates rather than claiming code compliance', () => {
    const result = HAVACEngine.economizer({
      zoneArea: 1000,
      occupancyDensity: 100,
      cfmPerPerson: 0,
      cfmPerArea: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain('must be greater than zero');
  });
});

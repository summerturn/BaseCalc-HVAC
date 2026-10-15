import { HAVACEngine } from '../src/engine/HAVACEngine';

describe('new field calculations', () => {
  test('airflow difference uses fan flow as denominator and rejects impossible values', () => {
    const result = HAVACEngine.ductLeakage({ fanCfm: 1000, deliveredCfm: 850 });
    expect(result.ok).toBe(true);
    expect(result.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Difference', value: '15.0', unit: '%' }),
    ]));
    expect(HAVACEngine.ductLeakage({ fanCfm: 0, deliveredCfm: 0 }).ok).toBe(false);
    expect(HAVACEngine.ductLeakage({ fanCfm: 100, deliveredCfm: 120 }).ok).toBe(false);
  });

  test('sensible heat recovery works for heating and cooling and rejects small span', () => {
    expect(HAVACEngine.heatRecovery({ outdoorTemp: 20, returnTemp: 70, supplyTemp: 55 }).fields[0].value).toBe('70.0');
    expect(HAVACEngine.heatRecovery({ outdoorTemp: 90, returnTemp: 70, supplyTemp: 76 }).fields[0].value).toBe('70.0');
    expect(HAVACEngine.heatRecovery({ outdoorTemp: 70, returnTemp: 72, supplyTemp: 71 }).ok).toBe(false);
    expect(HAVACEngine.heatRecovery({ outdoorTemp: 20, returnTemp: 70, supplyTemp: 80 }).ok).toBe(false);
  });
});

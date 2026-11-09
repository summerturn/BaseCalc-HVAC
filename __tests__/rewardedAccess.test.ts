import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  grantRewardedCalculatorAccess,
  hasRewardedCalculatorAccess,
  parseRewardedAccess,
  REWARDED_ACCESS_DURATION_MINUTES,
} from '../src/ads/rewardedAccess';

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('rewarded calculator access', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ignores malformed, invalid, and expired persisted entries', () => {
    const now = 1_000;
    expect(parseRewardedAccess('not json', now)).toEqual({});
    expect(parseRewardedAccess(JSON.stringify({
      DuctSizing: now + 500,
      Expired: now,
      'bad route': now + 500,
      WrongType: 'later',
    }), now)).toEqual({ DuctSizing: now + 500 });
  });

  it('recognizes an active route unlock', async () => {
    storage.getItem.mockResolvedValueOnce(JSON.stringify({ DuctSizing: 20_000 }));
    await expect(hasRewardedCalculatorAccess('DuctSizing', 10_000)).resolves.toBe(true);
  });

  it('persists a completed reward for the configured duration', async () => {
    const now = 10_000;
    storage.getItem.mockResolvedValueOnce(null);
    const expiresAt = await grantRewardedCalculatorAccess('DuctSizing', now);
    expect(expiresAt).toBe(now + REWARDED_ACCESS_DURATION_MINUTES * 60 * 1000);
    const persisted = storage.setItem.mock.calls[0]?.[1];
    expect(persisted ? JSON.parse(persisted) : null).toEqual({ DuctSizing: expiresAt });
  });

  it('rejects invalid calculator route names', async () => {
    await expect(grantRewardedCalculatorAccess('../Paywall', 10_000)).rejects.toThrow('invalid');
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});


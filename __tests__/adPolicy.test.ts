import { adsAllowedForPlan, rewardedTerminalOutcome } from '../src/ads/adPolicy';

describe('ad policy', () => {
  test('enables ads only for a hydrated free plan with configured inventory', () => {
    expect(adsAllowedForPlan({ configured: true, storeHydrated: true, entitlementChecked: true, isPro: false })).toBe(true);
    expect(adsAllowedForPlan({ configured: true, storeHydrated: true, entitlementChecked: true, isPro: true })).toBe(false);
    expect(adsAllowedForPlan({ configured: true, storeHydrated: false, entitlementChecked: true, isPro: false })).toBe(false);
    expect(adsAllowedForPlan({ configured: true, storeHydrated: true, entitlementChecked: false, isPro: false })).toBe(false);
    expect(adsAllowedForPlan({ configured: false, storeHydrated: true, entitlementChecked: true, isPro: false })).toBe(false);
  });

  test('grants a reward only after the SDK reward callback', () => {
    expect(rewardedTerminalOutcome(true, 'closed')).toBe('earned');
    expect(rewardedTerminalOutcome(true, 'error')).toBe('earned');
    expect(rewardedTerminalOutcome(false, 'closed')).toBe('closed');
    expect(rewardedTerminalOutcome(false, 'error')).toBe('error');
  });
});

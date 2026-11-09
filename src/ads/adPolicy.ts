export type RewardedAdOutcome = 'earned' | 'closed' | 'unavailable' | 'error';

export type RewardedAdStatus =
  | 'disabled'
  | 'initializing'
  | 'loading'
  | 'ready'
  | 'showing'
  | 'error';

export function adsAllowedForPlan({
  configured,
  storeHydrated,
  entitlementChecked,
  isPro,
}: {
  configured: boolean;
  storeHydrated: boolean;
  entitlementChecked: boolean;
  isPro: boolean;
}): boolean {
  return configured && storeHydrated && entitlementChecked && !isPro;
}

export function rewardedTerminalOutcome(
  rewardEarned: boolean,
  event: 'closed' | 'error'
): RewardedAdOutcome {
  if (rewardEarned) return 'earned';
  return event;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@basecalc/rewarded-calculator-access-v1';
export const REWARDED_ACCESS_DURATION_MINUTES = 30;
const REWARDED_ACCESS_DURATION_MS = REWARDED_ACCESS_DURATION_MINUTES * 60 * 1000;

type RewardedAccessMap = Record<string, number>;

function validRouteName(routeName: string): boolean {
  return /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(routeName);
}

export function parseRewardedAccess(value: string | null, now = Date.now()): RewardedAccessMap {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

    const active: RewardedAccessMap = {};
    for (const [routeName, expiresAt] of Object.entries(parsed)) {
      if (validRouteName(routeName) && typeof expiresAt === 'number' && Number.isFinite(expiresAt) && expiresAt > now) {
        active[routeName] = expiresAt;
      }
    }
    return active;
  } catch {
    return {};
  }
}

async function readActiveAccess(now = Date.now()): Promise<RewardedAccessMap> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return parseRewardedAccess(stored, now);
}

export async function hasRewardedCalculatorAccess(routeName: string, now = Date.now()): Promise<boolean> {
  if (!validRouteName(routeName)) return false;
  const access = await readActiveAccess(now);
  return (access[routeName] ?? 0) > now;
}

export async function grantRewardedCalculatorAccess(routeName: string, now = Date.now()): Promise<number> {
  if (!validRouteName(routeName)) {
    throw new Error('The calculator route is invalid.');
  }

  const access = await readActiveAccess(now);
  const currentExpiry = Math.max(now, access[routeName] ?? now);
  const expiresAt = currentExpiry + REWARDED_ACCESS_DURATION_MS;
  access[routeName] = expiresAt;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(access));
  return expiresAt;
}


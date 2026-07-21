import { Platform } from 'react-native';

function isRealValue(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  const placeholders = ['placeholder', 'your-', 'your_', 'example', 'dummy', 'test', 'xxx', 'changeme', 'none', 'null'];
  if (placeholders.some((p) => lower.includes(p))) return false;
  return true;
}

export const CONFIG = {
  revenueCat: {
    iosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '',
    androidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '',
  },
};

export function isRevenueCatConfigured(): boolean {
  const key = Platform.OS === 'ios' ? CONFIG.revenueCat.iosApiKey : CONFIG.revenueCat.androidApiKey;
  return isRealValue(key);
}

export const SUBSCRIPTION_TIERS = {
  monthly: 'basecalc_hvac_pro_monthly',
  yearly: 'basecalc_hvac_pro_yearly',
};

export const SUBSCRIPTION_ENTITLEMENT_ID = 'pro';

export const FREE_TIER_LIMITS = {
  maxClients: 3,
  maxActiveInvoices: 5,
};

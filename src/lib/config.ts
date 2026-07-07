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
  ads: {
    useTestIds: process.env.EXPO_PUBLIC_ADMOB_USE_TEST_IDS === 'true',
    iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || '',
    androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || '',
    iosBannerUnitId: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID || 'ca-app-pub-3940256099942544/2934735716',
    androidBannerUnitId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID || 'ca-app-pub-3940256099942544/6300978111',
  },
};

export function isRevenueCatConfigured(): boolean {
  const key = Platform.OS === 'ios' ? CONFIG.revenueCat.iosApiKey : CONFIG.revenueCat.androidApiKey;
  return isRealValue(key);
}

export function isAdsConfigured(): boolean {
  if (CONFIG.ads.useTestIds) return true;
  if (Platform.OS === 'ios') {
    return isRealValue(CONFIG.ads.iosAppId) && isRealValue(CONFIG.ads.iosBannerUnitId);
  }
  if (Platform.OS === 'android') {
    return isRealValue(CONFIG.ads.androidAppId) && isRealValue(CONFIG.ads.androidBannerUnitId);
  }
  return false;
}

export function getBannerAdUnitId(): string {
  return Platform.OS === 'ios' ? CONFIG.ads.iosBannerUnitId : CONFIG.ads.androidBannerUnitId;
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

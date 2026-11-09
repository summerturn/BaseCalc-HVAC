import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

type AdsConfig = {
  useTestIds: boolean;
  androidBannerUnitId: string;
  androidRewardedUnitId: string;
  iosBannerUnitId: string;
  iosRewardedUnitId: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readAdsConfig(): AdsConfig {
  const extra = asRecord(Constants.expoConfig?.extra);
  const ads = asRecord(extra?.ads);
  return {
    useTestIds: ads?.useTestIds !== false,
    androidBannerUnitId: asString(ads?.androidBannerUnitId),
    androidRewardedUnitId: asString(ads?.androidRewardedUnitId),
    iosBannerUnitId: asString(ads?.iosBannerUnitId),
    iosRewardedUnitId: asString(ads?.iosRewardedUnitId),
  };
}

const config = readAdsConfig();
const nativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';

function platformUnitId(androidId: string, iosId: string): string {
  if (Platform.OS === 'android') return androidId;
  if (Platform.OS === 'ios') return iosId;
  return '';
}

export const ADS_USE_TEST_IDS = config.useTestIds;
export const BANNER_AD_UNIT_ID = config.useTestIds
  ? TestIds.ADAPTIVE_BANNER
  : platformUnitId(config.androidBannerUnitId, config.iosBannerUnitId);
export const REWARDED_AD_UNIT_ID = config.useTestIds
  ? TestIds.REWARDED
  : platformUnitId(config.androidRewardedUnitId, config.iosRewardedUnitId);
export const ADS_CONFIGURED = nativePlatform && BANNER_AD_UNIT_ID.length > 0 && REWARDED_AD_UNIT_ID.length > 0;


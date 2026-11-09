const ADMOB_APP_ID_PATTERN = /^ca-app-pub-\d{16}~\d{10}$/;
const ADMOB_UNIT_ID_PATTERN = /^ca-app-pub-\d{16}\/\d{10}$/;
const GOOGLE_TEST_PUBLISHER_ID = '3940256099942544';
const productionAds = process.env.BASECALC_ADS_PRODUCTION === 'true';
const testAds = process.env.BASECALC_ADS_TEST_MODE === 'true';
const adsEnabled = productionAds || testAds;
// eas-cli resolves config in two local passes before a real build: first with only the build
// profile's own `env` block (just to discover the project id), then again with the full
// EAS-hosted environment merged in. Both passes set this flag. A variable that's entirely
// absent during that first pass is expected and must not fail the build; one that's present
// but malformed never is, in any pass.
const isEasCliConfigBootstrap = process.env.EXPO_NO_DOTENV === '1';

if (productionAds && testAds) {
  throw new Error('BASECALC_ADS_PRODUCTION and BASECALC_ADS_TEST_MODE cannot both be true.');
}

function readNativeAppId(name) {
  if (!adsEnabled) return '';
  const value = process.env[name]?.trim();
  if (!value) {
    if (isEasCliConfigBootstrap) return '';
    throw new Error(`${name} must be a valid AdMob app ID when ads are enabled.`);
  }
  if (!ADMOB_APP_ID_PATTERN.test(value)) {
    throw new Error(`${name} must be a valid AdMob app ID when ads are enabled.`);
  }
  const usesGoogleTestPublisher = value.includes(GOOGLE_TEST_PUBLISHER_ID);
  if (productionAds && usesGoogleTestPublisher) {
    throw new Error(`${name} must be a real AdMob app ID for a production build.`);
  }
  if (testAds && !usesGoogleTestPublisher) {
    throw new Error(`${name} must use Google's sample app ID in test mode.`);
  }
  return value;
}

function readProductionUnitId(name) {
  if (!productionAds) return '';
  const value = process.env[name]?.trim();
  if (!value) {
    if (isEasCliConfigBootstrap) return '';
    throw new Error(`${name} must be a real AdMob unit ID for a production build.`);
  }
  if (!ADMOB_UNIT_ID_PATTERN.test(value) || value.includes(GOOGLE_TEST_PUBLISHER_ID)) {
    throw new Error(`${name} must be a real AdMob unit ID for a production build.`);
  }
  return value;
}

const androidAdMobAppId = readNativeAppId('ADMOB_ANDROID_APP_ID');
const iosAdMobAppId = readNativeAppId('ADMOB_IOS_APP_ID');
const adMobPlugin = adsEnabled ? [[
  'react-native-google-mobile-ads',
  {
    androidAppId: androidAdMobAppId,
    iosAppId: iosAdMobAppId,
    delayAppMeasurementInit: true,
  },
]] : [];

const baseExpoConfig = {
  name: 'BaseCalc HVAC',
  slug: 'basecalc-hvac',
  newArchEnabled: true,
  version: '1.0.1',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.basemapped.basecalchvac',
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.basemapped.basecalchvac',
    allowBackup: false,
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
    adaptiveIcon: {
      backgroundColor: '#0A0C11',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-sqlite',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0A0C11',
      },
    ],
    'expo-font',
    'expo-sharing',
    ...adMobPlugin,
    './plugins/withAndroidGradleMemory',
    './plugins/withAndroidLaunchMode',
  ],
  owner: 'basemapped-llc',
  extra: {
    ads: {
      useTestIds: testAds,
      androidBannerUnitId: readProductionUnitId('EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID'),
      androidRewardedUnitId: readProductionUnitId('EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID'),
      iosBannerUnitId: readProductionUnitId('EXPO_PUBLIC_ADMOB_IOS_BANNER_ID'),
      iosRewardedUnitId: readProductionUnitId('EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID'),
    },
    eas: {
      projectId: 'b7db1e8f-a9fe-40a8-87c1-a8f930842046',
    },
  },
};

module.exports = () => baseExpoConfig;

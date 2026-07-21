const baseExpoConfig = {
  name: 'BaseCalc HVAC',
  slug: 'basecalc-hvac',
  newArchEnabled: true,
  version: '1.0.0',
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
    './plugins/withAndroidLaunchMode',
  ],
  owner: 'basemapped-llc',
  extra: {
    eas: {
      projectId: 'b7db1e8f-a9fe-40a8-87c1-a8f930842046',
    },
  },
};

module.exports = () => baseExpoConfig;

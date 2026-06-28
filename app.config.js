const baseExpoConfig = {
  name: 'BaseCalc HVAC',
  slug: 'basecalc-hvac',
  newArchEnabled: false,
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
  ],
  owner: 'basemapped-llc',
  extra: {
    eas: {
      projectId: 'b35e59dc-0958-4812-91ab-3989379dd94c',
    },
  },
};

module.exports = () => baseExpoConfig;

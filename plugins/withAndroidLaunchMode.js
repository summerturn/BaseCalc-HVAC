const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const PURCHASE_SAFE_LAUNCH_MODE = 'singleTop';

function setMainActivityLaunchMode(androidManifest) {
  const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(androidManifest);
  mainActivity.$['android:launchMode'] = PURCHASE_SAFE_LAUNCH_MODE;
  return androidManifest;
}

function withAndroidLaunchMode(config) {
  return withAndroidManifest(config, (modConfig) => {
    setMainActivityLaunchMode(modConfig.modResults);
    return modConfig;
  });
}

module.exports = withAndroidLaunchMode;
module.exports.setMainActivityLaunchMode = setMainActivityLaunchMode;

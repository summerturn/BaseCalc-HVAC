const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const path = require('path');
const config = getDefaultConfig(__dirname);

// Local iOS builds only: stub react-native-purchases (RevenueCat 5.78 fails to
// compile under Xcode 26.5). Remove this block + the package.json autolinking
// exclude to restore the real SDK for production / EAS builds.
const RNP_STUB = path.resolve(__dirname, 'scripts/stubs/react-native-purchases.js');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-purchases') return { type: 'sourceFile', filePath: RNP_STUB };
  return (defaultResolveRequest || context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './src/styles.css' });

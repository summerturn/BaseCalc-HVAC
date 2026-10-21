const appConfig = require('../app.config.js')();
const packageJson = require('../package.json');

describe('iOS Duo configuration', () => {
  it('retains phone portrait startup and all iPad orientations', () => {
    expect(appConfig.orientation).toBe('portrait');
    expect(appConfig.ios.supportsTablet).toBe(true);
    expect(appConfig.ios.requireFullScreen).not.toBe(true);
  });

  it('enables the iOS scene lifecycle for Xcode 27 builds', () => {
    const scenePlugin = appConfig.plugins.find(
      (plugin: unknown) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
    );
    expect(scenePlugin?.[1]?.ios?.enableSceneSupport).toBe(true);
  });

  it('matches the next App Store version and build', () => {
    expect(appConfig.version).toBe('1.0.2');
    expect(appConfig.ios.buildNumber).toBe('15');
    expect(packageJson.version).toBe(appConfig.version);
  });
});

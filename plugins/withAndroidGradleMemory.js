const { withGradleProperties } = require('expo/config-plugins');

const GRADLE_JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';

function setGradleProperty(properties, key, value) {
  const existing = properties.find(
    (property) => property.type === 'property' && property.key === key,
  );

  if (existing) {
    existing.value = value;
  } else {
    properties.push({ type: 'property', key, value });
  }

  return properties;
}

function withAndroidGradleMemory(config) {
  return withGradleProperties(config, (modConfig) => {
    modConfig.modResults = setGradleProperty(
      modConfig.modResults,
      'org.gradle.jvmargs',
      GRADLE_JVM_ARGS,
    );
    return modConfig;
  });
}

module.exports = withAndroidGradleMemory;
module.exports.GRADLE_JVM_ARGS = GRADLE_JVM_ARGS;
module.exports.setGradleProperty = setGradleProperty;

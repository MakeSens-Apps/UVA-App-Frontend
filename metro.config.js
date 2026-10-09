const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add svg to asset extensions for SVG transformer
const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...resolver,
  // Remove svg from assetExts so SVG transformer handles it
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  // Add svg to sourceExts so it's treated as a module
  sourceExts: [...resolver.sourceExts, 'svg'],
};

module.exports = config;

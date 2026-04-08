// metro.config.js — Required by NativeWind v4 to process Tailwind CSS
// See: https://www.nativewind.dev/getting-started/expo-router
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });

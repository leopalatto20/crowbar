// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  globalIgnores([
    '.expo/**',
    'android/**',
    'dist/**',
    'ios/**',
    'node_modules/**',
    'src/db/migrations/**',
    'web-build/**',
  ]),
  expoConfig,
  eslintPluginPrettierRecommended,
]);

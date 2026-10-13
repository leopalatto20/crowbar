// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// Drizzle's generated migrations.js imports each migration's .sql file.
config.resolver.sourceExts.push("sql");

module.exports = config;

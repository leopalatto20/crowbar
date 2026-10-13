module.exports = {
  presets: ["babel-preset-expo"],
  // Inlines the migration .sql files as strings so Drizzle's migrator can run them.
  plugins: [["inline-import", { extensions: [".sql"] }]],
};

// expo-notifications is applied automatically and always adds aps-environment, but the app only
// schedules local notifications. Personal (free) Apple teams can't sign Push or Time Sensitive
// Notifications, so APPLE_PERSONAL_TEAM=1 also drops time-sensitive to make the app installable;
// rest notifications then arrive at the default interruption level.
// Must be first in app.json plugins: mods run in reverse order, so this one runs last.
const { withEntitlementsPlist } = require("expo/config-plugins");

module.exports = (config) =>
  withEntitlementsPlist(config, (config) => {
    delete config.modResults["aps-environment"];
    if (process.env.APPLE_PERSONAL_TEAM === "1") {
      delete config.modResults["com.apple.developer.usernotifications.time-sensitive"];
    }
    return config;
  });

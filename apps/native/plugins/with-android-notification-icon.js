// Only the Android half of the expo-notifications plugin: its iOS half adds a push entitlement
// that local notifications don't need. Without an icon, Android tints the full-colour app icon
// into a white square in the status bar.
const {
  withNotificationsAndroid,
} = require("expo-notifications/plugin/build/withNotificationsAndroid");

module.exports = (config) =>
  withNotificationsAndroid(config, { icon: "./assets/images/android-icon-monochrome.png" });

// Apps built with the iOS 27 SDK crash at launch on iOS 27 unless they adopt the scene life cycle,
// and the SDK 57 prebuild template still generates the app-delegate-only setup. Expo ships
// ExpoAppSceneDelegate for this: it creates the window, starts React Native into it, and forwards
// scene events back to the AppDelegate, so the AppDelegate must only build the factory and expose it.
// Edits fail loudly so a template change can't silently ship an app that crashes at launch.
const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const WINDOW_SETUP = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

function replaceOnce(source, search, replacement) {
  if (!source.includes(search)) {
    throw new Error(`with-ios-scene-lifecycle: AppDelegate.swift no longer contains:\n${search}`);
  }
  return source.replace(search, replacement);
}

const withSceneDelegate = (config) =>
  withAppDelegate(config, (config) => {
    if (config.modResults.language !== "swift") {
      throw new Error("with-ios-scene-lifecycle: expected a Swift AppDelegate");
    }
    let contents = config.modResults.contents;
    if (!contents.includes("ExpoReactNativeFactoryProvider")) {
      contents = replaceOnce(
        contents,
        "class AppDelegate: ExpoAppDelegate {",
        "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
      );
      contents = replaceOnce(contents, WINDOW_SETUP, "");
    }
    config.modResults.contents = contents;
    return config;
  });

const withSceneManifest = (config) =>
  withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "EXExpoAppSceneDelegate",
          },
        ],
      },
    };
    return config;
  });

module.exports = (config) => withSceneManifest(withSceneDelegate(config));

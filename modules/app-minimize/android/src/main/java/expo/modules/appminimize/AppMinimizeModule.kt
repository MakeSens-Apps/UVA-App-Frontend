package expo.modules.appminimize

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * AppMinimize — Expo Module
 *
 * B18 / Wave 6: moves the current Android task to background so the back
 * button on root screens minimizes the app (like Capacitor App.minimizeApp())
 * instead of closing it.
 *
 * Accessed from JS via NativeModules.AppMinimize.minimize().
 *
 * Registered via expo-modules autolinking through AppMinimizePackage.
 */
class AppMinimizeModule : Module() {
  override fun definition() = ModuleDefinition {
    // This name is what NativeModules.AppMinimize exposes in JS
    Name("AppMinimize")

    AsyncFunction("minimize") {
      val activity = appContext.currentActivity
      activity?.moveTaskToBack(true)
    }
  }
}

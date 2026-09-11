/**
 * app-minimize — Expo local module
 *
 * B18 / Wave 6: exposes minimizeApp() via NativeModules.AppMinimize.minimize()
 * so that pressing back on root screens sends the app to background (Android only)
 * instead of closing it.
 *
 * The JavaScript side (mobile/src/native/minimize/useAppMinimize.ts) already
 * tries NativeModules.AppMinimize.minimize() and falls back to BackHandler.exitApp()
 * if the module is absent. With this module built-in to the app via expo-modules
 * autolinking, the fallback is never reached.
 */
export { minimizeApp } from './AppMinimize';

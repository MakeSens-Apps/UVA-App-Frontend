/**
 * B17 — routesToMinimize
 *
 * Ported from: AppMinimizeService.routesToMinimize (app-minimize.service.ts)
 * Classification: Rewrite (data extracted from Angular service)
 *
 * These are the screen names (React Navigation route names) where pressing
 * the Android hardware back button should MINIMIZE the app instead of
 * navigating back to a previous screen.
 *
 * Original routes were Ionic paths (e.g. '/home', '/login').
 * Mapped to React Navigation screen names used in AppStack/AuthStack/AppTabs.
 *
 * Portability matrix: app-minimize.service.ts → routesToMinimize + useBackHandler
 * Risks: R-14, R-07
 */

/**
 * Screen names (React Navigation route names) where the back button should
 * minimize the app. These correspond to "root" screens — screens the user
 * should not navigate back from (would result in a blank stack).
 *
 * Ionic path → React Navigation screen name mapping:
 *   '/pre-register'          → 'PreRegister'
 *   '/register'              → 'Register'
 *   '/home'                  → 'Home'  (inside HomeStack)
 *   '/login'                 → 'Login'
 *   '/otp'                   → 'Otp'
 *   '/app/tabs/register'     → 'Measurement'  (register tab)
 *
 * DESVIACIÓN DEL ORIGINAL A PETICIÓN DEL USUARIO (2026-09-10)
 *   'RegisterMeasurement' y 'GuideMeasurement' NO están en la lista del original
 *   (app-minimize.service.ts sólo declara /home, /login, /otp, /pre-register,
 *   /register y /app/tabs/register). El usuario pidió explícitamente que el botón
 *   atrás del sistema MINIMICE la app durante el flujo de registro de una medición,
 *   igual que en Inicio, porque en el device el atrás devolvía al formulario de un
 *   flujo YA GUARDADO (máximos) y permitía duplicar el registro.
 *   'GuideMeasurement' se incluye porque la guía se presenta ENCIMA del formulario
 *   (transparentModal): sin ella, el atrás sobre la guía seguiría cayendo en la pila.
 *   El botón de volver del header del formulario sigue funcionando igual.
 */
export const ROUTES_TO_MINIMIZE: ReadonlySet<string> = new Set([
  'PreRegister',
  'Register',
  'Home',
  'Login',
  'Otp',
  'Measurement',
  // Desviación del original a petición del usuario (2026-09-10)
  'RegisterMeasurement',
  // Desviación del original a petición del usuario (2026-09-10)
  'GuideMeasurement',
]);

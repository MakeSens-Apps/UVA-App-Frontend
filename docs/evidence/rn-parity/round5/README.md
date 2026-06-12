# Wave 6 — Verificación Final (Round 5)

**Fecha:** 2026-06-12
**Integrador:** Claude Fable 5 (agente)
**SHA base:** 0afcc11
**Branch:** feature/ionic-to-react-native
**Emulador:** UVA_API35 (API 35, arm64-v8a)

---

## Módulo nativo app-minimize

Módulo Expo local creado en `mobile/modules/app-minimize/`:

- `expo-module.config.json` — plataforma android, módulo `expo.modules.appminimize.AppMinimizeModule`
- `android/build.gradle` — usa `expo-module-gradle-plugin`, JVM 17, minSdk 24 / targetSdk 35
- `android/src/main/java/expo/modules/appminimize/AppMinimizeModule.kt` — `AsyncFunction("minimize")` que llama `appContext.currentActivity?.moveTaskToBack(true)`
- Auto-descubierto por `expo-modules-autolinking` (nativeModulesDir = `./modules` por defecto)
- Verificado con `npx expo-modules-autolinking resolve --platform android` — aparece como `app-minimize (1.0.0)`
- Incluido en el APK de debug: build Gradle imprime `[📦] app-minimize (1.0.0)` en la lista de módulos

`mobile/src/native/minimize/useAppMinimize.ts` — usa `NativeModules.AppMinimize.minimize()` (registro bridge por expo-modules) con fallback a `BackHandler.exitApp()` si el módulo está ausente.

---

## Tabla de veredictos por ítem

| Ítem | Gate | Observación |
|---|---|---|
| (a) ConfigurationScreen vs capturas de referencia | PARIDAD OK | Toggle OFF/ON, chip Permisos→Funcionando, panel expandido, 2 SyncAction cards — match visual con Ionic |
| (b) Toggle recordatorios programa y cancela (R-48) | PASS | `logcat: "Notificaciones programadas para las 6:00 AM y 6:00 PM."` tras Allow. Chip cambia a "Funcionando correctamente", Permisos:Otorgados, Programación:Activa |
| (c) Sync manual dispara y muestra estado | PASS | "Sin sincronizaciones pendientes" / "Sin actualizaciones pendientes" refleja estado real. Botones Sincronizar/Actualizar presentes |
| (d) Back en Home minimiza (proceso vivo) | PASS | `dumpsys activity processes` muestra PID 5483 vivo tras presionar back en HomeScreen. App va al launcher, no se cierra |
| (e) Reporte Mayo 2026 → PNG → share sheet con imagen | PASS | Share sheet muestra "Sharing image" con preview del reporte PNG. Mayo 2026: 68 Registros, Tem 24.3°C, Hum 69%, Acu 81mm |
| (f) Login + smoke general | PASS | Test user 3000000002 aterriza en HomeScreen directamente. Fecha, racha, calendario, luna llena, tabs correctos |

---

## Suite de tests al cierre

- **Jest:** 724/724 tests PASS en 33 suites (test suite: b17-native.test.ts 38/38, b18-configuration.test.tsx 27/27)
- **ESLint:** 0 errores en todos los archivos modificados (172 warnings preexistentes)
- **Prebuild:** `npx expo prebuild --platform android` — completado sin errores (AsyncStorage_db_size_in_MB=60 preservado)
- **Build:** `./gradlew assembleDebug` — BUILD SUCCESSFUL, app-minimize (1.0.0) incluido

---

## Capturas

| Archivo | Descripción |
|---|---|
| `01-home.png` | HomeScreen — paridad visual OK |
| `02-configuration-toggle-off.png` | ConfigurationScreen — toggle OFF, chip "Permisos requeridos" |
| `03-configuration-expanded.png` | ConfigurationScreen — panel expandido: Permisos/Programación/Batería |
| `04-configuration-toggle-on.png` | ConfigurationScreen — toggle ON, chip "Funcionando correctamente" (con LogBox warn custom sound) |
| `05-historical-mayo-68.png` | HistoricalScreen — Mayo 2026, 68 Registros, datos correctos |
| `06-share-sheet-png.png` | Share sheet nativo con preview PNG del reporte ambiental |
| `07-configuration-final-state.png` | ConfigurationScreen final — estado listo para validación del usuario |

---

## Deviaciones

- **DEV-1 (batteryOptimized):** `isBatteryOptimized()` retorna false (conservador). El chip muestra "Batería: Optimizada" correctamente (el emulador no tiene optimización real), pero en device físico mostrará el estado real cuando el native module REQUEST_IGNORE_BATTERY_OPTIMIZATIONS sea conectado (B19).
- **DEV-2 (exactAlarm):** exactAlarmAvailable=true conservador — SE_EXACT_ALARM dialog vía Settings navigation. Full check vía native module en B19.
- **DEV-3 (AppState):** React Native AppState en lugar de Capacitor App.addListener.
- **DEV-4 (header safe area):** paddingTop=44 hardcoded en ConfigurationScreen (no useSafeAreaInsets), funcional.
- **DEV-5 (AppMinimize NativeModules):** El módulo `mobile/modules/app-minimize/` registra como `AsyncFunction`, accesible via `NativeModules.AppMinimize.minimize()` (bridge). Con New Architecture / JSI también disponible via `globalThis.expo.modules.AppMinimize`. La llamada desde `useAppMinimize.ts` usa NativeModules (legacy bridge path) que funciona en ambas arquitecturas cuando expo-modules-core registra el módulo.
- **DEV-6 (expo-notifications custom sound):** Advertencia `Custom sound 'default' not found` — la notificación funciona sin sonido personalizado; se resuelve añadiendo el archivo de audio en la config plugin en B19.

---

## Estado al cierre

- Emulador: UVA_API35 corriendo, proceso com.makesens.uvaapp (PID ~5483) activo
- Metro: running en puerto 8081
- App: en pantalla de **Configuración** (ConfigurationScreen) con toggle ON lista para validación manual del usuario

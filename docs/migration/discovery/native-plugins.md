# Discovery — Plugins nativos y capacidades de Capacitor

> Fase 1 de la migración Ionic/Angular → React Native (Expo + Development Builds).
> Documento de SOLO LECTURA. Todas las afirmaciones están referenciadas con `archivo:línea`.
> Fecha de análisis: 2026-06-11. Rama: `feature/ionic-to-react-native`.

## Resumen ejecutivo

La app declara **13 plugins de Capacitor** en `package.json:30-44` y todos están registrados nativamente en `android/capacitor.settings.gradle`. Sin embargo, **solo 8 se usan realmente desde JavaScript/TypeScript**: `@capacitor/app`, `@capacitor/clipboard`, `@capacitor/core`, `@capacitor/device`, `@capacitor/filesystem`, `@capacitor/local-notifications`, `@capacitor/preferences`, `@capacitor/share`.

Los **5 plugins restantes — `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/network`, `@capacitor/splash-screen`, `@capacitor/status-bar` — NO tienen ningún call site en TypeScript**. Están instalados (probablemente arrastrados por scaffolding de Ionic y por la integración runtime de Ionic con el WebView), pero su comportamiento se obtiene de forma implícita: el splash es una página Angular custom, el estado de red se deriva del Hub de Amplify DataStore (no del plugin Network), y el manejo de teclado/status-bar lo gestiona Ionic/CSS.

El código nativo Android es el **starter por defecto de Capacitor** (`MainActivity` vacío extendiendo `BridgeActivity`), sin código nativo custom. No hay plugins de Cordova reales (la carpeta `android/capacitor-cordova-android-plugins/src/main/` está vacía). Hay **6 permisos declarados** en el `AndroidManifest.xml`, casi todos orientados a notificaciones fiables (alarmas exactas, wake lock, optimización de batería). La generación de assets usa `@capacitor/assets` (no `cordova-res`, aunque `cordova-res` figura como dependencia muerta).

---

## 1. Inventario de plugins declarados vs. usados

| Plugin | Versión (`package.json`) | Registrado nativo | ¿Usado en JS/TS? | Call sites |
|---|---|---|---|---|
| `@capacitor/app` | `6.0.1` | sí | **Sí** | 2 |
| `@capacitor/clipboard` | `^6.0.1` | sí | **Sí** | 1 |
| `@capacitor/core` | `^6.1.2` | sí | **Sí** | `Capacitor.getPlatform`, `convertFileSrc`, `(window as any).Capacitor` |
| `@capacitor/device` | `^6.0.2` | sí | **Sí** | 2 |
| `@capacitor/filesystem` | `^6.0.1` | sí | **Sí** | ~15 |
| `@capacitor/haptics` | `6.0.1` | sí | **NO** | 0 |
| `@capacitor/keyboard` | `6.0.2` | sí | **NO** | 0 (hay `hideKeyboard` pero usa DOM `blur()`) |
| `@capacitor/local-notifications` | `^6.1.1` | sí | **Sí** | ~6 |
| `@capacitor/network` | `^6.0.3` | sí | **NO** | 0 (red derivada del Hub de DataStore) |
| `@capacitor/preferences` | `^6.0.2` | sí | **Sí** | ~12 |
| `@capacitor/share` | `^6.0.2` | sí | **Sí** | ~5 |
| `@capacitor/splash-screen` | `^6.0.2` | sí | **NO** | 0 (splash es página Angular custom) |
| `@capacitor/status-bar` | `6.0.1` | sí | **NO** | 0 |
| `@capacitor/android` | `6.1.2` | sí (runtime) | N/A | plataforma |

Registro nativo verificado en `android/capacitor.settings.gradle` (los 13 plugins listados como `include`). `MainActivity` es el starter por defecto: `android/app/src/main/java/io/ionic/starter/MainActivity.java:1-5` (`public class MainActivity extends BridgeActivity {}`).

`capacitor.config.ts:3-8`: `appId: 'com.makesens.uvaapp'`, `appName: 'UVA'`, `webDir: 'www'`. No hay bloque `plugins` de configuración (ni overrides de SplashScreen, Keyboard, etc.).

---

## 2. Plugins USADOS — call sites detallados y equivalente en Expo/RN

### 2.1 `@capacitor/app` — minimizar app y estado de ciclo de vida

**Feature de la app:** botón atrás de Android (minimizar en rutas raíz) y refresco de estado al volver de Ajustes del sistema.

| Call site | API | Opciones / parámetros |
|---|---|---|
| `src/app/core/services/minimize/app-minimize.service.ts:39` | `App.minimizeApp()` | sin parámetros. Se invoca desde `initializeBackButtonHandler()` (`:62-71`) que usa `platform.backButton.subscribeWithPriority(10, ...)` de Ionic. Solo minimiza si la ruta actual está en `routesToMinimize` (`:14-21`: `/pre-register`, `/register`, `/home`, `/login`, `/otp`, `/app/tabs/register`); en otro caso `window.history.back()` (`:68`). |
| `src/app/pages/profile/configuration/configuration.page.ts:152` | `App.addListener('appStateChange', cb)` | callback recibe `{ isActive }`; al volver a activo refresca estado de notificaciones tras `setTimeout(..., 500)` (`:153-158`). El listener se libera con `.remove()` en `ionViewWillLeave` (`:165-169`) y antes de re-suscribir (`:147-150`). Import en `:5`. |

`initializeBackButtonHandler()` se invoca una vez al arrancar en `src/app/app.component.ts` (dentro de `platform.ready()`).

**Equivalente RN/Expo:**
- `App.minimizeApp()` → no hay API directa en Expo. Opciones: `react-native` `BackHandler.exitApp()` (sale, NO minimiza) o un módulo nativo custom que invoque `moveTaskToBack(true)`. Para replicar el comportamiento exacto de "minimizar" (no cerrar) se requiere un módulo nativo Android (`Activity.moveTaskToBack`).
- `platform.backButton` (Ionic) → `BackHandler.addEventListener('hardwareBackPress', ...)` de React Native.
- `App.addListener('appStateChange')` → `AppState.addEventListener('change', state => ...)` de React Native (`state` es `'active' | 'background' | 'inactive'`).

### 2.2 `@capacitor/preferences` — almacenamiento clave-valor

**Feature de la app:** sesión del usuario, último valor de medición, flags de notificaciones programadas/habilitadas.

| Call site | API | Clave / valor |
|---|---|---|
| `src/app/core/services/session/session.service.ts:20` | `Preferences.set({ key, value })` | claves dinámicas de `Session` (`setInfo`) |
| `…/session.service.ts:35` | `Preferences.get({ key })` | iterando `sessionKeys` (`getInfo`) |
| `…/session.service.ts:59` | `Preferences.set({ key, value })` | `setInfoField` |
| `…/session.service.ts:65` | `Preferences.remove({ key })` | `setInfoField` con `undefined` |
| `…/session.service.ts:75` | `Preferences.clear()` | `clearSession` (logout) |
| `src/app/pages/measurement/register-measurement/register-measurement.page.ts:384` | `Preferences.get({ key: 'lastMeasurementValues' })` | restricciones de flujo |
| `…/register-measurement.page.ts:484` | `Preferences.remove({ key: 'lastMeasurementValues' })` | fin de flujo |
| `…/register-measurement.page.ts:522` | `Preferences.set({ key: 'lastMeasurementValues', value: JSON.stringify(...) })` | siguiente flujo |
| `src/app/services/notification/notification.service.ts:106,181,197,206,222,392` | `Preferences.get/set/remove` | claves `notificationPermissionGrantedUser` y `notificationPermissionProgrammed` (`:7-8`); valores JSON serializados |

**Equivalente RN/Expo:**
- Para datos no sensibles → `@react-native-async-storage/async-storage` (`AsyncStorage.setItem/getItem/removeItem/clear`).
- Para datos de sesión sensibles (tokens, teléfono) → `expo-secure-store` (`SecureStore`).
- Capa de mapeo necesaria: la API de Preferences es `{ key }` / `{ key, value }` y devuelve `{ value }`; AsyncStorage usa firmas posicionales (`setItem(key, value)`, `getItem(key) => value`). **`SecureStore` no tiene equivalente a `clear()`** (hay que borrar clave por clave manteniendo una lista de claves), a diferencia de `Preferences.clear()` usado en logout (`session.service.ts:75`).

### 2.3 `@capacitor/filesystem` — ficheros locales

**Feature de la app:** branding/colores descargados de S3, datos de fases lunares (24 meses cacheados), imágenes de reporte ambiental para compartir.

Wrapper central: `src/app/core/services/storage/file-system/file-system.service.ts` (import en `:2-12`). APIs envueltas:
- `Filesystem.writeFile` — `:79` (base64, `recursive:true`) y `:86` (UTF-8, `recursive:true`).
- `Filesystem.readFile` — `:116` (base64) y `:121` (UTF-8, `Encoding.UTF8`).
- `Filesystem.deleteFile` — `:145`.
- `Filesystem.copy` — `:168`.
- `Filesystem.rename` — `:192`.
- `Filesystem.mkdir` — `:216` (`recursive` parametrizado).
- `Filesystem.readdir` — `:238`.
- `Filesystem.getUri` — `:259`.
- `Filesystem.requestPermissions` — `:275`.

Usos fuera del wrapper (acceso directo al plugin):
- `src/app/core/services/view/share.service.ts:63` — `Filesystem.writeFile({ path, data: base64, directory: Directory.Cache, recursive:true })` con reintentos y backoff exponencial (`:61-88`).
- `…/share.service.ts:99` — `Filesystem.stat({ path, directory: Directory.Cache })` (verificación de existencia).
- `…/share.service.ts:154` — `Filesystem.deleteFile({ path, directory: Directory.Cache })` (limpieza diferida con `setTimeout`, 60s Android / 30s otros, `:150`).

**Scopes (`Directory`) usados** (verificado por grep):
- `Directory.Data` — almacenamiento persistente. En: `configuration-app.service.ts:61,74,102,113,137,159,221,240`; `moon/moon-phase.service.ts:104,160`.
- `Directory.Cache` — temporal para compartir. En: `share.service.ts:66,101,156`.
- (No se usan `Documents`, `External`, `ExternalStorage`, `Library`.)

`Capacitor.convertFileSrc(uri)` se usa en `configuration-app.service.ts:223` para convertir URIs de filesystem en URLs cargables por el WebView (Android/iOS). En web, en su lugar lee como base64 y crea `URL.createObjectURL(blob)` (`:235-266`).

**Equivalente RN/Expo:**
- `expo-file-system` (`FileSystem.writeAsStringAsync`, `readAsStringAsync`, `deleteAsync`, `copyAsync`, `moveAsync`, `makeDirectoryAsync`, `readDirectoryAsync`, `getInfoAsync`).
- Mapeo de scopes: `Directory.Data` → `FileSystem.documentDirectory`; `Directory.Cache` → `FileSystem.cacheDirectory`. **No existe el concepto de `directory` + `path` relativo**: en expo-file-system las rutas son URIs absolutas `file://`, hay que concatenar `documentDirectory/cacheDirectory + path`.
- `Filesystem.getUri` → en expo no hace falta; la URI ya es la ruta absoluta.
- `Capacitor.convertFileSrc` → en RN un `<Image source={{ uri: 'file://...' }} />` carga directamente la URI; no se necesita conversión. Para HTML en WebView sí habría que adaptar.
- `Filesystem.requestPermissions` → en Android moderno expo-file-system no requiere permisos para el sandbox de la app; para almacenamiento externo (MediaLibrary) usar `expo-media-library`.
- `recursive:true` → `FileSystem.makeDirectoryAsync(uri, { intermediates: true })`. **`writeAsStringAsync` NO crea directorios intermedios automáticamente**, a diferencia de `Filesystem.writeFile({recursive:true})` — hay que crear el directorio antes.

### 2.4 `@capacitor/local-notifications` — recordatorios diarios

**Feature de la app:** recordatorios diarios de medición a las 6:00 AM y 6:00 PM.

Servicio: `src/app/services/notification/notification.service.ts`.

| Call site | API | Opciones |
|---|---|---|
| `:62` | `LocalNotifications.checkPermissions()` | lee `display` |
| `:69` | `LocalNotifications.requestPermissions()` | lee `display === 'granted'` |
| `:145-180` | `LocalNotifications.schedule({ notifications: [...] })` | 2 notificaciones (id `1` y `2`), `title`, `body`, `schedule:{ at, repeats:true, allowWhileIdle:true, every:'day' }`, `sound:'default'`, `smallIcon:'ic_launcher'`, `channelId:'measurement-reminders'`, `ongoing:false`, `autoCancel:true` |
| `:196` | `LocalNotifications.removeAllListeners()` | usado en `cancelAllNotifications` |
| `:245-254` | `LocalNotifications.createChannel({...})` | `id:'measurement-reminders'`, `name:'Recordatorios de Medición'`, `description`, `importance:4`, `sound:'default'`, `vibration:true`, `lights:true`, `lightColor:'#488AFF'` |
| `:305` | `LocalNotifications.checkPermissions()` | en `getSystemStatus` |

Canal: constante `notificationChannelId = 'measurement-reminders'` (`:9`). Solo se crea en Android (`Capacitor.getPlatform() === 'android'`, `:46-47,240-243`).

**Equivalente RN/Expo:**
- `expo-notifications`: `Notifications.getPermissionsAsync()` / `requestPermissionsAsync()`, `scheduleNotificationAsync({ content, trigger })`, `setNotificationChannelAsync('measurement-reminders', { importance, sound, vibrationPattern, lightColor })`, `cancelAllScheduledNotificationsAsync()`.
- Trigger diario: `trigger: { hour: 6, minute: 0, repeats: true }` (`DailyTriggerInput`).
- **Diferencias de comportamiento conocidas (riesgo alto):**
  - El `id:1/id:2` numérico de Capacitor → expo devuelve un id string generado; hay que persistir el mapeo si se necesita cancelar específicamente.
  - **`allowWhileIdle` / alarmas exactas en Doze:** expo-notifications usa `AlarmManager` pero su entrega exacta bajo Doze es menos configurable. La app declara `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM`/`WAKE_LOCK` (ver §4) específicamente para esto; con expo hay que validar la entrega puntual.
  - **Canal de notificación:** el canal debe crearse ANTES de programar; mapear `importance:4` (Capacitor HIGH) a `Notifications.AndroidImportance.HIGH`.
  - **Bug del código actual:** `cancelAllNotifications` (`:195-199`) llama a `removeAllListeners()` (quita listeners de eventos) y `Preferences.remove`, pero **NO cancela las notificaciones programadas** (faltaría `LocalNotifications.cancel(...)`). En la migración debe usarse `cancelAllScheduledNotificationsAsync()`.

### 2.5 `@capacitor/device` — info del dispositivo

**Feature de la app:** detectar versión de Android para flujos de permisos (alarmas exactas en Android 12+, Private Space en Android 15+).

| Call site | API | Uso |
|---|---|---|
| `src/app/services/notification/notification.service.ts:268` | `Device.getInfo()` | `parseInt(osVersion)` y `platform === 'android'` → necesidad de exact-alarm (`:266-275`) |
| `…/notification.service.ts:372` | `Device.getInfo()` | guía para Private Space en Android 15+ (`:370-382`) |

**Equivalente RN/Expo:** `expo-device` (`Device.osVersion`, `Device.platformApiLevel`, `Device.osName`) o `Platform.Version` de React Native (devuelve el API level entero en Android, p.ej. `34`). **Cuidado:** Capacitor `osVersion` devuelve la versión de marketing (p.ej. `"14"`), mientras `Platform.Version` devuelve el API level (`34`); el `parseInt(osVersion) >= 12` actual debe re-mapearse a API levels (Android 12 = API 31, Android 15 = API 35).

### 2.6 `@capacitor/share` — compartir contenido

**Feature de la app:** compartir reporte ambiental (imagen y texto) e invitar a la app.

| Call site | API | Opciones |
|---|---|---|
| `src/app/core/services/view/share.service.ts:126` | `Share.share(shareOptions)` | `{ title, text, url: fileUri, dialogTitle }` + `files:[fileUri]` solo Android (`:119-123`) — compartir imagen PNG |
| `…/share.service.ts:133` | `Share.share({ url: fileUri, dialogTitle })` | fallback Android si falla el share completo |
| `src/app/pages/profile/profile.page.ts:219` | `Share.share({ title, text, url: this.appLink, dialogTitle })` | invitación a la app (`shareApp`) |
| `src/app/pages/historical/historical.page.ts:1167` | `Share.share({ title, text })` | reporte de texto; import dinámico `await import('@capacitor/share')` (`:1165`), guardado tras `if ((window as any).Capacitor)` (`:1163`) |

`canShare()` (`share.service.ts:204-221`) verifica disponibilidad: en Capacitor comprueba `typeof Share !== 'undefined'`; en web usa `'share' in navigator`.

**Equivalente RN/Expo:**
- Texto/URL → `Share.share({ title, message, url })` de React Native, o `expo-sharing` (`Sharing.shareAsync(url)` — **solo ficheros locales, no texto plano**).
- Compartir **fichero/imagen** → `expo-sharing` (`Sharing.shareAsync(fileUri, { dialogTitle, mimeType })`) o `react-native-share` (más completo, soporta `urls`, `message`, `title` simultáneos). **`react-native-share` es el equivalente más fiel** al patrón actual de compartir imagen + texto + título.
- `dialogTitle` → soportado por expo-sharing/react-native-share.
- **Diferencia:** el patrón actual de pasar `url: fileUri` Y `files: [fileUri]` simultáneamente es específico de Capacitor Android; en RN se separa: texto va en `message`, ficheros en `urls`/`url`.

### 2.7 `@capacitor/clipboard` — portapapeles

**Feature de la app:** copiar el enlace de la app al portapapeles.

| Call site | API | Opciones |
|---|---|---|
| `src/app/pages/profile/profile.page.ts:208` | `Clipboard.write({ string: this.appLink })` | import en `:11` |

(Nota: en `share.service.ts:250` hay un fallback web que usa `navigator.clipboard.writeText`, NO el plugin Capacitor.)

**Equivalente RN/Expo:** `expo-clipboard` (`Clipboard.setStringAsync(text)`) o `@react-native-clipboard/clipboard` (`Clipboard.setString(text)`).

### 2.8 `@capacitor/core` — utilidades de plataforma

| Call site | API | Uso |
|---|---|---|
| `src/app/core/services/storage/configuration-app.service.ts:191` | `Capacitor.getPlatform()` | switch android/ios/web para cargar imagen |
| `…/configuration-app.service.ts:223` | `Capacitor.convertFileSrc(uri)` | URI de filesystem → URL WebView |
| `src/app/services/notification/notification.service.ts:46,240` | `Capacitor.getPlatform()` | gating Android para canales |
| `src/app/core/services/view/environmental-report.service.ts:557-558` | `(window as any).Capacitor` | detección web vs móvil para calidad de render de imagen |
| `src/app/pages/historical/historical.page.ts:1163` | `(window as any).Capacitor` | gating móvil para `Share` |

**Equivalente RN/Expo:**
- `Capacitor.getPlatform()` → `Platform.OS` (`'android' | 'ios' | 'web'`).
- `(window as any).Capacitor` truthy (¿estamos en móvil?) → `Platform.OS !== 'web'`.
- `Capacitor.convertFileSrc` → no necesario en RN (las URIs `file://` se consumen directamente).

---

## 3. Plugins DECLARADOS pero NO usados en JS/TS

Los siguientes están en `package.json` y registrados en `android/capacitor.settings.gradle`, pero **no tienen ningún `import` ni call site en TypeScript** (verificado por grep exhaustivo en `src/`):

### 3.1 `@capacitor/splash-screen` — NO usado
- La pantalla de arranque es una **página Angular custom con animaciones**: `src/app/pages/splash-animation/splash-animation.page.ts` (animaciones en `:238,277`) + `splash-animation.page.html`/`.scss` (clase `.splash-screen`). NO se llama a `SplashScreen.show()/hide()`.
- Nativamente, el splash de Android se sirve vía `androidx.core:core-splashscreen` (`android/app/build.gradle:63`, versión `1.0.1` en `android/variables.gradle`) y `resources/splash.png`.
- **Equivalente RN/Expo:** `expo-splash-screen` (`SplashScreen.preventAutoHideAsync()` / `hideAsync()`) para el splash nativo; la pantalla animada custom se reimplementa como componente RN con `react-native-reanimated`.

### 3.2 `@capacitor/status-bar` — NO usado
- Sin call sites. La única referencia es `<meta name="apple-mobile-web-app-status-bar-style" content="black">` en `src/index.html:23` (iOS PWA, irrelevante en Android). No hay `StatusBar.setStyle/setBackgroundColor`. No hay variables de safe-area en `src/theme/variables.scss` (grep sin resultados).
- **Equivalente RN/Expo:** `expo-status-bar` (`<StatusBar style="..." />`) o `StatusBar` de React Native. Habrá que definir explícitamente estilo/color que hoy gestiona Ionic por defecto.

### 3.3 `@capacitor/keyboard` — NO usado
- Sin call sites del plugin. Existe `hideKeyboard(event)` en `src/app/pages/auth/register/register-project-form/register-project-form.page.ts:139-143`, pero usa **DOM `event.target.blur()`**, no `Keyboard.hide()`. Invocado desde el template con `(keydown.enter)` (`register-project-form.page.html:21`).
- El manejo de redimensionado/scroll del teclado lo hace Ionic + `AndroidManifest` (`android:configChanges="...keyboardHidden|keyboard..."`).
- **Equivalente RN/Expo:** `Keyboard.dismiss()` de React Native para el blur; comportamiento de resize con `KeyboardAvoidingView` o `react-native-keyboard-controller`.

### 3.4 `@capacitor/network` — NO usado
- Sin call sites del plugin (`Network.getStatus`/`addListener` no aparecen). **El estado de red se deriva del Hub de Amplify DataStore**, no del plugin: `src/app/core/services/storage/datastore/sync-monitor-ds.service.ts:44-47` escucha el evento `networkStatus` del Hub `'datastore'` y guarda `SyncMonitorDSService.networkStatus`. Consumido en `configuration.page.ts:133,252` y `splash-animation.page.ts:86`.
- **Equivalente RN/Expo:** `@react-native-community/netinfo` (`NetInfo.fetch()`, `NetInfo.addEventListener`) **si** se decide independizar la detección de red. Importante: con la migración del backend, el `networkStatus` del Hub de DataStore se conserva si se mantiene Amplify DataStore; el plugin Network nunca fue dependencia funcional aquí.

### 3.5 `@capacitor/haptics` — NO usado
- Sin call sites (`Haptics.impact/notification/vibrate`, `ImpactStyle`, `NotificationType` no aparecen). La app **no usa retroalimentación háptica**.
- **Equivalente RN/Expo (si se quisiera añadir):** `expo-haptics` (`Haptics.impactAsync`, `notificationAsync`). En la migración, **no es necesario portar nada** salvo que se decida añadir hápticos nuevos.

---

## 4. Capa nativa Android

### 4.1 `AndroidManifest.xml` — permisos declarados
Archivo: `android/app/src/main/AndroidManifest.xml`.

| Permiso | Línea | Motivo en la app |
|---|---|---|
| `android.permission.SYSTEM_ALERT_WINDOW` | `:34` | overlay (no se ve uso JS explícito; posible residual) |
| `android.permission.INTERNET` | `:35` | red/API/Amplify |
| `android.permission.POST_NOTIFICATIONS` | `:38` | notificaciones Android 13+ (usado por local-notifications) |
| `android.permission.SCHEDULE_EXACT_ALARM` | `:41` | alarmas exactas Android 12+ (recordatorios diarios) |
| `android.permission.USE_EXACT_ALARM` | `:42` | alarmas exactas Android 13+ |
| `android.permission.WAKE_LOCK` | `:43` | entrega fiable de notificaciones en Doze |
| `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | `:46` | detección/guía de optimización de batería |

Otros elementos del Manifest:
- `<provider android:name="androidx.core.content.FileProvider"` con authority `${applicationId}.fileprovider` (`:23-29`) — necesario para compartir ficheros (`Share` + `Filesystem`). Rutas en `android/app/src/main/res/xml/file_paths.xml`: `<external-path name="my_images" path="."/>` y `<cache-path name="my_cache_images" path="."/>`.
- `<activity android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"` (`:11`) + `launchMode="singleTask"` (`:14`).

**Equivalente RN/Expo:** los permisos se declaran en `app.json`/`app.config.js` bajo `android.permissions` y/o vía config plugins de cada librería. `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `WAKE_LOCK` los aporta el config plugin de `expo-notifications` (parcialmente; `SCHEDULE_EXACT_ALARM` puede requerir declaración manual). El `FileProvider` lo gestiona automáticamente `expo-sharing`/`expo-file-system` (cada librería aporta su provider). `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` y `SYSTEM_ALERT_WINDOW` requieren declaración manual en `android.permissions`.

### 4.2 Código nativo
- `MainActivity` por defecto, sin custom: `android/app/src/main/java/io/ionic/starter/MainActivity.java`.
- **No hay plugins Cordova reales:** `android/capacitor-cordova-android-plugins/src/main/` está vacío (sin `.java`/`.kt`). El `build.gradle:68` incluye el proyecto placeholder `:capacitor-cordova-android-plugins` pero no aporta plugins.
- SDK: `minSdkVersion = 22`, `compileSdkVersion = 35`, `targetSdkVersion = 35` (`android/variables.gradle`).

**Equivalente RN/Expo:** con Expo Development Builds el `MainActivity`/`MainApplication` se generan vía prebuild. No hay código nativo custom que portar.

### 4.3 Generación de assets / `cordova-res`
- `cordova-res ^0.15.4` figura en `package.json:59` pero **NO se usa**: el script `scripts/setup-android.sh:39` usa `npx @capacitor/assets generate` (no `cordova-res`). `cordova-res` es una **dependencia muerta**.
- Source de assets: `resources/splash.png` (único fichero en `resources/`).
- **Equivalente RN/Expo:** generación de íconos/splash vía `app.json` (`expo.icon`, `expo.splash`, `expo.android.adaptiveIcon`) + `expo-splash-screen`. No se necesita `cordova-res` ni `@capacitor/assets`.

---

## 5. Diferencias de comportamiento clave a vigilar (resumen)

1. **`App.minimizeApp()` no tiene equivalente Expo directo** → minimizar (no cerrar) requiere módulo nativo Android (`moveTaskToBack`). El botón atrás se reimplementa con `BackHandler`.
2. **Filesystem: scopes + rutas relativas.** Capacitor usa `{ directory, path }` relativo; expo-file-system usa URIs absolutas y NO crea directorios intermedios en `writeAsStringAsync` (Capacitor sí con `recursive:true`).
3. **Notificaciones: alarmas exactas y Doze.** El stack actual está afinado con permisos `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM`/`WAKE_LOCK` + `allowWhileIdle` + canal `importance:4`. expo-notifications no expone toda esa granularidad; validar entrega puntual a las 6:00/18:00.
4. **`Preferences.clear()` (logout) no tiene equivalente en `SecureStore`** → si los datos de sesión van a SecureStore, hay que borrar clave por clave.
5. **Device.osVersion (marketing) vs Platform.Version (API level)** → re-mapear los checks `>= 12` / `>= 15` a API levels (31 / 35).
6. **Share imagen+texto:** el patrón Capacitor `url`+`files` no traduce 1:1; usar `react-native-share` para fidelidad.
7. **5 plugins instalados pero sin uso JS** (haptics, keyboard, network, splash-screen, status-bar): NO hay lógica que portar, pero el comportamiento implícito que hoy da Ionic (status bar, resize de teclado, splash nativo) **debe declararse explícitamente** en RN.

---

## 6. Alcance / qué quedó fuera

- Se cubrieron **TODOS** los call sites de los 8 plugins efectivamente usados (no una muestra). Para Preferences/Filesystem, que tienen muchos call sites, se enumeraron todos los puntos de invocación directa del plugin; los usos a través del wrapper `FileSystemService` se documentaron a nivel del wrapper (que es la única superficie que toca el plugin).
- No se inspeccionaron ficheros `.spec.ts` (grep confirmó que ninguno referencia `@capacitor`).
- No se analizó `node_modules/` ni el código interno de los plugins.
- La detección de red vía Hub de DataStore se documentó como nota porque sustituye funcionalmente al plugin Network, aunque pertenece al dominio de sincronización/Amplify (cubierto en otro discovery).

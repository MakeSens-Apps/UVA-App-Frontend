# Matriz de Portabilidad — Migración Ionic/Angular → React Native (Expo)

**App:** UVA (recolección y monitoreo de datos ambientales comunitarios)
**Fase:** 3 — Matriz de Portabilidad (consolidación)
**Origen:** clasificaciones de los tres clasificadores de dominio (UI, Lógica/datos, Dependencias/build), saneadas y deduplicadas.
**Referencias de riesgo:** `docs/migration/discovery/risk-register.md` (IDs R-01…R-51, las 51 verificadas).

> **Convención de clasificación**
> - **Reusable as-is** — se copia con cambio de import path, sin tocar la lógica.
> - **Minor adaptation** — swap mecánico de API o quitar decorador/`@Injectable`; lógica intacta.
> - **Major adaptation** — se conserva el núcleo de lógica pero hay que reescribir la integración (plataforma, estado reactivo, herencia, I/O).
> - **Rewrite required** — la pieza no porta; se reescribe contra el equivalente RN (sólo se rescata lógica/spec).
>
> **Esfuerzo:** **S** trivial · **M** pieza media con lógica acotada · **L** varias piezas o agregación · **XL** dependencia web crítica (Chart.js, html-to-image, exact-alarms, inputs+restricciones, framework completo).

---

## 1. Resumen ejecutivo

### 1.1 Conteos por clasificación (totales maestros, deduplicados)

| Clasificación | Ítems | % |
|---|---:|---:|
| Reusable as-is | 16 | 10.3% |
| Minor adaptation | 21 | 13.5% |
| Major adaptation | 27 | 17.3% |
| Rewrite required | 92 | 59.0% |
| **TOTAL** | **156** | **100%** |

> **Dedup aplicado (1 ítem):** *Ionicons* aparecía en dos dominios —UI como render `ion-icon name=` (Minor) y Deps como paquete npm + `addIcons` huérfano (Rewrite)—. Se cuenta **una sola vez** como **Rewrite** (se elimina el paquete y la carga por CDN; el re-mapeo de iconos a `@expo/vector-icons` es la parte mecánica). Raw 157 − 1 = **156**. Ver §5.

### 1.2 Conteos por dominio (raw, antes de dedup)

| Dominio | Reusable | Minor | Major | Rewrite | Total |
|---|---:|---:|---:|---:|---:|
| **UI** (pantallas, componentes, pipe, navegación, theme, tipografía, assets) | 0 | 2 | 5 | 41 | 48 |
| **Lógica y datos** (core/services, models, Interfaces, schema, Amplify/DataStore) | 12 | 15 | 11 | 4 | 42 |
| **Dependencias y build** (libs, plugins, tooling, scripts, CI, config) | 4 | 5 | 11 | 47 | 67 |
| **Subtotal (raw)** | 16 | 22 | 27 | 92 | **157** |
| **Dedup (Ionicons UI→Deps)** | 0 | −1 | 0 | 0 | **−1** |
| **TOTAL maestro** | **16** | **21** | **27** | **92** | **156** |

### 1.3 % de lógica preservable

La cifra global "Rewrite 59%" está dominada por la **superficie de UI y de build** (template Ionic + SCSS shadow DOM + toolchain Angular/Capacitor), que por definición no portan. Si se aísla la **lógica de negocio/datos** (dominio Lógica, 42 ítems):

| Capa de lógica/datos | Ítems | % del dominio Lógica |
|---|---:|---:|
| Preservable casi sin tocar (Reusable + Minor) | 27 | 64% |
| Núcleo conservable con reescritura de integración (Major) | 11 | 26% |
| Reescritura total (lógica enredada con DOM/UI) | 4 | 10% |
| **Con algo de lógica TS rescatable (Reusable+Minor+Major)** | **38** | **90%** |

> **Estimación honesta:** ~**64%** de la lógica de negocio/datos se porta casi sin tocar (capa Amplify, Auth Cognito passwordless, 6 DS services static, schema/models generados, gamificación algorítmica, modelos/interfaces). Otro ~26% conserva su núcleo pero exige reescribir la integración (Session/FileSystem/S3-binario/Config/MoonPhase: swap Capacitor→Expo manteniendo contratos). Sólo ~10% (EnvironmentalReport render, Share, AppMinimize, NotificationService push) se reescribe por estar fundido con el DOM/plataforma. **En suma, ~90% de los ítems de lógica conservan al menos su algoritmo/spec TS.**

### 1.4 Las 5 conclusiones más importantes para el plan

1. **La migración es de paradigma, no de librería.** Angular 18 + `@ionic/angular` + `zone.js` desaparecen como bloque (R-03): toda la presentación (35 componentes `ion-*`, 4 controladores imperativos Modal/Alert/Toast/Loading, `ionViewWillEnter`) y la reactividad por change-detection se reescriben contra React + React Navigation + hooks. **El 100% de las pantallas es "Rewrite required" por definición**; el valor de cada fila está en *qué lógica se rescata* (handlers, validaciones exactas de formulario, llamadas a servicios, reglas de navegación y textos de modal como spec funcional).

2. **La lógica de negocio/datos es el activo migrable.** ~64% reusable casi 1:1: la capa Amplify (Auth passwordless+MFA SMS, `generateClient` GraphQL, S3, Hub), los 6 DataStore services static, `schema.js`/`models` generados, gamificación algorítmica, modelos e interfaces. El plan debe **portar la lógica primero** (con tests Jest, R-11) y reescribir la UI encima.

3. **Bloqueantes críticos de F0/F1 que cuelgan el arranque si se ignoran:** R-04 (sin `@react-native-community/netinfo` el Hub de DataStore no emite `networkStatus` y `waitForSyncDataStore` se cuelga **bloqueando el splash**), R-03 (zone.js), R-09 (tokens Cognito a AsyncStorage), R-10 (keystore versionado → EAS Managed Credentials, **mismo** keystore o Play rechaza updates). Estos no admiten "se ve después".

4. **Cinco transversales de UI tocan casi todas las pantallas:** R-05 (theming multi-tenant por RACIMO vía CSS vars → `ThemeContext`, base visual de cada proyecto), R-06 (shadow DOM `--background`/`::part` inexistente en RN), R-08 (HTML enriquecido de S3 → `react-native-render-html` + sanitización JS-pura), R-12 (`ionViewWillEnter` → `useFocusEffect`), R-15/R-17/R-18 (navegación por strings y dos paradigmas de modal). Definir estos contratos **antes** de migrar pantallas evita reescribirlas dos veces.

5. **La migración es la oportunidad para corregir deuda, no para clonarla.** Bugs conocidos que se **corrigen** (no se portan literal, con justificación documentada en §4.4): R-48 (`cancelAllNotifications` nunca cancela), R-28 (`getLastUserProgress` mezcla lectura con efectos → duplica progreso en React), R-21 (`isAppUsageEvent` por `model.name` que Hermes ofusca), bug del setter `phase` en `MoonCardComponent`, acumulación sin reset de `achievements`. **Excluir** superficie muerta (CreationPage QA, sweetalert2, manifest huérfano).

---

## 2. Tabla de mapeo de librerías (equivalentes aprobados)

Esta es la decisión de "equivalentes permitidos": qué se sustituye, por qué y qué se elimina sin reemplazo.

| Librería actual | Reemplazo RN exacto | Justificación | Riesgos |
|---|---|---|---|
| `@angular/*` (core, common, forms, router, animations, platform-browser) | **React 18/19 + `@react-navigation/native` v6/v7** (+ native-stack, bottom-tabs); forms → `react-hook-form`/`useState`; animations → `react-native-reanimated` | El framework es el paradigma; no es portable. Router→navegadores condicionados por auth state; forms reactivos→estado controlado. | R-03, R-15, R-12 |
| `@ionic/angular` | **Componentes RN nativos** (`View`/`Text`/`Pressable`/`TextInput`/`Image`/`FlatList`/`Modal`) + libs específicas | Toda la presentación atada a shadow DOM Ionic. Cero corre en RN. | R-06, R-12, R-17/R-18, R-44, R-46 |
| Controladores Ionic (Modal/Alert/Toast/Loading) | **`@gorhom/bottom-sheet`** (modales) · **`Alert.alert`/modal custom** (alerts) · **`react-native-toast-message`** (toasts) · **`ActivityIndicator`** (loading) | Los 4 controladores imperativos no existen; se mapean a sus equivalentes idiomáticos. | R-44, R-17, R-18 |
| `AnimationController` (Ionic) | **`react-native-reanimated`** (`useSharedValue`/`withTiming`) | Animaciones del splash y transiciones. | R-41, R-30 |
| `chart.js` + `chartjs-adapter-date-fns` | **`victory-native` (XL, Skia)** o `react-native-gifted-charts`; eje temporal con **`date-fns`** directo | Chart.js depende de `<canvas>`/`getContext('2d')`; no corre sin WebView. El adapter muere con Chart.js. | R-02, R-50 |
| `html-to-image` | **`react-native-view-shot`** (`captureRef` sobre View nativa); opcional `expo-print` (PDF) | Renderiza un componente Angular headless en `document.body` y espera `document.fonts.ready`. 100% DOM. | R-01, R-33, R-50 |
| `dompurify` (+ SafeHtmlPipe) | **`react-native-render-html`** para render; **`sanitize-html`** (JS puro) preservando la allowlist exacta | `DomSanitizer`/`innerHTML`/`DOMParser` son DOM-only. La whitelist/política se preserva como spec de seguridad. | R-08, R-34 |
| `aws-amplify` ^6 | **`aws-amplify` ^6** + `@aws-amplify/react-native` + `react-native-get-random-values` + `@react-native-async-storage/async-storage` + `@react-native-community/netinfo` + `react-native-url-polyfill` | La capa Amplify es JS puro y porta casi 1:1; sólo requiere libs nativas RN y `configure` antes de `generateClient`. | R-04, R-09, R-21 |
| `@aws-amplify/datastore` ^5 | **`@aws-amplify/datastore` ^5** + NetInfo + adapter (AsyncStorage default / `@aws-amplify/datastore-storage-adapter` SQLite) | Modelos owner-auth + selective sync directos; fricción sólo nativa. `schema.js` se regenera con codegen. | R-04, R-09, R-26 |
| `date-fns` ^4 | **`date-fns` ^4** (sin cambios) | JS puro, idéntico en RN. Lib de fechas de referencia (calendario, agregaciones). | — |
| `rxjs` | **Context+hook / Zustand** (estado); params de React Navigation (Subscriptions de Router); `filter` se conserva si se mantiene el Hub de Amplify | No estructural: 5/7 archivos sólo usan `Subscription` (muere con hooks); 1 usa `BehaviorSubject` (→ Context). | R-27, R-31, R-29 |
| `tslib` | **`tslib`** (la trae el preset Babel/Expo) | Runtime helpers TS, agnóstico de framework. | — |
| `ionicons` (+ CDN unpkg + `addIcons`) | **`@expo/vector-icons` (Ionicons)** con mapeo directo de nombres, o SVG locales con `react-native-svg` | ~16 iconos por `name=`. Mismo set en `@expo/vector-icons`. Eliminar CDN y `addIcons` huérfano. | R-47, R-24 |
| `@capacitor/core` (`getPlatform`, `convertFileSrc`) | **`Platform.OS`** de RN; `convertFileSrc` deja de necesitarse (URIs `file://` directas) | El bridge Capacitor se elimina con `expo prebuild`. | R-22 |
| `@capacitor/app` (`minimizeApp`, `appStateChange`) | **`AppState`** + **`BackHandler`** de RN; `minimizeApp` → módulo nativo Android (`moveTaskToBack`) vía config plugin | `appStateChange`→`AppState`; back→`BackHandler`. `exitApp()` CIERRA, no minimiza → requiere nativo. | R-14, R-19 |
| `@capacitor/preferences` | **`@react-native-async-storage/async-storage`** (no sensible) + **`expo-secure-store`** (tokens/teléfono) | Sesión, `lastMeasurementValues`, flags. `clear()` no existe en SecureStore → borrar clave por clave. | R-37, R-09, R-27 |
| `@capacitor/filesystem` | **`expo-file-system`** | `Directory.Data`→`documentDirectory`, `Cache`→`cacheDirectory`. Reescribir wrapper con rutas absolutas + `makeDirectoryAsync({intermediates:true})`. | R-20, R-09, R-26 |
| `@capacitor/local-notifications` | **`expo-notifications`** (`DailyTriggerInput`, `setNotificationChannelAsync`, `cancelAllScheduledNotificationsAsync`) | Recordatorios 6/18h. **Corregir** el bug `cancelAllNotifications`. Validar Doze en device. | R-13, R-48, R-25 |
| `@capacitor/share` | **`react-native-share`** (urls+message+title) o `expo-sharing` + `Share.share` (texto) | El combo `url+files` de Capacitor no traduce 1:1; `react-native-share` es más fiel. | R-33 |
| `@capacitor/clipboard` | **`expo-clipboard`** (`setStringAsync`) o `@react-native-clipboard/clipboard` | 1 call site (copiar enlace). Cambio de una línea. | — |
| `@capacitor/device` (`getInfo().osVersion`) | **`expo-device`** (`platformApiLevel`) o **`Platform.Version`** | Capacitor da versión de marketing ('14'); RN da API level (34). Re-mapear: A12=API31, A15=API35. | R-25 |
| `@capacitor/network` | **eliminar el plugin**; instalar **`@react-native-community/netinfo`** (requisito del Hub de Amplify, no reemplazo directo) | 0 call sites; el estado de red ya se deriva del Hub. NetInfo es obligatorio para R-04. | R-04, R-22 |
| `@capacitor/keyboard` | **`Keyboard.dismiss()`** + **`KeyboardAvoidingView`**/`react-native-keyboard-controller` | 0 call sites del plugin; `hideKeyboard` usa `blur()` DOM. El resize implícito de Ionic se declara explícito. | R-38 |
| `@capacitor/splash-screen` | **`expo-splash-screen`** (`preventAutoHideAsync`/`hideAsync`) + pantalla animada en `react-native-reanimated` | 0 call sites; el splash animado es una página Angular custom. | R-38, R-41 |
| `@capacitor/status-bar` | **`expo-status-bar`** | 0 call sites; el estilo lo daba Ionic por defecto. Hay que declararlo. | R-38 |
| `@capacitor/cli` / `@capacitor/assets` / `cordova-res` | **`@expo/cli` + `eas-cli`** (build) · **assets desde `app.json`** (`expo prebuild`) | Reemplazados por el flujo Expo. El parche `sed @mipmap→@drawable` desaparece. | R-40 |
| Karma/Jasmine + `@angular-devkit/build-angular` | **Jest + `jest-expo` + `@testing-library/react-native`** | Runner atado a navegador; no corre en RN. | R-11, R-50 |
| ESLint Angular (`@angular-eslint/*`) | **`eslint-config-expo`** (react / react-hooks / react-native); conservar `@typescript-eslint` y reglas de estilo | Reglas de templates/selectores Angular sin lugar en RN. | — |
| `prettier` + `.prettierrc` | **`prettier`** (mismo `.prettierrc`); ajustar glob a `*.{ts,tsx,js,jsx}` | Agnóstico de framework. | — |
| `typescript` + `tsconfig*` | **`tsconfig` base de Expo** (`expo/tsconfig.base`); conservar `strict`; paths con `babel-plugin-module-resolver` | Quitar `angularCompilerOptions`/`experimentalDecorators`. | R-21 |
| `android/` (Gradle/Capacitor) + `capacitor.config.ts` + `angular.json` | **`expo prebuild`** regenera `android/`; **`app.json` + `eas.json` + `metro.config.js`** | CNG: borrar y regenerar. Resuelve `gradle-wrapper.jar` ausente, `MainActivity` en `io.ionic.starter`, etc. | R-22, R-40 |

### 2.1 Eliminar sin reemplazo (muertas o sin lugar en RN)

| Paquete / artefacto | Motivo |
|---|---|
| `sweetalert2` + `@sweetalert2/ngx-sweetalert2` | **Dependencia muerta**: 0 imports, 0 call sites (verificado por grep; "swal" eran base64 en SVG). Pesa en el budget. (R-45) |
| `cordova-res` | Muerta: la generación de assets usaba `@capacitor/assets`, no esta. |
| `@types/date-fns` | Obsoleta: date-fns v4 trae tipos propios; conflictiva. |
| `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/network`, `@capacitor/splash-screen`, `@capacitor/status-bar` | 0 call sites JS (scaffolding Ionic). NetInfo se instala igual por requisito del Hub, no como reemplazo del plugin network. (R-22) |
| `zone.js` | Polyfill de change detection de Angular; no existe ni tiene sentido en RN. (R-03) |
| `ini` + `inquirer` | Scripting obsoleto, sin uso en la app. |
| `@ionic/angular-toolkit`, `@angular-eslint/*`, `@angular/cli`, `@angular/compiler-cli`, `@angular/language-service`, `@angular-devkit/build-angular` | Tooling Angular/Ionic sin lugar en Expo. |
| `karma*`, `jasmine-core`, `jasmine-spec-reporter`, `@types/jasmine`, `karma-typescript`, `src/test.ts`, `src/polyfills.ts`, `karma.minimal.conf.js`, `.browserslistrc` | Runner de navegador y bootstrap zone.js. |
| `manifest.webmanifest`, `shapes.svg`, `Buttons.png`, `Text.png`, `brote1.png`, `.DS_Store`, `resources/splash.png` (Capacitor) | Assets huérfanos / config PWA-Capacitor regenerada por Expo. |
| `CreationPage` (alerts/creation) | Ruta huérfana de QA/desarrollo. **Excluir** de la app RN. (R-43) |

### 2.2 Polyfills/libs que aparecen NUEVAS en RN

| Nuevo | Por qué | Riesgo |
|---|---|---|
| `react-native-get-random-values` (importar **antes** de aws-amplify) | UUIDs de modelos DataStore | R-04 |
| `@react-native-community/netinfo` | El Hub de DataStore emite `networkStatus` sólo con NetInfo; sin él el splash se cuelga | R-04 (crítico) |
| `@react-native-async-storage/async-storage` | Persistencia de tokens Cognito y cache (reemplaza `localStorage` del WebView) | R-09 |
| `react-native-url-polyfill` | URL API para Amplify | R-04 |
| `react-native-svg` (+ `react-native-svg-transformer`) | 58 SVG no renderizan nativamente | R-24 |
| `expo-blur` (BlurView) | Sustituye `backdrop-filter:blur` (splash/container) | R-23 |
| `expo-image` | GIFs animados (confeti, loader, done_register) | R-24 |

---

## 3. Matrices completas por dominio

### 3.1 Dominio UI (pantallas, componentes, pipe, navegación, theme, tipografía, assets) — 48 ítems

| Nombre | Tipo | Clasif. | Target en RN | Esf. | Riesgos | Justificación (qué se rescata) |
|---|---|---|---|---|---|---|
| SplashAnimationPage | pantalla | Rewrite | reanimated + expo-blur + expo-splash-screen; lógica de decisión a hook `useAuthGate()` que alimenta el root navigator condicional | L | R-41, R-04, R-23, R-15, R-30 | `checkUserAuthentication`/`continueWithAuthenticatedFlow` (decisión login/register/home), orden de llamadas, offline-first vía `networkStatus`, destinos de navegación |
| LoginPage | pantalla | Rewrite | `react-hook-form`; `TextInput` `phone-pad`; modal RN | M | R-17, R-08, R-15, R-31 | form `phone` (req, min/max 10), `abrirModal`, ramaje post-signIn (MFA/sin MFA/`UserNotFoundException`); reusar `SetupService.signIn/createNewUser` |
| OtpPage | pantalla | Rewrite | N `TextInput` + `useRef[]` foco; `useEffect`+`setInterval` timer; `Alert.alert` | M | R-44, R-15, R-31, R-12 | array `otp[]` `^\d*$`, auto-avance/auto-envío, timer 60s, `reSendCode*`/`confirmSign*`; reusar `SetupService.confirm*` |
| ValidateCodePage | pantalla | Rewrite | `expo-image`/`ActivityIndicator`; `useEffect` `setTimeout(2000)`+`clearTimeout`; `navigation.replace` por `type` | S | R-30, R-15 | regla de bifurcación por `type` (login→project-vinculation / register→register-success) y el delay |
| RegisterPage | pantalla | Rewrite | `react-hook-form`; borde de error por estado | S | R-07, R-15, R-46 | validaciones name/lastName (req min3), `setParametersUser`; quitar imports muertos `IonRouterOutlet` |
| PreRegisterPage | pantalla | Rewrite | checkbox propio (`Pressable`+icono) + estado bool | S | R-06, R-15 | `enabledButton` vía `checkTerm`; navegación a register |
| SetPhoneRegisterPage | pantalla | Rewrite | modal de confirmación RN; reusar `SetupService.signUp` | M | R-17, R-08, R-15 | validación phone, `getParametersUser`, `signUp`→`otp/register/{phone}`. **Deuda:** FIXME número duplicado sin UI |
| ProjectVinculationPage | pantalla | Rewrite | reusar `SetupRacimoService.getRACIMOByCode`/`ConfigurationAppService.configExists`; bloqueo → estado de sync reactivo | M | R-04, R-27, R-31, R-15 | validación code (min/max 6), chequeo en init (UVA existente→validate-project/home), `goToValidateProject`, error inline |
| ValidateProjectPage | pantalla | Rewrite | `ActivityIndicator`/`expo-image`; `useEffect` `Promise.all`+`clearTimeout`; branding→`ThemeContext` | M | R-30, R-05, R-20, R-26 | `startTimerAndDownload` (downLoadData+loadBranding+moon phases), `cancelTimer`, bifurcación éxito/fallo |
| ProjectVinculationDonePage | pantalla | Rewrite | confeti `expo-image`/lottie; `loadImage` vía `file://`; `useEffect`+`clearTimeout` | S | R-30, R-20/R-24, R-05 | `getConfigurationApp`, branding, `racimoCode`, `setTimeout 3s`→register-project-form |
| RegisterProjectFormPage | pantalla | Rewrite | form **dinámico** `react-hook-form` desde `fieldsUVA`; `Keyboard.dismiss` | M | R-07, R-38, R-15 | `buildForm()` (control por campo, req min4), render `displayText`, `goToCompleted` (createNewUVA+updateUVA) |
| RegisterCompletedPage | pantalla | Rewrite | confeti; `useEffect`+`clearTimeout`; `navigation.reset` al App stack | S | R-30, R-31, R-42 | `setTimeout 3s`→home. `20vh`→`Dimensions*0.2` |
| RegisterSuccessPage | pantalla | Rewrite | `expo-image` GIF; botón→`navigation.reset/replace` a login | S | R-15, R-24 | `goToLogin` con `replaceUrl`→`reset` |
| TabsPage shell | pantalla | Rewrite | `createBottomTabNavigator`; `tabBarIcon` con `react-native-svg`; moon-phase en stack del tab Home | M | R-06, R-24, R-47, R-15 | comportamiento 3 tabs + ruta oculta moon-phase + estado por tab. Eliminar `addIcons` huérfano |
| HomePage | pantalla | Rewrite | modales `@gorhom/bottom-sheet`; `useFocusEffect` | L | R-18, R-36, R-12, R-28, R-15 | carga config/datos, notificaciones, `goToDetail`/`goToMoonCalendar`, **4 modales con textos exactos** (germinación 11-40/41-63/>63) como spec |
| MeasurementPage (tab Registrar) | pantalla | Rewrite | `FlatList`; modal bonus RN; `react-native-render-html` para `sortName`; extraer lógica a hook/servicio | L | R-08, R-32, R-12, R-18, R-15 | `showBonus`, restricciones de tiempo, `groupRemainingLazyMeasurements`, `surpriseTaskProcess`, `isTestUser`, `goToRegister`, `close()` |
| RegisterMeasurementPage | pantalla | Rewrite | inputs por dígito `TextInput`+`useRef[]`; modales RN; `render-html`; reemplazar `window.location.reload()` por refetch; persistencia→AsyncStorage; `validateRestriction` a función pura testeada | XL | R-07, R-08, R-23, R-18/R-17, R-35, R-31, R-15 | **núcleo crítico:** `onDigitsChange`, validaciones `save()` (range, `validateRestriction` operadores), `getMessageError`, encadenado `nextFlow/nextGuide`, `addMeasurement`, `completeTaskProcess` |
| HistoricalPage (tab Historial) | pantalla | Rewrite | `victory-native`; reporte `react-native-view-shot`; toasts/loader RN; share `react-native-share`/`expo-sharing`; **extraer toda la agregación a hooks testeados ANTES** | XL | R-01, R-02, R-07, R-33, R-32, R-44, R-12, R-15 | toda la agregación JS pura (`transformData`, `calculateMeasurement`, `calculateOverallStats`, sum/mean), `changeModeData`, `goToDetail`, `shareMonthlyReport` |
| TimeFrameComponent | componente | Rewrite | segmented control propio (2 `Pressable`); prop `value`+`onChange('month'\|'year')` | S | R-06 | toggle trivial; el valor está en el UI Ionic que no migra |
| MeasurementDetailPage | pantalla | Rewrite | params tipados `calendar`+`origin`; modal RN; reusar `GamificationService.recoverStreak`; `render-html`; cleanup `useEffect` | M | R-15, R-17, R-08, R-31 | lectura de params, `isYesterday`, reglas de alertas (semillas/racha), `openModal` recuperación, `recoverStreak()` |
| MoonPhasePage | pantalla | Rewrite | reusar `MoonPhaseService`; Calendar/MoonCard reescritos; header de React Navigation | M | R-26, R-12, R-24, R-06 | `Promise.all` de 3 llamadas, formateo `toLocaleDateString('es-ES')`, seeds vía `getLastUserProgress` |
| ProfilePage | pantalla | Rewrite | `Linking.openURL` (wa.me); `expo-clipboard`+toast; `react-native-share`; `unreadCount$`→`NotificationContext`; modal RN | M | R-07, R-31, R-27, R-37, R-18/R-36, R-15 | carga usuario/progreso/notificaciones, `shareOptions[]`, `logout` (signOut+clearSession+DataStore.clear) |
| PersonalInfoPage | pantalla | Rewrite | 2 forms `react-hook-form`; foco/'focused' por estado+refs; modales RN; `Alert.alert` | L | R-07, R-36, R-44, R-12, R-15 | 2 forms reactivos, parseo defensivo de `uva.fields`, `validateInput('ELIMINAR CUENTA')`, `handleDeleteUser` |
| AchievementPage | pantalla | Rewrite | grid `FlatList`; modales RN (reusar modal de semillas compartido con Home); `useFocusEffect` **con reset** del array | M | R-12, R-18, R-24, R-42 | `getMilestones`→iconos, FAB '¿Dudas?'. **Bug a corregir:** acumulación sin reset |
| AlertsPage (Notificaciones) | pantalla | Rewrite | `FlatList`+empty state; reusar `GamificationService`; `NotificationContext`; iconos `react-native-svg`+mapa | M | R-12, R-27, R-08, R-06 | `getNotifications`/`markAsRead`/`deleteAll`, `getNotificationIcon/Bg`, estado vacío |
| ConfigurationPage | pantalla | Rewrite | `AppState`+cleanup; `expo-notifications`; reconstruir diagnóstico exact-alarm/batería con config plugin/módulo nativo; toasts/loader RN; branding→`ThemeContext` | XL | R-19, R-25, R-13, R-44, R-12, R-05 | **la más acoplada:** `updateConfiguration`, chips de estado, 2 `app-sync-action`. NO portable: `appStateChange`, diagnósticos Android, `DataStore.start` |
| SyncActionComponent | componente | Rewrite | `View`/card + `Text` condicional + `Pressable`; props + `onClickSync` | S | R-06 | contrato de props/output reutilizable conceptualmente |
| CreationPage (QA) | pantalla | Rewrite | **EXCLUIR** de la app RN; si se necesita QA, botones RN→`GamificationAlertsService` | S | R-43 | ruta huérfana de desarrollo; evitar arrastrar superficie muerta |
| GuideMeasurementComponent | componente | Rewrite | modal RN/`bottom-sheet` por estado; `render-html`; `loadImage` `file://`; `onClose(nextGuide)` | M | R-08/R-34, R-17/R-18, R-20/R-24, R-46 | detección `Array.isArray(guide.text)`, carga async de imágenes, `closeModal({nextGuide})`. Checkbox sin binding (deuda) |
| AlertComponent | componente | Rewrite | `ConfirmModal` RN que resuelve `Promise<'OK'\|'CANCEL'>`; `render-html`; `Pressable`; `colorBtn`→tokens; box-shadow→elevation | M | R-17, R-08, R-06, R-42 | contrato de props y resultado por promesa se preservan |
| AreachartComponent | componente | Rewrite | `victory-native` (XL, Skia); 12 inputs como props reactivas (eliminar `UpdateChart`); gradiente Skia; banda `detailedMode`; tooltip custom | XL | R-02 | config de datasets/escalas/tooltips es la spec. Verificar `getMonthStartAndEnd` muerto |
| CalendarComponent | componente | **Major** | grid 7 col con flexbox; `ng-content`→props `renderHeader/renderFooter`; **date-fns se reusa tal cual**; SVG luna `react-native-svg`; `onDayPress(calendar)`; extraer `generate*` a funciones puras | L | R-29, R-24, R-06, R-23 | **mayor ratio lógica/UI:** `generateCalendarMonth/Week`, `getStatus` (prioridad saveStreak>complete>incomplete>normal), `setIconPhase` |
| DayComponent | componente | Rewrite | `View` circular 40x40 + `Text`; icono `react-native-svg`/`Image`; state→`StyleSheet` condicional; colores de tokens | S | R-24, R-06, R-42 | cero a la izquierda, icono por state, ngClass por estado: la regla es spec |
| EnvironmentalReportComponent | componente | Rewrite | `View` capturable con `react-native-view-shot`; tabla flexbox; `expo-linear-gradient`; logos `react-native-svg`/`Image` | XL | R-01, R-23, R-42, R-24 | formateadores (`formatRainfall`, `formatValue`, `getFirstHalfDays`...) e interfaces `DayData`/`ReportData` |
| HeaderComponent | componente | **Major** | Header de React Navigation o componente RN; fallback de seed a hook/contexto; `router.navigate`→`navigation.navigate`; chip `react-native-svg` | M | R-29, R-28, R-24, R-06 | estructura y props reutilizables. **Deuda:** logout sin implementar; desacoplar de DataStore/Router |
| MoonCardComponent | componente | Rewrite | `View` card + `Image` SVG; `onPress` (`Pressable`); conservar mapeo de constantes JS; **corregir bug del setter** | S | R-24, R-06 | `LUNAR_PHASE`/`LUNAR_PHASE_NAME` y setter `phase`. **Bug:** name/icon sin fallback. Renombrar asset con espacio |
| ProgressBarComponent | componente | Rewrite | `react-native-progress` o `View` con ancho `(current/total)*100%`; color de tokens | S | R-06 | cálculo `value` (default total=1) y texto 'Progreso: {x} de {y}' |
| ExploreContainerComponent | componente | Rewrite | layout con children; `titleHTML`→`render-html`; icon `react-native-svg`/`Image`; fondos `bg_blue`/`bg_green` de tokens; `expo-linear-gradient` | M | R-08, R-23, R-06, R-05 | patrón de layout + slots; envuelve ~13 pantallas de auth |
| SafeHtmlPipe | pipe | Rewrite | **Eliminar el pipe**; render `react-native-render-html`; sanitizar `sanitize-html` con la MISMA allowlist; `style=var()`→tokens | M | R-08, R-34, R-05 | whitelist (tags/attrs) y política de sanitización como spec de seguridad |
| Sistema de rutas/navegación | config | Rewrite | React Navigation v6: navegador **condicional por auth state** (Auth vs App stack), `createBottomTabNavigator`, modales como Modal group, **params tipados** (no objetos serializados), `navigation.reset` por `replaceUrl`/`window.location.reload` | L | R-15, R-07, R-43, R-17/R-18, R-14, R-30 | árbol de navegación y destinos son la spec. Consolidar duplicadas, excluir huérfanas |
| Theme / Design tokens | config | Rewrite | `theme.ts` (objeto JS tipado, fuente única); multi-tenant vía `ThemeProvider`+Context hidratado de `branding/colors.json` con `expo-file-system` (sustituye `setProperty`); `useTheme()`; forzar tema claro | L | R-05, R-42, R-51 | formalizar tokens en JS. **CRÍTICO:** theming por RACIMO es la base visual de cada proyecto |
| Tipografía Montserrat | asset | Rewrite | bajar pesos **estáticos** (400/500/600/700 normal+italic) y registrar con `expo-font` como familias separadas (seleccionar por familia, no `fontWeight`); reemplazar `text_base` por `<Text>` tipado separando `margin:10px` | M | R-16, R-42 | patrón tipográfico dominante (59 usos). **Android RN no interpola variable fonts** → pesos rotos sin estáticos |
| Assets: iconos UI SVG (~28) | asset | **Major** | `react-native-svg` + `react-native-svg-transformer`; iconos dinámicos `[src]` → `require()`/import estático + mapa `nombre→componente`; limpiar duplicados PNG/SVG | L | R-24, R-46 | archivos se reutilizan; cambia cómo se importan/resuelven (estático vs dinámico) |
| Assets: iconos de fase lunar SVG | asset | **Major** | consolidar en **un solo set**; **renombrar** `eclipses_card_home .svg` (espacio) y `cuarto_creceiente.svg` (typo) antes de importar; unificar mapeo MoonCard/Calendar | M | R-24 | dos sets duplicados (ES/EN). Nombres con espacio/typo rompen Metro |
| Assets: GIFs de animación | asset | **Minor** | `expo-image` (GIF animado en Android); opcional confeti→lottie, loader→`ActivityIndicator` | S | R-24 | confety/done_register/loader.gif; sólo cambia el render |
| Assets: ilustraciones, logos, fondos | asset | **Major** | SVG `react-native-svg`; PNG `Image`/`expo-image`; `background.svg` cover + `expo-blur` BlurView (sustituye `backdrop-filter`); eliminar huérfanos | M | R-23, R-24 | archivos se reutilizan; cambia render y efecto blur. `shapes.svg` huérfano |
| Assets: iconos PWA/Capacitor + splash | asset | Rewrite | `icon`/`adaptiveIcon`/splash en `app.json` + `expo-splash-screen` (regenerado); aportar PNG 1024×1024; eliminar `manifest.webmanifest` y splash Capacitor | S | R-38, R-24 | config de plataforma, no se usa en pantallas; Expo los regenera |
| Iconos Ionicons built-in (`name=`) | asset | **Minor** | `@expo/vector-icons` (Ionicons) mapeo directo; eliminar CDN y `addIcons` huérfano | S | R-47, R-24 | ~16 usos; mismo set de nombres. **(Dedup con Deps `ionicons` — ver §5; se cuenta en Deps)** |

> **UI — notas:** todas las pantallas son "Rewrite" por definición (template Ionic + SCSS shadow DOM). Las **2 únicas excepciones** son `CalendarComponent` y `HeaderComponent` (**Major**): conservan lógica central (cálculo de calendario con date-fns; estructura/props del header) pero hay que reescribir su integración. Los GIFs e Ionicons son **Minor** (cambio mecánico). XL concentrados en RegisterMeasurement, Historical, Configuration, Areachart, EnvironmentalReport (R-01, R-02, R-07, R-13, R-19).

### 3.2 Dominio Lógica de negocio, datos y capa Amplify — 42 ítems

| Nombre | Tipo | Clasif. | Target en RN | Esf. | Riesgos | Justificación |
|---|---|---|---|---|---|---|
| `errors-api.service.ts` (`handleAPIError`) | servicio | **Reusable** | copiar a `src/data/api/errors.ts`; conservar contrato `{success,data}\|{success,error}` | S | typo `mensage` | función pura, sin Angular/DOM. Único acople: typo `mensage` load-bearing |
| `user-api.service.ts` | servicio | Minor | quitar `@Injectable`→singleton/func; `aws-amplify/api` 1:1; `configure` antes del import | S | R-04 | `createUserOnly` inline para evitar conexiones; lógica intacta |
| `racimo-api.service.ts` | servicio | Minor | quitar `@Injectable`→instancia/func | S | R-04 | envoltura success/error pura |
| `uva-api.service.ts` | servicio | Minor | quitar `@Injectable`→instancia/func | S | R-04 | inspecciona `response.errors`→`handleAPIError`; sin acople UI |
| `user-progress-api.service.ts` | servicio | Minor | quitar `@Injectable`→instancia/func | S | R-04 | crea UserProgress inicial (Seed=0/Streak=0); pura |
| `moon-phase-api.service.ts` | servicio | Minor | quitar `@Injectable`; base de `MoonPhaseService` (herencia→composición) | S | R-04, R-26 | query `getMoonPhase` AWSJSON plano (no DataStore) |
| `auth.service.ts` | servicio | Minor | quitar `@Injectable`→singleton; `aws-amplify/auth` 1:1 con react-native+async-storage+get-random-values; tokens a AsyncStorage | M | R-04, R-09, R-21 | passwordless (pwd=phone), MFA SMS PREFERRED, `CONFIRM_SIGN_IN_*`, mapeo `AuthError.name`→type |
| `test-users.service.ts` | servicio | Minor | quitar `@Injectable`→`export const isTestUser`; mantener lista exacta (3000000002 salta OTP) | S | — | array hardcodeado + includes; bypass MFA/OTP |
| `session/session.service.ts` | servicio | **Major** | backing→AsyncStorage/expo-secure-store; **preservar API pública**; `clear()`→borrar clave por clave (`sessionKeys`); envolver en `SessionContext` reactivo | M | R-09, R-37, R-27 | **dependencia transversal:** cada DS service hace `static session = new SessionService()`. Fan-in masivo |
| `datastore/measurement-ds.service.ts` | servicio | Minor | copiar casi 1:1; `static session` a AsyncStorage; DataStore RN con netinfo+get-random-values | S | R-04, R-09 | métodos static, lógica pura sobre DataStore |
| `datastore/user-progress-ds.service.ts` | servicio | **Major** | portar casi 1:1 PERO **separar lectura pura de side-effects** (recálculo diario idempotente único + getter puro); cubrir con Jest | L | R-28, R-11 | **núcleo algorítmico de rachas/hitos.** `getLastUserProgress` mezcla lectura con efectos → duplica en React. Umbrales hardcodeados (11/41/64) divergen de `ConfigModel` |
| `datastore/gamification-event-ds.service.ts` | servicio | Minor | copiar 1:1; static session a AsyncStorage; `syncExpression` idéntica | S | R-09, R-04 | filtra `userID`+`isUnclean===true`; borrado lógico |
| `datastore/user-ds.service.ts` | servicio | Minor | copiar 1:1 | S | R-04, R-09 | `getUser`/`updateUser` por userID de sesión |
| `datastore/uva-ds.service.ts` | servicio | Minor | copiar 1:1 | S | R-04, R-09 | `getUVAByID/ByuserID`, `updateUVA` |
| `datastore/racimo-ds.service.ts` | servicio | **Reusable** | copiar tal cual (sólo import path); NO usa sesión | S | R-04 | `getRacimoCode(racimoID)→LinkageCode` |
| `datastore/sync-monitor-ds.service.ts` | servicio | **Major** | `SyncContext`/provider que suscribe el Hub y expone `{state,networkStatus,synchronizedData(),waitForSync()}`; instalar NetInfo; **corregir** type guard (`data.model === AppUsageEvent`); romper dep a `AppUsageService` | L | R-04, R-21, R-27 | máquina de estados estática vía `Hub.listen`. Polling 100ms es puro. **Bug:** `model.name` ofuscado por Hermes rompe outbox cleanup |
| `storage/file-system/file-system.service.ts` | servicio | **Major** | reescribir wrapper sobre `expo-file-system`: rutas absolutas + `makeDirectoryAsync({intermediates:true})`; **preservar firma `{success,data\|error}` y nombres de archivo** | M | R-20, R-26 | superficie pequeña; Capacitor `{directory,path}` relativo vs expo URIs absolutas |
| `storage/s3/s3.service.ts` | servicio | **Major** | quitar `@Injectable`; conservar `list` y rama JSON/TXT; reescribir rama binaria con `expo-file-system` base64 (Blob/`URL.createObjectURL` no existen) | M | R-21, R-09 | sólo lectura. Rutas `public/racimos/<code>/...` idénticas (white-labeling) |
| `storage/configuration-app.service.ts` | servicio | **Major** | **dividir en dos:** (1) `ConfigContext` con descarga+cache; (2) `ThemeProvider` que reemplaza `applyColors`/CSS vars; `loadImage`→`file://` (eliminar rama web) | L | R-05, R-21, R-27, R-20 | **la mayor mezcla de responsabilidades.** I/O+cache PORTABLE; `applyColors` 100% DOM |
| `view/setup/setup.service.ts` | servicio | Minor | quitar `@Injectable`→instancia/func; imports directos de singletons | M | R-04, R-09 | orquestación pura (Auth+Session+UserAPI+UserProgressAPI); `createNewUser` por API GraphQL directo |
| `view/setup/setup-racimo.service.ts` | servicio | Minor | quitar `@Injectable`→instancia/func; cubrir ID secuencial con Jest | S | R-11, R-09 | genera ID `UVA_<code>_<00000+1>` con regex; guarda en sesión |
| `view/gamification/gamification.service.ts` | servicio | **Major** | quitar `@Injectable`; **deshacer `extends UserProgressDSService`** (módulo de funciones compuestas); excluir métodos DEBUG; **reactivar `gamification.service.spec.ts`** | L | R-11, R-28 | algoritmo puro (recompensa tarea/racha/bonus, reintentos x3 backoff, coste 5 semillas). Tests reales comentados desde línea 35 |
| `view/gamification/gamification-alerts.service.ts` | servicio | Minor | quitar `@Injectable`→módulo; mantener textos exactos del catálogo | S | R-08, R-34 | crea `GamificationEvent`, formatea títulos, timestamp relativo (Hoy/Ayer/Hace N días) |
| `view/gamification/gamification-alerts-types.service.ts` | modelo | **Reusable** | copiar tal cual (sólo import path) | S | R-08, R-34 | tipos + catálogo de ~135 mensajes ES con placeholders + `validateEventData` |
| `view/gamification/notification.service.ts` (**BADGE**) | servicio | **Major** | `NotificationContext` (Context+hook) o Zustand; suscripciones con cleanup; **RENOMBRAR** (`UnreadNotificationsStore`) | M | R-27, R-31 | **único estado reactivo de la app** (`BehaviorSubject<number>`). Suscripción en Profile sin desuscribir (fuga). Homónimo del push |
| `view/moon/moon-phase.service.ts` | servicio | **Major** | quitar `@Injectable`; resolver `extends`→composición; lógica pura 1:1; I/O sobre FileSystem reescrito **preservando `lunar-phases-YYYY-MM.json`**; cubrir con Jest | M | R-26, R-20, R-11 | mapeo `PHASE_MAPPING`, 24 meses, próximos eventos: puro. Saneo regex AWSJSON (5 `.replace()`) frágil |
| `view/app-usage.service.ts` | servicio | Minor | quitar `@Injectable`→instancia/func; `syncExpression` outbox-only idéntica | S | R-21, R-04, R-09 | telemetría outbox-only. Cleanup depende del fix de SyncMonitor |
| `view/environmental-report.service.ts` | servicio | **Rewrite** | **separar:** (1) extraer agregación pura a módulo + tests; (2) reescribir render con `react-native-view-shot`; tabla flexbox | XL | R-01, R-32, R-23, R-33 | agregación (mañana/tarde, temp/hum/lluvia, stats) es pura. `generateReportImage` monta componente Angular headless en `document.body` |
| `view/share.service.ts` | servicio | **Rewrite** | reescribir sobre `react-native-share`/`expo-sharing` + `view-shot`; eliminar rama web; `Platform.OS` de RN | L | R-33, R-20, R-07 | mezcla escritura de archivo (portable) con Capacitor Share combo url+files + fallback web |
| `minimize/app-minimize.service.ts` | servicio | **Rewrite** | `BackHandler` + React Navigation; `routesToMinimize` se preserva como dato; minimizar real→módulo nativo (`moveTaskToBack`) | M | R-14, R-07 | decisión minimizar-vs-retroceder es lógica reutilizable; cableado web/Ionic se reescribe. `exitApp()` CIERRA |
| `services/notification/notification.service.ts` (**PUSH LOCAL**) | servicio | **Rewrite** | reescribir sobre `expo-notifications`; preservar lógica de horarios pura; re-mapear versiones a API levels; **CORREGIR** `cancelAllNotifications`; **RENOMBRAR** (`LocalRemindersService`) | XL | R-13, R-48, R-25, R-19, R-22 | ~410 líneas Capacitor (canales, permisos A13+, exact-alarm A12+, batería, Private Space A15+). **Bug:** nunca llama `LocalNotifications.cancel()` |
| `src/models/session.model.ts` | modelo | **Reusable** | copiar tal cual; `sessionKeys[]` es la lista canónica para `clear` manual | S | R-37 | interface `Session` + `sessionKeys[]`; sin dependencias |
| `src/models/schema.js` + `schema.d.ts` | modelo | **Reusable** | copiar o regenerar con `amplify codegen`; `initSchema(schema)` idéntico | S | R-09, R-04 | 7 modelos + relaciones/índices/auth; datos puros |
| `src/models/index.js` + `index.d.ts` | modelo | **Reusable** | copiar tal cual; `data.model === AppUsageEvent` (R-21) usa este export | S | R-04 | `initSchema`→7 clases de modelo |
| `src/models/configuration/config.model.ts` | modelo | **Reusable** | copiar tal cual; decidir uso de `gamification` configurable vs hardcodeado | S | divergencia config | `gamification` (milestones/streakReward) diverge de umbrales hardcodeados (deuda) |
| `src/models/configuration/measurements.model.ts` | modelo | **Reusable** | copiar tal cual; al reescribir medición decidir motor parametrizable vs fijo y **documentar** | S | R-35 | motor de medición. `FlowRestriction.validationFunction` se IGNORA (UI usa `0:>:1` fija) |
| `src/models/configuration/colors.model.ts` | modelo | **Reusable** | copiar tal cual; alimenta el `ThemeProvider` | S | R-05 | branding por RACIMO; `Record<string,HexColor\|RgbColor>` |
| `src/app/Interfaces/IMeasurement.ts` | modelo | **Reusable** | copiar tal cual | S | — | interface pura |
| `src/app/Interfaces/ITask.ts` | modelo | **Reusable** | copiar tal cual | S | — | interface pura |
| `src/graphql/*` + `src/API.ts` | modelo | **Reusable** | regenerar con `amplify codegen` (cambiar framework a none/react); subset consumido | S | R-40 | generado por Codegen. Credenciales hardcodeadas en `amplifyconfiguration.json`→EAS |
| Amplify bootstrap (`main.ts`+`app.component.ts`) | config | **Major** | mover a `App.tsx`: `get-random-values` antes de aws-amplify; `Amplify.configure`; `DataStore.configure({syncExpressions, storageAdapter?})`; decidir AsyncStorage vs SQLite; entornos por perfil EAS | L | R-04, R-09, R-40 | `syncExpressions` selectivos (isUnclean; AppUsageEvent outbox-only) idénticos. `generateClient` a nivel módulo exige configure previo |
| Patrón DI Angular → RN | config | **Major** | servicios→**módulos TS** con singleton/funciones; **deshacer herencias de clase** (composición); estado observable (Session/Sync/unreadCount/Config)→Context+hook/Zustand | M | R-27, R-09 | coexisten `@Injectable` + clases static + herencias static+instancia; ninguno encaja con hooks |

> **Lógica — notas:** ~70-75% preservable casi sin tocar; ~20% swap mecánico Capacitor→Expo manteniendo contratos; ~5-8% reescritura (Report render, Share, AppMinimize, push). Los **2 NotificationService homónimos** (badge reactivo vs push local) se **renombran** al portar. La suite de tests está inactiva (R-11): reactivar Jest sobre funciones puras extraídas **antes** de migrar gamificación/racha/fase-lunar/agregaciones.

### 3.3 Dominio Dependencias y Build System — 67 ítems

| Nombre | Tipo | Clasif. | Target en RN | Esf. | Riesgos | Justificación |
|---|---|---|---|---|---|---|
| `@angular/*` (core/common/compiler/forms/router/animations/platform-browser) | librería | Rewrite | React 18/19 + React Navigation; forms→hooks | XL | R-03, R-15, R-12 | el framework es el paradigma; zone.js no existe |
| `@ionic/angular` | librería | Rewrite | componentes RN + libs (bottom-sheet/toast/alert/loading/reanimated) | XL | R-06, R-12, R-17/R-18, R-44, R-46 | toda la presentación atada al shadow DOM |
| `@ionic/angular-toolkit` | librería | Rewrite | eliminar | S | — | schematics de scaffolding Ionic |
| `ionicons` + `addIcons` (tabs) | asset | Rewrite | `@expo/vector-icons` o SVG locales; eliminar CDN y `addIcons` huérfano | S | R-47, R-24 | ~16 iconos `name=`. **(Dedup: misma pieza que UI «Iconos Ionicons built-in» — se cuenta aquí)** |
| `rxjs` | librería | **Major** | `BehaviorSubject`→Context+hook; Subscriptions→params React Navigation; eliminar del package salvo Hub | M | R-27, R-31, R-29 | no estructural: 5/7 sólo `Subscription`; 1 `BehaviorSubject` |
| `zone.js` | librería | Rewrite | eliminar; modelo de reactividad→hooks | S | R-03 | polyfill de change detection de Angular |
| `tslib` | librería | **Reusable** | conservar (la trae el preset) | S | — | runtime helpers TS |
| `aws-amplify` ^6 | librería | **Major** | +`@aws-amplify/react-native`+get-random-values+async-storage+netinfo; configure pre-bootstrap | L | R-04, R-09, R-21 | JS puro, porta casi 1:1; bootstrap frágil sin NetInfo |
| `@aws-amplify/datastore` ^5 | librería | **Major** | +adapter RN (AsyncStorage/SQLite)+NetInfo; servicios `datastore/*` portados quitando DI | L | R-04, R-09, R-26 | 7 modelos owner-auth + selective sync directos |
| `chart.js` | librería | Rewrite | `victory-native`/`react-native-svg` por props | L | R-02, R-50 | depende de `<canvas>`; sólo en areachart |
| `chartjs-adapter-date-fns` | librería | Rewrite | eliminar; eje temporal de la lib elegida con date-fns | S | R-02 | acoplado 100% a Chart.js |
| `date-fns` ^4 | librería | **Reusable** | conservar (misma v4) | S | — | JS puro; lib de fechas de referencia |
| `@types/date-fns` | librería | Rewrite | eliminar | S | — | obsoleto; date-fns v4 trae tipos |
| `dompurify` | librería | Rewrite | `react-native-render-html` + `sanitize-html` (whitelist exacta) | M | R-08, R-34 | sanea para `innerHTML`, que no existe en RN |
| `html-to-image` | librería | Rewrite | `react-native-view-shot` (+`expo-print` opcional) | L | R-01, R-33, R-50 | genera PNG renderizando componente Angular en `document.body` |
| `sweetalert2` | librería | Rewrite | **eliminar** (0 call sites) | S | R-45 | dependencia muerta |
| `@sweetalert2/ngx-sweetalert2` | librería | Rewrite | **eliminar** | S | R-45 | wrapper Angular de dep muerta |
| `@capacitor/core` | plugin | Rewrite | `Platform.OS`; `convertFileSrc` innecesario | S | R-22 | bridge eliminado con prebuild |
| `@capacitor/android` | plugin | Rewrite | eliminar; host nativo = Expo Dev Client | S | R-22, R-40 | runtime Android Capacitor |
| `@capacitor/app` | plugin | **Major** | `appStateChange`→`AppState`; back→`BackHandler`; `minimizeApp`→módulo nativo | M | R-14, R-19 | `minimizeApp` sin equivalente Expo |
| `@capacitor/preferences` | plugin | **Major** | AsyncStorage + expo-secure-store; capa de mapeo; `clear()`→lista de claves | M | R-37, R-09, R-27 | ~12 call sites; firmas distintas |
| `@capacitor/filesystem` | plugin | **Major** | `expo-file-system`; reescribir wrapper rutas absolutas | L | R-20, R-09, R-26 | ~15 call sites; expo no crea dirs intermedios |
| `@capacitor/local-notifications` | plugin | **Major** | `expo-notifications` (DailyTrigger, canal, cancelAll); **corregir bug** | L | R-13, R-48, R-25 | recordatorios 6/18h; expo menos granular sobre AlarmManager |
| `@capacitor/share` | plugin | **Major** | `react-native-share`/`expo-sharing`+`Share.share` | M | R-33 | combo url+files no traduce 1:1 |
| `@capacitor/clipboard` | plugin | **Minor** | `expo-clipboard`/`@react-native-clipboard/clipboard` | S | — | 1 call site; mapeo directo |
| `@capacitor/device` | plugin | **Major** | `expo-device`/`Platform.Version` (API level) | S | R-25 | versión marketing vs API level rompe comparaciones |
| `@capacitor/haptics` | plugin | Rewrite | **eliminar** (0 call sites) | S | — | muerto (scaffolding) |
| `@capacitor/keyboard` | plugin | Rewrite | eliminar plugin; `Keyboard.dismiss()`+`KeyboardAvoidingView` | S | R-38 | 0 call sites; resize implícito a declarar |
| `@capacitor/network` | plugin | Rewrite | eliminar; **NetInfo** obligatorio por el Hub (no reemplazo directo) | S | R-04, R-22 | 0 call sites; red derivada del Hub |
| `@capacitor/splash-screen` | plugin | Rewrite | `expo-splash-screen` + pantalla animada reanimated | S | R-38, R-41 | 0 call sites; splash es página custom |
| `@capacitor/status-bar` | plugin | Rewrite | `expo-status-bar`/`StatusBar` RN | S | R-38 | 0 call sites; estilo de Ionic por defecto |
| `@capacitor/cli` | plugin | Rewrite | `@expo/cli`+`eas-cli` | S | R-40 | flujo Expo |
| `@capacitor/assets` | plugin | Rewrite | assets desde `app.json` (prebuild) | S | R-40 | parche sed desaparece; falta `icon.png` |
| `cordova-res` | plugin | Rewrite | **eliminar** | S | — | muerta |
| Toolchain ESLint (`eslint`+`@typescript-eslint`+plugins) | config | **Major** | mantener eslint+@typescript-eslint; reemplazar `@angular-eslint` por `eslint-config-expo`; conservar reglas TS | M | — | capa Angular se elimina; core TS se conserva |
| `@angular-eslint/*` | config | Rewrite | **eliminar** | S | — | reglas/parser Angular |
| `prettier` + `.prettierrc` | config | **Reusable** | conservar; ajustar glob | S | — | agnóstico de framework |
| Stack Karma/Jasmine | config | Rewrite | Jest + jest-expo + RN Testing Library | M | R-11, R-50 | runner de navegador |
| 57 specs `*.spec.ts` | script | **Major** | lógica pura→Jest casi 1:1 (quitar TestBed); componentes/páginas→RN Testing Library | L | R-11 | sólo 1 spec corre; tests reales comentados |
| `husky` | config | Rewrite | reconstruir hooks (husky 9 + lint-staged) en F6 | S | R-49 | declarada pero sin hooks |
| `ini` + `inquirer` | librería | Rewrite | **eliminar** | S | — | scripting obsoleto |
| `typescript` + `tsconfig*` | config | **Minor** | base de Expo; conservar strict; quitar Angular; paths con module-resolver | M | R-21 | TS 5.5 strict se conserva |
| `@angular-devkit/build-angular` + CLI + compiler | config | Rewrite | Metro + `expo prebuild`/EAS; entornos por perfil EAS | M | R-40, R-50 | builder webpack Angular |
| Script `npm start` (`ng serve`) | script | Rewrite | `expo start --dev-client` | S | R-40 | dev server web |
| Script `npm build`/`watch` | script | Rewrite | `eas build`/`expo run:android`; watch→Fast Refresh | S | R-40 | build web a www/ |
| Scripts `npm test`/`test:dev`/`test:ci` | script | Rewrite | `jest`/`jest --watch`/`jest --ci` | S | R-11 | launcher inexistente; 1 spec |
| Scripts `npm lint`/`lint:fix`/`format` | script | **Minor** | `eslint --ext .ts,.tsx` + prettier glob actualizado | S | — | se conservan conceptualmente |
| Script `npm update-graphql` (codegen) | script | **Reusable** | mismo comando `npx @aws-amplify/cli codegen` | S | — | regenera capa GraphQL; agnóstico de UI |
| Scripts `amplify-modelgen`/`amplify-push` | script | Rewrite | **eliminar** (archivos inexistentes hoy) | S | R-49 | ROTOS: el directorio no existe |
| `scripts/setup-android.sh` | script | Rewrite | `npx expo prebuild --platform android` | M | R-40 | hardcodea macOS/Capacitor + parche sed |
| `scripts/build-android.sh`+`build-bundle.sh` | script | Rewrite | `expo run:android --variant release` / `eas build` | M | R-40 | gradle global; wrapper ausente |
| `scripts/build-production.sh`+`-safe` | script | Rewrite | perfiles `eas.json` con env vars (EXPO_PUBLIC_*) | M | R-40 | conmutación por `amplify env checkout` frágil |
| `android:full` + `build-android-debug` | script | Rewrite | `expo prebuild` + (`run:android`/`eas build`) | S | R-40 | composiciones Ionic/Capacitor |
| `scripts/setup-dev-environment.sh` (312 líneas) | script | Rewrite | reescribir para stack Expo (eas-cli/@expo/cli/aws-amplify) | M | R-40, R-49 | bootstrap Ionic/Angular/Capacitor |
| `capacitor.config.ts` + `ionic.config.json` | config | Rewrite | `app.json`/`app.config.js`; eliminar `ionic.config.json` | S | R-40, R-22 | config Capacitor/Ionic |
| `angular.json` | config | Rewrite | `app.json`+`eas.json`+`metro.config.js`+`babel.config.js` | M | R-50, R-24, R-40 | config maestra del build Angular |
| `android/` (Gradle/Capacitor) | config | Rewrite | **borrar y regenerar** con `expo prebuild`; permisos→`app.json`+config plugins | L | R-22, R-40 | 12 plugins cableados; MainActivity en paquete equivocado; wrapper ausente |
| Keystore `android/keys/keystore.jks` (versionado) | config | Rewrite | subir **el MISMO** keystore a EAS Managed Credentials; purgar de git (filter-repo/BFG) | M | R-10 | crítico operacional: keystore distinto→Play rechaza updates |
| `versionCode`(8)/`versionName`(2.1.7)/`applicationId` | config | **Minor** | `app.json` + `eas.json` autoIncrement; **consultar versionCode publicado** | M | R-39 | CI sobrescribe con timestamp/10; riesgo de regresión |
| Íconos/splash (`resources/splash.png`; sin `icon.png`) + parche sed | asset | Rewrite | `app.json` (`icon` 1024×1024 **falta crear**, `adaptiveIcon`, splash); prebuild genera densidades | M | R-40 | parche sed desaparece |
| Workflow `build-android.yml` (APK, 362 líneas) | pipeline | Rewrite | `eas build -p android --profile preview`; matriz rama→perfil | L | R-40 | infra Capacitor/Gradle/Amplify-checkout |
| Workflow `build-android-bundle.yml` (AAB, 764 líneas) | pipeline | Rewrite | `eas build -p android --profile production`; opcional `eas submit`; autoIncrement | L | R-10, R-39, R-40 | reescribe build.gradle con sed/awk; keystore versionado |
| Workflow `test-secrets.yml` | pipeline | Rewrite | **eliminar** (credenciales→EAS) | S | R-10 | obsoleto |
| Ausencia de CI lint/test | pipeline | Rewrite | nuevo workflow `npm ci → eslint → jest`; bloquear merge | S | R-11 | gap detectado; crear (no portar) |
| Docs de proceso (README-PIPELINE, release-workflow, etc.) | config | Rewrite | reescribir para flujo Expo/EAS; eliminar referencias rotas | M | R-49 | documentan pipeline Capacitor/Gradle |
| Config entornos Amplify (`amplify/.config/*`, team-provider) | config | **Minor** | conservar `amplify/`; conmutar por perfiles `eas.json`+EXPO_PUBLIC_* | S | R-04, R-09 | backend se PRESERVA; sólo cambia selección de entorno |
| Tooling aux (`.editorconfig`, `.browserslistrc`, `karma.minimal`, `test.ts`, `polyfills.ts`) | config | Rewrite | conservar `.editorconfig`; eliminar el resto; polyfill RN=`get-random-values` | S | R-03, R-04 | bootstrap zone.js/testing muere con Angular |

> **Deps — notas:** RxJS no se conserva salvo que el Hub de Amplify lo justifique (el Hub usa callbacks). BUILD destino: dev→`expo start --dev-client`; APK local→`expo run:android --variant release`; APK cloud→`eas build --profile preview`; AAB firmado→`eas build --profile production`. CNG (borrar `android/`+prebuild) elimina de raíz: wrapper ausente, MainActivity en `io.ionic.starter`, parche sed, reescritura sed/awk de versionCode e inconsistencia Gradle 8.5 vs 8.2.1.

---

## 4. Decisiones de diseño que la implementación debe respetar

### 4.1 DI de Angular → patrón elegido

**Decisión:** eliminar la DI de Angular por completo y unificar en un patrón coherente con React/hooks. Coexisten hoy tres mecanismos (`@Injectable({providedIn:'root'})`, clases con métodos `static` sin DI, y herencias de clase que mezclan static con instancia). Ninguno encaja con hooks. Reglas:

1. **Servicios de lógica/datos** (api/\*, auth, setup, gamification-alerts, datastore/\*) → **módulos TS** que exportan una **instancia singleton** (`export const xxxService = ...`) o funciones; dependencias resueltas por **import directo** del singleton (no por constructor injection).
2. **Herencias de clase a deshacer por composición:**
   - `GamificationService extends UserProgressDSService` → dos módulos; el primero compone funciones del segundo.
   - `MoonPhaseService extends MoonPhaseAPIService` → composición sobre el módulo de api portado.
   - Motivo: las clases base tienen métodos `static` que no se heredan idiomáticamente ni encajan con hooks.
3. **El patrón static actual de los 6 DS services se puede conservar** (son `static`, sin `@Injectable`); el único cambio efectivo es que su `static session = new SessionService()` use AsyncStorage. Se admite mantener static o convertir a funciones, pero **uniformemente**.

### 4.2 Manejo de estado global

**Decisión:** el estado que la UI debe **observar** se modela con **React Context + hook** (o Zustand si se prefiere un store), nunca con singletons+Observable de Angular. Contextos a crear:

| Contexto/Store | Reemplaza | Riesgo |
|---|---|---|
| `SessionContext` | `SessionService` (pull no reactivo). La instancia singleton se mantiene para los DS services; el Context la envuelve para la UI | R-27, R-09 |
| `SyncContext` | máquina de estados estática de `SyncMonitorDSService`; expone `{state, networkStatus, synchronizedData(), waitForSync()}` | R-27, R-04 |
| `ThemeProvider` / `useTheme()` | `applyColors`/CSS vars (`document.documentElement.style.setProperty`) — theming multi-tenant por RACIMO, hidratado desde `colors.json` con `expo-file-system` | R-05 (crítico) |
| `ConfigContext` | cache en memoria de `ConfigurationAppService` (carga única) | R-27 |
| `NotificationContext` / `UnreadNotificationsStore` | `BehaviorSubject<number>` del badge | R-27, R-31 |

La **persistencia** (no reactiva) sigue en módulos: AsyncStorage (datos no sensibles), expo-secure-store (tokens/teléfono), expo-file-system (config/branding/fases lunares).

### 4.3 Los dos `NotificationService` homónimos

**Decisión: RENOMBRAR ambos al portar** para eliminar la colisión:

- `core/services/view/gamification/notification.service.ts` (**BADGE**, `BehaviorSubject<number> unreadCount$`) → **`UnreadNotificationsStore`** (`NotificationContext`+hook `useUnreadCount`). Es el único estado reactivo compartido de la app.
- `services/notification/notification.service.ts` (**PUSH LOCAL**, ~410 líneas Capacitor) → **`LocalRemindersService`** (reescritura sobre `expo-notifications`).

### 4.4 Tratamiento de bugs conocidos (preservar vs corregir)

> **Regla vinculante:** por defecto se **preserva el comportamiento** observable (la migración no debe introducir cambios funcionales no acordados). **Corregir un bug durante la migración requiere justificación documentada** —la que sigue queda escrita aquí como autorización explícita—. Cualquier corrección NO listada aquí debe documentarse igual antes de aplicarse.

| Bug | Riesgo | Decisión | Justificación documentada |
|---|---|---|---|
| `cancelAllNotifications` quita listeners + `Preferences.remove` pero **nunca** llama `LocalNotifications.cancel()` → las notificaciones siguen disparándose tras "desactivar" | R-48 | **CORREGIR** | El comportamiento actual es un defecto de seguridad/UX directo (el usuario desactiva y siguen llegando). Reimplementar con `cancelAllScheduledNotificationsAsync()`. |
| `getLastUserProgress` mezcla lectura con efectos (crea UserProgress, recalcula/pierde racha, emite GamificationEvents) y se llama como getter desde 6+ pantallas | R-28 | **CORREGIR** (separar) | En React (StrictMode doble render + refetch en focus) **duplicaría** progreso/alertas. Separar recálculo diario idempotente único del getter puro es obligatorio para que la app no se corrompa. |
| `isAppUsageEvent` compara `data.model.name === 'AppUsageEvent'`; Hermes **ofusca** `Function.name` → outbox cleanup roto silenciosamente | R-21 | **CORREGIR** | Hermes rompe la comparación; sin el fix la limpieza de outbox falla en RN. Comparar contra la clase importada (`data.model === AppUsageEvent`). |
| Setter `phase` de `MoonCardComponent`: `_phase` tiene fallback `NEW_MOON` pero `name`/`icon` usan el parámetro sin fallback → pueden quedar `undefined` | — | **CORREGIR** | Se reescribe el componente; aplicar el fallback consistente es trivial y evita render roto. |
| `AchievementPage`: `achievements` se acumula en cada `ionViewWillEnter` sin reset → duplicación | R-12 | **CORREGIR** | Al pasar a `useFocusEffect` se resetea el array; preservar la acumulación sería portar un bug visible. |
| `HeaderComponent.goBack` tiene lógica de logout **sin implementar** (deuda) | R-29 | **DECIDIR/documentar** | No es un bug activo (rama muerta). Implementar o eliminar la rama; documentar la elección. |
| `FlowRestriction.validationFunction` del modelo se **ignora** (UI usa `0:>:1` fija) | R-35 | **DECIDIR/documentar** | Cambiar a motor parametrizable altera comportamiento. Por defecto **preservar** la función fija; si se implementa el motor, documentar para evitar regresión silenciosa. |
| Umbrales de germinación hardcodeados (11/41/64) divergen de `ConfigModel.gamification` | — | **DECIDIR/documentar** | Por defecto **preservar** los hardcodeados (comportamiento actual); documentar la divergencia y, si se unifica con config, validarlo. |
| `cancelAllNotifications` y otras suscripciones RxJS sin teardown / `backButtonSubscription` muerto | R-31 | **CORREGIR (limpieza)** | Las fugas de suscripción desaparecen al pasar a `useEffect` con cleanup; el código muerto se elimina. |
| typo `mensage` propagado en toda la capa de errores | — | **PRESERVAR** (por defecto) | Es load-bearing en toda la base; corregirlo exige refactor coordinado fuera del alcance de la migración. Cambio opcional, no migración. |

### 4.5 RxJS: sí/no y dónde

**Decisión: RxJS NO se conserva como dependencia estructural.** Detalle por uso real (7 archivos):

- **5 archivos** (login, otp, project-vinculation, register-completed, home) sólo importan `Subscription` → **desaparece** con hooks; varias suscripciones están muertas o sin teardown (R-31).
- **1 archivo** (gamification `notification.service.ts`, badge) usa `BehaviorSubject`+`Observable` → **se reemplaza por Context+hook** (`UnreadNotificationsStore`, R-27).
- **`app.component.ts`** usa `filter` de `rxjs/operators` sobre el Hub de Amplify → el Hub usa **callbacks**, no rxjs; se reescribe sin RxJS.

**Conclusión:** eliminar `rxjs` del `package.json`. La capa Amplify/DataStore puede seguir exponiendo Observables internamente (los consume con un hook `useObservable` puntual si hace falta), pero **no se añade RxJS a la app RN**.

---

## 5. Inconsistencias entre clasificadores (resueltas)

Tres tipos de solapamiento entre dominios; sólo **uno** es una duplicación real (mismo artefacto contado dos veces).

| Elemento | Clasif. en dominio A | Clasif. en dominio B | Resolución |
|---|---|---|---|
| **Ionicons** (paquete npm + render `ion-icon name=`) | **UI**: "Iconos Ionicons built-in" → **Minor** (mapeo mecánico a `@expo/vector-icons`) | **Deps**: "ionicons + addIcons" → **Rewrite** (eliminar paquete + CDN + `addIcons` huérfano) | **DUPLICACIÓN REAL.** Es el mismo paquete/uso. Se cuenta **una vez** en **Deps como Rewrite** (la acción dominante es eliminar el paquete y la carga por CDN; el re-mapeo de nombres es la parte mecánica que vive dentro de esa misma decisión). **Efecto en conteos: −1 ítem Minor.** Total 157→156. |
| **Chart.js / Areachart** | **UI**: `AreachartComponent` → Rewrite (componente, lógica de datasets/tooltips) | **Deps**: `chart.js` → Rewrite (librería, swap a victory-native) | **NO es duplicación**: son dos artefactos distintos (el componente a reescribir vs la decisión de librería). **Ambos se cuentan.** Coinciden en clasificación, así que no hay conflicto que resolver. |
| **DOMPurify / SafeHtmlPipe** | **UI**: `SafeHtmlPipe` → Rewrite (código del pipe + whitelist) | **Deps**: `dompurify` → Rewrite (librería → `sanitize-html`) | **NO es duplicación**: el pipe (código propio) y la librería (decisión de reemplazo) son artefactos distintos. **Ambos se cuentan.** Sin conflicto de clasificación. |
| **html-to-image / Reporte ambiental** | **UI**: `EnvironmentalReportComponent` → Rewrite · **Lógica**: `environmental-report.service` → Rewrite | **Deps**: `html-to-image` → Rewrite | **NO es duplicación**: componente (render headless), servicio (agregación+orquestación) y librería son tres artefactos distintos del mismo feature. **Los tres se cuentan.** Sin conflicto de clasificación. |
| **`@capacitor/network` / NetInfo** | — | **Deps**: plugin → Rewrite (eliminar); NetInfo nuevo por requisito del Hub | Sin solapamiento entre dominios; sólo se aclara que **NetInfo no es el reemplazo del plugin** sino un requisito de Amplify (R-04). Una sola fila. |
| **Los dos `NotificationService`** | **Lógica**: badge → Major · push → Rewrite | — | **NO es duplicación**: son **dos archivos físicos distintos** con responsabilidades opuestas. Ambos se cuentan; se renombran (§4.3). |
| **`date-fns` / calendario** | **UI**: lógica de `CalendarComponent` reusa date-fns | **Deps**: `date-fns` → Reusable | **NO es duplicación**: el componente es la pieza de UI; date-fns es la dependencia que conserva. Sin conflicto (ambos lo tratan como reutilizable). |

**Resultado del saneo:** una única corrección de conteo (Ionicons, −1 Minor). Todos los demás solapamientos son artefactos relacionados pero distintos, con clasificaciones coherentes entre dominios. **Total maestro deduplicado: 156 ítems** (Reusable 16 · Minor 21 · Major 27 · Rewrite 92).

---

## 6. Glosario de equivalencias rápidas (cheatsheet)

`@ionic/angular`→RN nativo · `IonModal`/`ModalController`→`@gorhom/bottom-sheet` · `AlertController`→`Alert.alert`/modal custom · `ToastController`→`react-native-toast-message` · `LoadingController`→`ActivityIndicator` · `AnimationController`→`react-native-reanimated` · `ionViewWillEnter`→`useFocusEffect` · Angular Router→React Navigation v6 (navegador condicional por auth) · `Chart.js`→`victory-native` · `html-to-image`→`react-native-view-shot` · `DomSanitizer`/`DOMPurify`→`react-native-render-html`+`sanitize-html` · `@capacitor/preferences`→AsyncStorage/expo-secure-store · `@capacitor/filesystem`→`expo-file-system` · `@capacitor/local-notifications`→`expo-notifications` · `@capacitor/share`→`react-native-share`/`expo-sharing` · `@capacitor/device`→`expo-device`/`Platform.Version` · `Capacitor.getPlatform`→`Platform.OS` · CSS vars (`setProperty`)→`ThemeProvider`+`useTheme` · variable fonts→pesos estáticos + `expo-font` · SVG→`react-native-svg` · GIF→`expo-image` · Karma/Jasmine→Jest+jest-expo+RN Testing Library · Gradle/Capacitor build→`expo prebuild`+EAS · keystore en git→EAS Managed Credentials.

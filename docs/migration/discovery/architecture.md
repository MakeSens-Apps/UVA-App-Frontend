# Discovery — Arquitectura y arranque (UVA App)

> Fase 1 — Inventario para migración Ionic/Angular → React Native (Expo + Development Builds, React Navigation).
> Documento de solo lectura. Referencias `archivo:línea` verificadas sobre el código actual.
> Objetivo: que otro agente reconstruya bootstrap + navegación completa en React Navigation sin volver a leer el código fuente.

---

## 0. Stack verificado (relevante al bootstrap)

Fuente: `package.json`, `capacitor.config.ts`.

- Angular 18 (`@angular/core ^18.0.0`) con **standalone components** (no NgModules).
- Ionic Angular 8 (`@ionic/angular ^8.0.0`) usando el subpath `@ionic/angular/standalone`.
- Capacitor 6 (`@capacitor/core ^6.1.2`), target Android (`@capacitor/android 6.1.2`). `capacitor.config.ts:4-6`: `appId: 'com.makesens.uvaapp'`, `appName: 'UVA'`, `webDir: 'www'`.
- AWS Amplify v6 (`aws-amplify ^6.8.2`) + DataStore v5 (`@aws-amplify/datastore ^5.0.60`).
- `zone.js ~0.14.2` (Angular change detection; **no existe en React Native** — ver Riesgos).
- Plugins Capacitor en uso (impactan migración a APIs Expo/RN):
  `@capacitor/app` (minimizar + back button), `@capacitor/preferences` (sesión/persistencia clave-valor), `@capacitor/filesystem`, `@capacitor/network`, `@capacitor/local-notifications`, `@capacitor/device`, `@capacitor/share`, `@capacitor/clipboard`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/splash-screen`, `@capacitor/status-bar`.

---

## 1. Bootstrap completo

### 1.1 `src/main.ts` (punto de entrada)

`src/main.ts:1-27`. No hay `AppModule`; se usa `bootstrapApplication` (API standalone de Angular 18).

Secuencia exacta de arranque:
1. `src/main.ts:16` importa `config` desde `./amplifyconfiguration.json`.
2. `src/main.ts:19` **`Amplify.configure(config)` se ejecuta a nivel de módulo, ANTES del bootstrap** (comentario en `:18` dice "Configurar Amplify sin DataStore"). Es lo primero que corre.
3. `src/main.ts:21-27` `bootstrapApplication(AppComponent, { providers: [...] })` con tres providers globales:
   - `{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }` (`:23`) — estrategia de reutilización de rutas de Ionic (mantiene páginas vivas al cambiar de tab). **No tiene equivalente directo en React Navigation; el "tab mantiene estado" se obtiene por defecto con un Bottom Tab Navigator.**
   - `provideIonicAngular()` (`:24`) — inicializa Ionic.
   - `provideRouter(routes, withPreloading(PreloadAllModules))` (`:25`) — router de Angular con **precarga de TODOS los módulos lazy** (`PreloadAllModules`).

No hay otros providers globales (ni HttpClient, ni interceptores, ni providers de animación explícitos). Toda la inyección de servicios es vía `@Injectable({ providedIn: 'root' })`.

### 1.2 `src/polyfills.ts` (carga antes de la app)

`src/polyfills.ts`. Importa `./zone-flags` (`:45`) y `zone.js` (`:50`). **El cambio de detección de Angular depende de zone.js**, que NO existe en React Native.

### 1.3 `amplifyconfiguration.json` (config de backend)

`src/amplifyconfiguration.json`. Contenido verificado:
- `aws_project_region: "us-east-1"`.
- Analytics Pinpoint: `aws_mobile_analytics_app_id: "8342a7773127441e8542486c17a96572"` (usado por `configureAutoTrack`, §3.2).
- AppSync GraphQL endpoint: `https://swmmbj4xmfa5pelhgbljkxonuu.appsync-api.us-east-1.amazonaws.com/graphql`, auth `AMAZON_COGNITO_USER_POOLS`, con `aws_appsync_apiKey` presente.
- Cognito: `aws_user_pools_id: "us-east-1_kIEbum0qE"`, `aws_user_pools_web_client_id: "5l1s62cf25qi33oisq334335pn"`, `aws_cognito_identity_pool_id: "us-east-1:4dc52da2-..."`.
- **Username por teléfono**: `aws_cognito_username_attributes: ["PHONE_NUMBER"]`.
- Signup attrs: `FAMILY_NAME`, `NAME`, `PHONE_NUMBER`.
- **MFA OBLIGATORIO por SMS**: `aws_cognito_mfa_configuration: "ON"`, `aws_cognito_mfa_types: ["SMS"]`.
- Política de contraseña: `passwordPolicyMinLength: 8` (la app usa el propio número de teléfono como password, §4).
- S3: `aws_user_files_s3_bucket: "uvav20df3ae4a64104e4481062c143641f849d454f-develop"`.

> Nota: existe también `src/aws-exports.js` (legacy de Amplify). `main.ts` solo importa `amplifyconfiguration.json`; `aws-exports.js` NO se importa en el bootstrap. La fuente de verdad efectiva es `amplifyconfiguration.json`.

### 1.4 Environments

`src/environments/`. Solo dos archivos, mínimos:
- `environment.ts:5-7` → `{ production: false }`.
- `environment.prod.ts:1-3` → `{ production: true }`.

El reemplazo dev→prod lo hace `ng build` vía `fileReplacements` en `angular.json` (comentario `environment.ts:1-3`). **El único uso funcional de `environment.production`** está en `app.component.ts:138` (`if (!environment.production)`) para exponer utilidades de debug en `window.debugGamification`. No hay URLs ni secretos por entorno — toda la config de backend vive en `amplifyconfiguration.json`. En RN/Expo esto se traduce a `__DEV__` o variable de entorno; no requiere infraestructura de environments compleja.

---

## 2. Shell de la aplicación

### 2.1 `AppComponent` (`app.component.ts` / `app.component.html`)

`app.component.html:1-4`: el shell es literalmente:
```html
<ion-app>
  <ion-router-outlet></ion-router-outlet>
</ion-app>
```
`app.component.ts:14-19`: `selector: 'app-root'`, standalone, importa `IonApp`, `IonRouterOutlet`, `RouterModule`. **No hay UI propia**: solo el outlet raíz. En React Navigation equivale al `NavigationContainer` + stack raíz.

El `constructor` de `AppComponent` (`app.component.ts:30-63`) ejecuta toda la inicialización global (en RN iría en el `App.tsx` raíz / un provider de arranque):

1. **`DataStore.configure({ syncExpressions: [...] })`** (`app.component.ts:39-48`): define qué se sincroniza desde la nube:
   - `GamificationEvent`: solo los que `isUnclean.eq(true)`.
   - `AppUsageEvent`: `id.eq('')` → **nunca** baja datos de `AppUsageEvent` desde la nube (solo sube).
2. `this.configuration.loadBranding()` (`:50`) — carga colores de branding desde S3/filesystem y los aplica como CSS variables (§5).
3. `platform.ready().then(...)` (`:51-61`): tras `Platform.ready()` (Ionic) ejecuta:
   - `SyncMonitorDSService.subscribeToSync()` (`:54`) — suscribe al Hub de DataStore/Auth (§6).
   - `appMinimizeService.initializeBackButtonHandler()` (`:55`) — registra el handler del botón atrás de Android (§7).
   - `this.initializeNavigationTracking()` (`:56`) — tracking de navegación (§3.1).
   - `this.initializeDebugUtilities()` (`:57`) — debug solo en dev (§1.4).
4. `this.initAutoTrack()` (`:62`) — analytics de Pinpoint (§3.2).

### 2.2 Navegación principal por tabs — `pages/tabs/`

**Rutas hijas** (`pages/tabs/tabs.routes.ts:4-45`): el path raíz `tabs` carga `TabsPage` como contenedor y define hijos lazy:

| Path hijo | Componente cargado | Archivo |
|---|---|---|
| `tabs/home` | `HomePage` | `../home/home.page` |
| `tabs/moon-phase` | `MoonPhasePage` | `../../pages/moon-phase/moon-phase.page` |
| `tabs/register` | `MeasurementPage` | `../measurement/measurement.page` |
| `tabs/history` | `HistoricalPage` | `../historical/historical.page` |
| `tabs/''` (default) | redirect → `/tabs/home` (`pathMatch:'full'`) | `tabs.routes.ts:33-37` |
| `''` (raíz módulo) | redirect → `/tabs/home` | `tabs.routes.ts:40-44` |

**IMPORTANTE — desajuste tabs visibles vs rutas hijas:** la barra (`tabs.page.html:1-27`) solo muestra **3 botones**:
- `home` → `/tabs/home`, icono `assets/images/icons/home.svg`, label "Inicio".
- `register` → `/tabs/register`, icono `clipboard-check.svg`, label "Registrar".
- `history` → `/tabs/history`, icono `calendar.svg`, label "Historial".

`tabs/moon-phase` ES ruta hija del tab outlet pero **NO tiene botón en la tab bar** — se navega programáticamente desde Home (`home.page.ts:175` → `router.navigate(['/app/tabs/moon-phase'])`). En RN: pantalla dentro del stack del tab Home (recomendado) o tab oculto.

`tabs.page.ts:12-28`: `TabsPage` standalone, importa `IonTabs/IonTabBar/IonTabButton/IonIcon/IonLabel`; en constructor `addIcons({ triangle, ellipse, square })` (registrados pero la tab bar usa SVGs propios, no estos). Equivalente RN: `createBottomTabNavigator`.

### 2.3 Splash — `pages/splash-animation/`

`splash-animation.page.ts`. Es la **ruta vacía `''`** (§9) y funciona como **gate de arranque + decisión de sesión** (§4). Standalone, importa `IonContent/IonHeader/IonTitle/IonToolbar` + `CommonModule`/`FormsModule` (`:26-34`).

- Anima 3 elementos (`.leaf-icon`, `.powered-by`, `.make-sens-logo`) vía `AnimationController` de Ionic (`setupAnimations()` `:242-274`, `playAnimations()` `:281-294`). En RN se reimplementa con `Animated`/`react-native-reanimated`.
- `ngOnInit` (`:60-64`): lanza `setupAnimations()` y `await checkUserAuthentication()` (decisión de routing).
- `redirectToPage(path)` (`:223-226`) espera a que termine la animación (`waitForAnimationToEnd()`, polling de un flag cada 100ms `:206-215`) antes de `router.navigate([path])`. **Navegación acoplada a un flag de fin de animación** que conviene desacoplar en RN.

---

## 3. Cross-cutting al arranque (en `AppComponent`)

### 3.1 Tracking de navegación

`app.component.ts:101-130`. Se suscribe a `router.events` filtrando `NavigationEnd` (`:102-104`), deriva `screenName` de la URL (`getScreenNameFromUrl` `:116-130`: quita query/hash, trata `tabs/home` como `home`, toma el último segmento ignorando `tabs`) y llama `appUsageService.trackNavigation(screenName)`. **En React Navigation se reemplaza por `onStateChange`/`__getCurrentRoute` del `NavigationContainer`.**

### 3.2 Analytics Pinpoint (`initAutoTrack`)

`app.component.ts:69-95`. `configureAutoTrack` de `aws-amplify/analytics` dos veces: tipo `session` (`:70-78`) y tipo `pageView` (`:79-94`). El `pageView` usa `urlProvider: () => window.location.origin + window.location.pathname` (`:90-92`) — **depende de `window.location`, que no existe en RN**; sustituir el provider de URL por el estado de React Navigation.

---

## 4. Flujo de inicialización de sesión y decisión de routing

Pieza central que decide **login vs registro vs home**. Concentrada en `SplashAnimationPage.checkUserAuthentication()` + `continueWithAuthenticatedFlow()`.

### 4.1 Decisión en el splash — `checkUserAuthentication()` (`splash-animation.page.ts:71-142`)

Estrategia **offline-first**. Pasos:
1. `await SyncMonitorDSService.waitForSyncDataStore()` (`:77`) — bloquea hasta que DataStore esté en estado `READY` (§6).
2. `const localUser = await UserDSService.getUser()` (`:80`).
3. **Si hay usuario local** (`:82`):
   - **Con red** (`SyncMonitorDSService.networkStatus`, `:86`): `auth.CurrentAuthenticatedUser()` (`:90`). Si falla (`!response.success` o throw) → `redirectToPage('/login')` (`:95`, `:106`). Si OK → `continueWithAuthenticatedFlow(response.data.userId)` (`:102`).
   - **Sin red** (`:109-121`): lee `session.getInfo()`; si hay `userID` → `continueWithAuthenticatedFlow(sessionInfo.userID)`; si no → `/login`.
4. **Si NO hay usuario local** (`:122`): exige auth fresca `auth.CurrentAuthenticatedUser()` (`:128`); si falla → `/login`; si OK → `continueWithAuthenticatedFlow(...)`.
5. Cualquier excepción global → `/login` (`:138-141`).

### 4.2 Validación de UVA/RACIMO — `continueWithAuthenticatedFlow(userID)` (`splash-animation.page.ts:148-199`)

1. Guarda `session.setInfoField('userID', userID)` (`:152`).
2. `uva = await UvaDSService.getUVAByuserID(userID)` (`:156`). **Sin UVA** → `redirectToPage('register/validate-project')` (`:159`).
3. `racimoID = uva.racimoID ?? ''`. **Sin racimoID** → `register/validate-project` (`:167`).
4. Re-chequeo redundante `UserDSService.getUser()` (`:172`): si no existe, retorna sin navegar (`:175`, estado inconsistente).
5. `racimoCode = await RacimoDSService.getRacimoCode(racimoID)` (`:180`):
   - **Con código** → guarda en sesión `uvaID`, `racimoID`, `racimoLinkCode` (`:184-186`) y navega a **`app/tabs/home`** (`:188`).
   - **Sin código** → `register/validate-project` (`:193`).
6. Excepción → `/login` (`:197`).

**Decisión de arranque (a reconstruir en RN como un "AuthGate"):**
```
splash → checkUserAuthentication
  ├─ no auth válida / error                → /login
  └─ auth OK → continueWithAuthenticatedFlow
       ├─ sin UVA / sin racimoID / sin code → register/validate-project
       └─ todo OK                           → app/tabs/home
```

### 4.3 Servicio de sesión — `core/services/session/session.service.ts`

Persistencia sobre **`@capacitor/preferences`** (clave-valor). Modelo `src/models/session.model.ts:1-23`: `Session { userID, name, lastName, phone, racimoID, uvaID, racimoName, racimoLinkCode, racimoConfiguration }` y `sessionKeys` (lista para iterar).
- `setInfo(userInfo)` (`session.service.ts:16-23`): guarda cada campo truthy.
- `getInfo()` (`:30-44`): lee todos los `sessionKeys` desde Preferences.
- `setInfoField(key, value)` (`:52-67`): set, o remove si `undefined`.
- `clearSession()` (`:74-76`): `Preferences.clear()` (usado en logout).
**Migración:** `@capacitor/preferences` → `@react-native-async-storage/async-storage` o `expo-secure-store` (datos sensibles). API casi 1:1.

### 4.4 Servicios de setup — `core/services/view/setup/`

- **`setup.service.ts`** (`SetupService`): orquesta auth + sesión + creación de usuario. `signIn(phone)` (`:52-62`, guarda `phone`; si ya queda firmado llama `currentAuthenticatedUser`), `confirmSignIn(code)` (`:70-76`), `signUp(phone)` (`:118-135`, toma `name`/`lastName` de sesión; si `UsernameExistsException` reenvía código), `confirmSignUp(code)` (`:143-150`), `currentAuthenticatedUser()` (`:170-182`, vuelca atributos Cognito a sesión), `createNewUser()` (`:189-220`, verifica con `userAPI.getUser`, crea usuario y `userProgressAPI.createUserProgress({Seed:0, Streak:0})`), `signOut()` (`:41-44`). Sin lógica de UI/navegación → migra tal cual.
- **`setup-racimo.service.ts`** (`SetupRacimoService`): vinculación a RACIMO/UVA. `getUVA(userId)` (`:77-111`, guarda `racimoID/uvaID/racimoLinkCode`), `createNewUVA()` (`:117-151`, genera id `UVA_{codeRacimo}_{NNNNN}` autoincremental), `updateUVA(...)` (`:161-179`), `getRACIMOByCode(linkageCode)` (`:186-208`), `getRACIMOByID(id)` (`:215-233`, guarda `racimoName/racimoLinkCode/racimoConfiguration`). Lógica pura sobre APIs GraphQL → migra tal cual.

---

## 5. Branding dinámico al arranque — `ConfigurationAppService`

`core/services/storage/configuration-app.service.ts`. Invocado en `AppComponent` (`loadBranding()`) y en el flujo de vinculación. Descarga config del RACIMO desde S3 (`basePath='public/racimos'`, `:15`) al filesystem local y aplica colores.
- `applyColors(colors)` (`:273-285`): **escribe CSS custom properties en `document.documentElement.style`** (`--{key}`). **NO existe en RN** — el theming dinámico por RACIMO debe reimplementarse con un `ThemeContext`/tokens en JS.
- `loadImage(pathFile)` (`:189-203`): ramifica por `Capacitor.getPlatform()` (android/ios → `convertFileSrc(uri)`; web → Blob URL). En RN se usan `file://` URIs de `expo-file-system`.
- `getPathRacimo()` (`:292-299`): construye la ruta usando `session.racimoLinkCode`.
**Migración:** depende de `@capacitor/filesystem` + S3 + `document`. La capa de descarga es portable; la aplicación de colores y la resolución de imágenes hay que reescribirlas para RN.

---

## 6. Sincronización DataStore — `SyncMonitorDSService`

`core/services/storage/datastore/sync-monitor-ds.service.ts`. Estado global **estático** (`static state`, `static networkStatus`).
- Enum `STATE_SYNC_DS` (`:6-11`): `NOINIT, UNSYNC, SYNC, READY`.
- `subscribeToSync()` (`:36-79`): `Hub.listen('datastore', ...)` mapea eventos → estado: `networkStatus`→`networkStatus`; `outboxMutationEnqueued`→`UNSYNC`; `outboxMutationProcessed`→limpia `AppUsageEvent` sincronizados; `syncQueriesReady`→`SYNC`; `ready`→`READY`. También `Hub.listen('auth', ...)` (`:72-77`): en `signedOut` → `DataStore.clear()`.
- `waitForSyncDataStore()` (`:96-106`): `await DataStore.start()` y **polling cada 100ms** hasta `state === READY`. Es el gate que bloquea el splash (§4.1) y la vinculación de proyecto.
**Migración:** Amplify DataStore + Hub funcionan en RN con `@aws-amplify/datastore` (mismo paquete). El patrón Hub/estado es portable; el bloqueo por polling conviene convertirlo a promesa basada en eventos.

---

## 7. Minimizar y botón atrás de Android — `AppMinimizeService`

`core/services/minimize/app-minimize.service.ts`.
- `routesToMinimize` (`:14-21`): rutas donde el back de Android **minimiza la app en vez de retroceder**: `/pre-register`, `/register`, `/home`, `/login`, `/otp`, `/app/tabs/register`. La comparación es por `includes()` (`shouldMinimizeApp` `:49-54`) → **coincidencia por substring** (cualquier URL que contenga esas cadenas minimiza).
- `appMinimize()` (`:38-40`): `App.minimizeApp()` de `@capacitor/app`.
- `initializeBackButtonHandler()` (`:62-71`): `platform.backButton.subscribeWithPriority(10, ...)`; si la ruta actual está en la lista → `appMinimize()`, si no → `window.history.back()`.
**Migración:** `Platform.backButton` (Ionic) + `App.minimizeApp` (Capacitor) → `BackHandler` de RN + módulo nativo para minimizar (Expo no expone una API JS estándar de "minimizar"; requiere módulo nativo o `BackHandler.exitApp()` con matices). `window.history.back()` → `navigation.goBack()`. **La lista de rutas-a-minimizar debe traducirse a nombres de pantalla de React Navigation.**

---

## 8. Patrones de navegación usados en el código

Verificado por grep exhaustivo sobre `src/app` (excluyendo `.spec.ts`).

- **NavController de Ionic: NO se usa en ningún sitio** (0 ocurrencias). Toda la navegación es **Angular `Router`** + **`ModalController` para modales**.
- **`router.navigate([...])` / `navigateByUrl`**: 41 llamadas. Listado completo (archivo:línea → destino):
  - `components/header/header.component.ts:86` → `/profile`; `:113` → `[url]` (back genérico configurable).
  - `pages/home/home.page.ts:175` → `/app/tabs/moon-phase`; `:207` → `measurement-detail` con `queryParams:{...$event, origin:'home'}`.
  - `pages/splash-animation/splash-animation.page.ts:225` → `[path]` (destino dinámico §4).
  - `pages/measurement/measurement.page.ts:378` → `''` con `{replaceUrl:true}` (logout); `:400` → `register-measurement-new` con `queryParams:{flowId, taskId}`.
  - `pages/measurement/register-measurement/register-measurement.page.ts:495` → `app/tabs/register` con `queryParams:{update:true}` (+ `location.go` + `window.location.reload()` forzado, `:502-503`); `:538` → `register-measurement-new` con `queryParams:{flowId, taskId, backButtom:false}`.
  - `pages/auth/otp/otp.page.ts:187` y `:214` → `/otp/{type}/{phone}/validate-code`; `:233` → `/login`.
  - `pages/auth/otp/validate-code/validate-code.page.ts:37` → `register/project-vinculation` (si `type==login`); `:40` → `register-success` (si `type==register`).
  - `pages/auth/register/register.page.ts:72` → `register/set-phone-register`.
  - `pages/auth/register/register-completed/register-completed.page.ts:36` → `app/tabs/home` (auto tras 3s).
  - `pages/auth/register/register-success/register-success.page.ts:29` → `/login` con `navigateByUrl(..., {replaceUrl:true})`.
  - `pages/auth/register/project-vinculation-done/project-vinculation-done.page.ts:44` → `register/register-project-form` (auto tras 3s).
  - `pages/auth/register/set-phone-register/set-phone-register.page.ts:111` → `otp/register/{phone}`.
  - `pages/auth/register/register-project-form/register-project-form.page.ts:68`/`:115` → `register/register-completed`; `:117` → `register/register-project-form`.
  - `pages/auth/register/project-vinculation/project-vinculation.page.ts:86`/`:107` → `register/validate-project`; `:89` → `app/tabs/home`.
  - `pages/auth/register/pre-register/pre-register.page.ts:58` → `register`.
  - `pages/auth/register/validate-project/validate-project.page.ts:77` → `register/project-vinculation-done`; `:79` → `register/project-vinculation`.
  - `pages/auth/login/login.page.ts:74` → `app/tabs/home`; `:82` → `pre-register`; `:127` → `register/project-vinculation`; `:129` → `otp/login/{phone}`.
  - `pages/historical/historical.page.ts:299` → `measurement-detail` con `queryParams:{...$event, origin:'history'}`.
  - `pages/profile/profile.page.ts:238` → `''` con `{replaceUrl:true}` (logout); `:243` → `[url]`.
  - `pages/profile/configuration/configuration.page.ts:203` → `[url]`.
  - `pages/profile/achievement/achievement.page.ts:85` → `[url]`.
  - `pages/profile/alerts/alerts.page.ts:55` → `/configuration`; `:63` → `[url]`.
  - `pages/profile/personal-info/personal-info.page.ts:362` → `[url]`.

- **`routerLink` en templates** (solo 3, todos en auth):
  - `pages/auth/otp/otp.page.html:47` → `/login`.
  - `pages/auth/register/project-vinculation/project-vinculation.page.html:33` → `/login`.
  - `pages/auth/register/validate-project/validate-project.page.html:6` → `/register/project-vinculation`.

- **Paso de datos entre pantallas — DOS mecanismos** (no se usa Router `state`):
  1. **Path params**: solo en OTP. `routes` define `otp/:type/:phone` y `otp/:type/:phone/validate-code` (`app.routes.ts:27`, `:46`). Se leen con `route.snapshot.paramMap.get('type'|'phone')` (`otp.page.ts:68-69`, `validate-code.page.ts:26`).
  2. **`queryParams`**: `measurement-detail` (`{...evento, origin}`), `register-measurement-new` (`{flowId, taskId, backButtom}`), `app/tabs/register` (`{update:true}`). Se leen con `route.queryParams.subscribe(...)` (`register-measurement.page.ts:136`, `measurement-detail.page.ts:116`). **No se usa `getCurrentNavigation().extras.state`** — todo va por path o query, lo que facilita el mapeo a `route.params` de React Navigation.

- **Modales como flujo (no navegación de stack)**. `ModalController` en 6 archivos: `components/alert/alert.component.ts`, `pages/measurement/guide-measurement/guide-measurement.component.ts`, `pages/measurement/register-measurement/register-measurement.page.ts`, `pages/auth/register/set-phone-register/set-phone-register.page.ts`, `pages/auth/login/login.page.ts`, `pages/historical/measurement-detail/measurement-detail.page.ts`. Patrones:
  - **Confirmación con `AlertComponent`** (login `:98-142`, set-phone `:88-...`): `modalCtrl.create({component: AlertComponent, componentProps:{content, textCancelButton, textOkButton}, cssClass:'custom-modal', backdropDismiss:false})`, luego `modal.onDidDismiss().then(data => if data.data.action==='OK' …)` y `modal.present()`. **El resultado del modal controla la navegación posterior** (login `:127`/`:129` decide `project-vinculation` vs `otp/login` según MFA).
  - **Guía de medición** (`register-measurement.page.ts:204-225`): `modalCtrl.create({component: GuideMeasurementComponent, cssClass:'modal-fullscreen', initialBreakpoint:1, breakpoints:[0,1]})` (sheet con breakpoints); recursión por `data.nextGuide` para encadenar guías.
  - **`AlertController` de Ionic** (no ModalController): `otp.page.ts:192-201` para errores ("No se pudo crear el usuario").
  **Migración:** son **diálogos/sheets superpuestos**, no pantallas del stack. En React Navigation: Modal group (`{ presentation:'modal' }`/`'transparentModal'`) o `Alert`/`react-native-modal`. El patrón "el modal devuelve un valor que decide la navegación" se reimplementa con callbacks/promesas (o un Context de diálogos).

- **Back button configurable por header** (`HeaderComponent`): `@Input() hasBackButton`, `@Input() routerBackButton='/'` (`header.component.ts:54-61`), `goBack(url)` → `router.navigate([url])` (`:109-114`). **No usa `goBack()` real; siempre navega a una URL fija configurada.** En RN se mapea a un header con `onPress` → `navigation.navigate(targetRoute)`.

- **Recargas forzadas / `replaceUrl`**: logout usa `navigate([''], {replaceUrl:true})` (`measurement.page.ts:378`, `profile.page.ts:238`) para volver al splash sin historial. El cierre del flujo de medición fuerza `window.location.reload()` (`register-measurement.page.ts:503`). **`window.location.reload()` NO existe en RN** — reemplazar por `navigation.reset(...)`.

---

## 9. Árbol de navegación COMPLETO (a reconstruir en React Navigation)

### 9.1 Rutas raíz — `src/app/app.routes.ts`

Todas son **`loadComponent` lazy standalone**. **No hay guards `canActivate`/`canMatch`/`canLoad` ni resolvers** — la "protección" la hace el splash en runtime. Listado exhaustivo (`app.routes.ts:3-165`):

| Path | Componente | Notas |
|---|---|---|
| `app` | lazy → `pages/tabs/tabs.routes` | `:4-8` — contiene el tab navigator |
| `''` (raíz) | `SplashAnimationPage` | `:14-20` — **gate de arranque** |
| `login` | `LoginPage` | `:9-13` |
| `register` | `RegisterPage` | `:21-25` |
| `pre-register` | `PreRegisterPage` | `:31-37` |
| `register/set-phone-register` | `SetPhoneRegisterPage` | `:38-44` |
| `otp/:type/:phone` | `OtpPage` | `:26-30` — **params `type`, `phone`** |
| `otp/:type/:phone/validate-code` | `ValidateCodePage` | `:45-51` — **params `type`, `phone`** |
| `register/project-vinculation` | `ProjectVinculationPage` | `:52-58` |
| `register/validate-project` | `ValidateProjectPage` | `:59-65` |
| `register/project-vinculation-done` | `ProjectVinculationDonePage` | `:66-72` |
| `register/register-project-form` | `RegisterProjectFormPage` | `:73-79` |
| `register/register-completed` | `RegisterCompletedPage` | `:80-86` |
| `register-success` | `RegisterSuccessPage` | `:158-164` |
| `home` | `MeasurementPage` | `:87-93` — **alias suelto a Measurement (¡no es el Home real!)** |
| `profile` | `ProfilePage` | `:94-98` |
| `achievement` | `AchievementPage` | `:99-105` |
| `configuration` | `ConfigurationPage` | `:106-112` |
| `personal-info` | `PersonalInfoPage` | `:113-119` |
| `alerts` | `AlertsPage` | `:120-124` |
| `alerts/creation` | `CreationPage` | `:125-131` |
| `measurement-detail` | `MeasurementDetailPage` | `:132-138` — query `{...evento, origin}` |
| `moon-phase` | `MoonPhasePage` | `:139-143` — (también existe como hija de tabs) |
| `register-measurement` | `RegisterMeasurementPage` | `:144-150` |
| `register-measurement-new` | `RegisterMeasurementPage` | `:151-157` — **mismo componente que `register-measurement`**, query `{flowId, taskId, backButtom?}` |

> Observación: varias páginas existen **dos veces** (raíz y dentro de tabs): `moon-phase`, `register`/`MeasurementPage` y `home`. El path raíz `home` carga `MeasurementPage` (NO `HomePage`); `HomePage` solo es accesible vía `app/tabs/home`. **Ambigüedad/deuda a resolver al diseñar el navegador RN** (una única ubicación canónica por pantalla).

### 9.2 Diagrama de navegación (flujos)

```
[ '' SplashAnimationPage ]  (gate de arranque, decide destino — §4)
   ├── auth OK + UVA/racimo/code OK ────────────► app/tabs/home
   ├── auth OK pero falta UVA/racimo/code ──────► register/validate-project
   └── sin auth / error ────────────────────────► /login

AUTH STACK
  /login (LoginPage)
   ├── modal AlertComponent confirma teléfono
   │    ├── signIn OK + isSignedIn (MFA ya cubierto) → register/project-vinculation
   │    ├── signIn OK + requiere OTP                 → otp/login/:phone
   │    └── UserNotFound → modal "¿registrarte?" OK  → pre-register
   └── goToHome()                                     → app/tabs/home

  pre-register (PreRegisterPage)
   └── → register (RegisterPage)
        └── → register/set-phone-register (SetPhoneRegisterPage)
             └── modal confirma teléfono → signUp OK → otp/register/:phone

  otp/:type/:phone (OtpPage)   [type ∈ {login, register}]
   ├── login:  confirmSignIn + createNewUser OK → otp/login/:phone/validate-code
   ├── register: confirmSignUp OK               → otp/register/:phone/validate-code
   └── routerLink /login

  otp/:type/:phone/validate-code (ValidateCodePage)  [auto tras 2s]
   ├── type==login    → register/project-vinculation
   └── type==register → register-success

  register-success (RegisterSuccessPage)
   └── (acción) navigateByUrl /login {replaceUrl}

REGISTRO / VINCULACIÓN A RACIMO
  register/project-vinculation (ProjectVinculationPage)
   ├── ngOnInit: si ya hay UVA → (configExists?) → validate-project | app/tabs/home
   ├── goToValidateProject(): getRACIMOByCode OK → register/validate-project (code inválido: error inline)
   └── routerLink /login

  register/validate-project (ValidateProjectPage)  [descarga config+lunaciones, espera 2s]
   ├── descargas OK → register/project-vinculation-done
   ├── descargas fallan → register/project-vinculation
   └── routerLink /register/project-vinculation

  register/project-vinculation-done (ProjectVinculationDonePage)  [auto tras 3s]
   └── → register/register-project-form

  register/register-project-form (RegisterProjectFormPage)
   ├── si UVA ya existe → register/register-completed
   ├── submit OK (createUVA+updateUVA) → register/register-completed
   └── submit fallo → register/register-project-form

  register/register-completed (RegisterCompletedPage)  [auto tras 3s]
   └── → app/tabs/home

APP PRINCIPAL (tab navigator bajo 'app')
  app/tabs/  (TabsPage = bottom tab bar, 3 botones)
   ├── [tab] home    → app/tabs/home    (HomePage)
   │     ├── → /app/tabs/moon-phase  (tarjeta luna — tab SIN botón)
   │     └── → measurement-detail  query {...evento, origin:'home'}
   ├── [tab] register→ app/tabs/register (MeasurementPage = registrar medición)
   │     ├── goToRegister(task) → register-measurement-new query {flowId, taskId}
   │     ├── (modal guía GuideMeasurementComponent)
   │     ├── flujo OK → app/tabs/register query {update:true} (+ reload forzado)
   │     └── logout → '' (splash) {replaceUrl}
   ├── [tab] history → app/tabs/history (HistoricalPage)
   │     └── → measurement-detail  query {...evento, origin:'history'}
   └── (hija sin botón) moon-phase → app/tabs/moon-phase (MoonPhasePage)

  register-measurement / register-measurement-new (RegisterMeasurementPage)
   ├── lee query {flowId, taskId, backButtom}
   ├── encadena flujos → register-measurement-new query {flowId:nextFlow, taskId}
   └── fin → app/tabs/register query {update:true}

PERFIL (rutas raíz; entrada app-wide vía HeaderComponent.goToProfile → /profile)
  /profile (ProfilePage)
   ├── → /personal-info (PersonalInfoPage)
   ├── → /achievement   (AchievementPage)
   ├── → /configuration (ConfigurationPage)
   │       └── → /alerts (AlertsPage) → /alerts/creation (CreationPage)
   ├── → /alerts        (AlertsPage)  ← alerts.page navega a /configuration y a [url]
   └── logout → '' (splash) {replaceUrl}

  /achievement, /configuration, /personal-info, /alerts, /alerts/creation, /moon-phase, /measurement-detail
   → back genérico vía HeaderComponent.goBack(routerBackButton)
```

### 9.3 Guards / redirects / params (resumen)

- **Guards de ruta Angular: NINGUNO.** No hay `canActivate`/`canMatch`/`canLoad` ni resolvers. La protección de sesión es **imperativa** en `SplashAnimationPage` y reverificaciones puntuales (p.ej. `ProjectVinculationPage.ngOnInit`). En RN se modela como **navegador condicional raíz** (Auth stack vs App stack) gobernado por un estado de sesión, o un AuthGate que decide la pantalla inicial.
- **Redirects declarativos:** solo dentro de tabs (`tabs/'' → /tabs/home` y `'' → /tabs/home`, `tabs.routes.ts:33-44`).
- **Params:** path params `type`/`phone` en `otp/...`; query params `origin` (`measurement-detail`), `flowId`/`taskId`/`backButtom` (`register-measurement-new`), `update` (`app/tabs/register`), y el spread del objeto de evento `{...$event}` en `measurement-detail`.
- **Navegaciones automáticas por temporizador** (modelar como efecto + `navigation.replace`): `validate-code` (2s), `project-vinculation-done` (3s), `register-completed` (3s), `validate-project` (espera mínima 2s).

---

## 10. Notas de verificación (lo que NO existe / supuestos a confirmar)

- **No existe `aws-exports.js` importado en bootstrap**: solo se referencia `amplifyconfiguration.json` en `main.ts:16`. `aws-exports.js` está presente pero no se usa en el arranque.
- **No hay `AppModule`** ni archivos `*.module.ts` de página — 100% standalone.
- **No se usa `NavController` ni `IonRouterLink`** para navegación programática; todo es `Router` + `ModalController` + `AlertController`.
- **No hay interceptores HTTP ni `provideHttpClient`** en el bootstrap; las llamadas a backend van por Amplify (GraphQL/Auth/Storage), no por `HttpClient` de Angular.
- **`environment.production` solo se consume en `app.component.ts:138`** (debug utils). No hay otras variables de entorno en `src/environments/`.
</content>

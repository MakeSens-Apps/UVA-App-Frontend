# Discovery — Inventario de Lógica de Negocio (Migración Ionic → React Native)

> **Fase 1 — Descubrimiento.** Documento de solo lectura. Inventaría toda la lógica de negocio en `src/app/core/services/**`, `src/models/**`, `src/app/Interfaces/*`, `src/graphql/*` y servicios auxiliares, y la clasifica por portabilidad a React Native (Expo + Development Builds).
>
> **Leyenda de clasificación:**
> - **PURO** — TypeScript sin Angular/Ionic/DOM/Capacitor. Portable tal cual.
> - **ANGULAR-DI** — Solo usa `@Injectable`/inyección de dependencias de Angular. Portable con cambio mecánico (quitar decorador, convertir a clase/función/módulo o a un hook/contenedor RN).
> - **ACOPLADO-IONIC** — Usa controladores Ionic (`Platform`, `@ionic/angular`) o lógica de UI/alertas.
> - **ACOPLADO-PLATAFORMA** — Usa Capacitor o APIs web/DOM (`document`, `window`, `navigator`, `Filesystem`, `Preferences`, `Share`, `LocalNotifications`, `App`).
>
> Una clase puede tener varias etiquetas; se indica la dominante y las secundarias.

---

## 0. Resumen ejecutivo

La app es **offline-first** sobre **AWS Amplify v6**: la persistencia local + sincronización está delegada a **Amplify DataStore** (`@aws-amplify/datastore`), la autenticación a **Cognito** (`aws-amplify/auth`), las llamadas directas a **AppSync GraphQL** (`aws-amplify/api`) y el storage de configuración a **S3** (`@aws-amplify/storage`). Toda esta capa Amplify **es portable a React Native sin cambios** (Amplify v6 es agnóstico de framework y soporta RN), por lo que el grueso de la lógica de datos no necesita reescribirse.

Los puntos de fricción reales son: (1) `@capacitor/*` (Filesystem, Preferences, Share, App, LocalNotifications, Device, Core) que hay que reemplazar por equivalentes Expo; (2) `@ionic/angular` (`Platform`, hardware back button); (3) `@angular/router`; (4) un servicio (`environmental-report.service`) que **renderiza un componente Angular en el DOM y lo convierte a PNG con `html-to-image`** — esto está fuertemente enredado con el DOM y la UI, y es el mayor riesgo de extracción; (5) el `safe-html.pipe` (DOMPurify + DomSanitizer de Angular).

La lógica de **gamificación** (semillas, rachas, hitos/germinación) y de **fase lunar** es algoritmo TypeScript puro **acoplado solo a DataStore/FileSystem**, no a UI — es altamente preservable.

**Veredicto cuantitativo (ver §8):** ~70–75% de la lógica de negocio es preservable casi tal cual (PURO + ANGULAR-DI + Amplify), ~20% requiere swap mecánico de plugin Capacitor→Expo, y ~5–8% (esencialmente `environmental-report.service` + `safe-html.pipe` + el manejo del back button) es lógica enredada con UI/DOM que habrá que extraer o reescribir.

---

## 1. `core/services/api/` — Llamadas a AppSync GraphQL

Patrón común: cada servicio crea `const client = generateClient()` (de `aws-amplify/api`), envuelve `client.graphql({query, variables})` en try/catch y devuelve un *discriminated union* `{success:true,data} | {success:false,error}`. Todos son `@Injectable({providedIn:'root'})` salvo `errors-api`.

| Servicio | Archivo | Responsabilidad | Dependencias | Clasificación |
|---|---|---|---|---|
| `errors-api.service` (`handleAPIError`) | `api/errors-handle/errors-api.service.ts:22` | Función pura que normaliza cualquier error a `errorAPIResponse {name,mensage,type}` | Ninguna (función exportada, no clase) | **PURO** |
| `UserAPIService` | `api/user-api.service.ts:58` | `createUser` (con mutation GraphQL inline `createUserOnly`, `user-api.service.ts:31`), `getUser` | `aws-amplify/api`, `src/graphql/queries`, `src/API`, `errors-api` | **ANGULAR-DI** (+ Amplify) |
| `RacimoAPIService` | `api/racimo-api.service.ts:37` | `listRACIMOS`, `getRACIMO` | `aws-amplify/api`, `src/graphql/queries`, `src/API` | **ANGULAR-DI** (+ Amplify) |
| `UvaAPIService` | `api/uva-api.service.ts:38` | `getUVAByUser`, `getUVAByRACIMO`, `createUVA`, `updateUVA` | `aws-amplify/api`, mutations/queries, `src/API` | **ANGULAR-DI** (+ Amplify) |
| `UserProgressAPIService` | `api/user-progress-api.service.ts:21` | `createUserProgress` (alta inicial del progreso) | `aws-amplify/api`, `src/graphql/mutations`, `src/API` | **ANGULAR-DI** (+ Amplify) |
| `MoonPhaseAPIService` | `api/moon-phase-api.service.ts:30` | `getMoonPhase({year,month})` — query GraphQL `getMoonPhase` que devuelve un AWSJSON serializado raro (ver §5) | `aws-amplify/api`, query `getMoonPhase` (`queries.ts:11`) | **ANGULAR-DI** (+ Amplify) |

**Nota de portabilidad:** `generateClient()` se ejecuta a nivel de módulo (top-level), lo que exige que `Amplify.configure()` corra antes de importar estos módulos — se mantiene en RN, pero el orden de inicialización debe replicarse en el bootstrap de Expo.

---

## 2. `core/services/auth/` — Autenticación Cognito (OTP/SMS)

| Servicio | Archivo | Responsabilidad | Dependencias | Clasificación |
|---|---|---|---|---|
| `AuthService` | `auth/auth.service.ts:54` | Envuelve `aws-amplify/auth`: `SignIn` (`:116`, usuario=password=teléfono), habilita MFA SMS para no-test (`enableMFAForUser`, `:146` → `updateMFAPreference({sms:'PREFERRED'})`), `ConfirmSignIn` (OTP), `SignOut`, `SignUp`, `ConfirmSignUp`, `ResendVerificationCode`, `CurrentAuthenticatedUser`, `CurrentUserAttributes`, `handleDeleteUser`. `handleAuthError` (`:67`) mapea `AuthError` por `name` a `type` | `aws-amplify/auth`, `TestUsersService` | **ANGULAR-DI** (+ Amplify) |
| `TestUsersService` | `auth/test-users.service.ts:6` | Lista hardcodeada de teléfonos de prueba (`+573000000002`, etc.) que saltan el flujo MFA. `isTestUser(phone)` | Ninguna | **ANGULAR-DI** (lógica **PURA**) |

`aws-amplify/auth` funciona en RN (con `@aws-amplify/react-native` + el adaptador de almacenamiento). Portable con cambio mecánico del decorador.

---

## 3. `core/services/session/` — Sesión persistida

| Servicio | Archivo | Responsabilidad | Dependencias | Clasificación |
|---|---|---|---|---|
| `SessionService` | `session/session.service.ts:9` | CRUD de la `Session` (modelo en `src/models/session.model.ts`) en almacenamiento clave-valor: `setInfo`, `getInfo`, `setInfoField`, `clearSession`. Itera `sessionKeys` para leer/escribir | **`@capacitor/preferences`** (`Preferences`) | **ACOPLADO-PLATAFORMA** |

**Crítico:** `SessionService` es la dependencia más transversal de toda la capa de datos. Las clases estáticas de DataStore (§4) instancian su propia copia con `static session = new SessionService()` (p.ej. `measurement-ds.service.ts:9`, `user-progress-ds.service.ts:15`, `gamification-event-ds.service.ts:13`, `user-ds.service.ts:14`, `uva-ds.service.ts:16`). Reemplazar `@capacitor/preferences` por `expo-secure-store` / `@react-native-async-storage/async-storage` cambia este único punto; la API pública (`getInfo/setInfoField`) se preserva.

---

## 4. `core/services/storage/` — Persistencia (DataStore, FileSystem, S3, Config)

### 4.1 `storage/datastore/` — Amplify DataStore (offline-first)

Patrón distinto al resto: **clases con métodos `static`, SIN `@Injectable`** (excepto `SyncMonitorDSService`). No usan DI de Angular; son módulos de lógica pura sobre `DataStore` de `@aws-amplify/datastore`. Esto las hace **casi directamente portables** (solo importan `DataStore`, `SortDirection`, `Predicates` y los modelos de `src/models`).

| Servicio | Archivo | Responsabilidad | Dependencias | Clasificación |
|---|---|---|---|---|
| `MeasurementDSService` | `datastore/measurement-ds.service.ts:8` | `addMeasurement` (serializa `data`/`logs` a JSON, asocia `uvaID` de sesión, `:19`), consultas por UVA/rango de fechas/mes/día (`getMeasurementsByMont :93`, `getMeasurementsByDateRange :71`, `countMeasurementsByDay :170`) | `@aws-amplify/datastore`, `SessionService`, modelo `Measurement` | **PURO** sobre Amplify (estática, sin DI). Acopla a `SessionService` (plataforma) |
| `UserProgressDSService` | `datastore/user-progress-ds.service.ts:14` | **Núcleo de gamificación de datos.** CRUD de `UserProgress` + lógica de rachas/hitos. Ver §6 para los algoritmos (`getLastUserProgress :119`, `getCompleteTaskWeek :200`, `getCompletedTasksByMonthYear :237`, `seedToMilestone :365`, `handleMilestoneAssignment :385`, `calculateDaysDifference :335`, `evaluateCompletedTasks :309`) | `@aws-amplify/datastore`, `SessionService`, `GamificationAlertsService`, modelo `UserProgress` | **PURO** sobre Amplify (algoritmo) + acopla a `SessionService` y a `GamificationAlertsService` |
| `GamificationEventDSService` | `datastore/gamification-event-ds.service.ts:12` | CRUD de `GamificationEvent` (notificaciones): `createGamificationEvent` (`:23`), `getGamificationEvents` (filtra `userID` + `isUnclean=true`, `:57`), `updateGamificationEventData`, `markAllAsClean` (borrado lógico, `:137`) | `@aws-amplify/datastore`, `SessionService`, modelo `GamificationEvent` | **PURO** sobre Amplify + `SessionService` |
| `UserDSService` | `datastore/user-ds.service.ts:13` | `getUser` (por `userID` de sesión), `updateUser` (Name/LastName/Email/uvaID) | `@aws-amplify/datastore`, `SessionService`, modelo `User` | **PURO** sobre Amplify + `SessionService` |
| `UvaDSService` | `datastore/uva-ds.service.ts:15` | `getUVAByID`, `getUVAByuserID`, `updateUVA` (lat/long/altitud/fields) | `@aws-amplify/datastore`, `SessionService`, modelo `UVA` | **PURO** sobre Amplify + `SessionService` |
| `RacimoDSService` | `datastore/racimo-ds.service.ts:4` | `getRacimoCode(racimoID)` → `LinkageCode` | `@aws-amplify/datastore`, modelo `RACIMO` | **PURO** sobre Amplify (no usa sesión) |
| `SyncMonitorDSService` | `datastore/sync-monitor-ds.service.ts:19` | Monitorea sincronización vía **`Hub.listen('datastore'|'auth')`** (`:41`,`:72`). Máquina de estados `STATE_SYNC_DS` (NOINIT/UNSYNC/SYNC/READY). `waitForSyncDataStore` (`:96`, `DataStore.start()` + polling cada 100ms). En `signedOut` ejecuta `DataStore.clear()`. Limpia registros `AppUsageEvent` sincronizados vía callback a `AppUsageService` | `@aws-amplify/datastore`, `aws-amplify/utils` (`Hub`), `AppUsageService` | **ANGULAR-DI** (es `@Injectable`) + Amplify. El polling con `setInterval` es PURO |

### 4.2 `storage/file-system/`

| Servicio | Archivo | Responsabilidad | Dependencias | Clasificación |
|---|---|---|---|---|
| `FileSystemService` | `file-system/file-system.service.ts:55` | Wrapper completo de `@capacitor/filesystem`: `writeFile`, `readFile` (UTF8/base64), `deleteFile`, `copyFile`, `renameFile`, `createDirectory`, `readDirectory`, `getFileUri`, `requestPermissions`. Todos devuelven `FileSystemResponse<T>` | **`@capacitor/filesystem`** | **ACOPLADO-PLATAFORMA** |

Es la abstracción más fácil de re-implementar: superficie pequeña, contratos `{success,data|error}` estables. En RN se reescribe sobre `expo-file-system`. Es dependencia de `MoonPhaseService` y `ConfigurationAppService`.

### 4.3 `storage/s3/`

| Servicio | Archivo | Responsabilidad | Dependencias | Clasificación |
|---|---|---|---|---|
| `S3Service` | `s3/s3.service.ts:70` | `listFiles(path)` (lista con `listAll`), `getFile(path)` (descarga y **deserializa por extensión**: json→parse, txt→text, png/jpg/svg→blob, `:106`). `handleAuthError` mapea `StorageError` | **`@aws-amplify/storage`** (`list`, `downloadData`) | **ANGULAR-DI** (+ Amplify) — pero `getFile` usa `response.body.blob()` (API web `Blob`) |

`@aws-amplify/storage` funciona en RN, pero **`getFile` produce `Blob`** (`:151`) que luego `ConfigurationAppService` convierte con `btoa`/`atob`/`Uint8Array` — eso es web-ish y requiere validar en RN.

### 4.4 `storage/configuration-app.service`

| Servicio | Archivo | Responsabilidad | Dependencias | Clasificación |
|---|---|---|---|---|
| `ConfigurationAppService` | `storage/configuration-app.service.ts:14` | Orquesta descarga de config del RACIMO desde S3 a FS local (`downLoadData :37`), lee `config.json`/`measurementsRegistration.json`/`colors.json` (cache en memoria), `loadImage` (URI Capacitor en android/ios, Blob URL en web, `:189`), `countTasks`, **`applyColors` que escribe variables CSS en `document.documentElement.style` (`:273`)** | `S3Service`, `FileSystemService`, `SessionService`, **`@capacitor/filesystem`** (Directory), **`@capacitor/core`** (`Capacitor.getPlatform`, `convertFileSrc`, `:191`,`:223`), modelos config, **DOM** (`document`, `btoa`, `atob`, `Blob`, `URL.createObjectURL`) | **ACOPLADO-PLATAFORMA + DOM** (alto) |

Servicio con la mayor mezcla de responsabilidades: I/O de datos (portable) + branding por CSS vars (`applyColors`, `loadBlobFromFilesystem`) que es 100% web/DOM. En RN, el branding no usa CSS variables: hay que reescribir `applyColors` hacia un theme provider / context, y `loadImage` hacia `expo-file-system` URIs. La lógica de descarga/cache (`downLoadData`, `getConfigurationApp/Measurement/Colors`) es preservable.

---

## 5. `core/services/view/` — Lógica específica de pantallas/flujos

| Servicio | Archivo | Responsabilidad | Dependencias | Clasificación |
|---|---|---|---|---|
| `SetupService` | `view/setup/setup.service.ts:20` | Orquesta auth + sesión + alta de usuario: `signIn` (`:52`), `confirmSignIn`, `signUp` (`:118`, maneja `UsernameExistsException`→reenvía código), `confirmSignUp`, `reSendCode*`, `currentAuthenticatedUser` (vuelca atributos a sesión, `:170`), `createNewUser` (`:189`, crea User vía API + UserProgress inicial Seed=0/Streak=0) | `AuthService`, `SessionService`, `UserAPIService`, `UserProgressAPIService`, `aws-amplify/auth` | **ANGULAR-DI** (orquestación pura) |
| `SetupRacimoService` | `view/setup/setup-racimo.service.ts:15` | Vinculación a RACIMO/UVA: `getUVA(userId)` (`:77`, guarda racimoID/uvaID/linkCode en sesión), `createNewUVA` (`:117`, **genera ID secuencial** `UVA_<code>_<00000>` parseando el último con regex `/(\d{5})$/`, `:125`), `updateUVA`, `getRACIMOByCode`/`getRACIMOByID` | `SessionService`, `RacimoAPIService`, `UvaAPIService`, tipos de `src/API` | **ANGULAR-DI** (orquestación pura) |
| `GamificationService` | `view/gamification/gamification.service.ts:19` | **Fachada de gamificación.** `extends UserProgressDSService`. Lógica de recompensa por tarea/racha/bonus + métodos DEBUG. Ver §6 | hereda `UserProgressDSService`, `GamificationAlertsService`, tipos de alertas | **PURO** (algoritmo) + Amplify vía herencia. Es `@Injectable` pero los métodos clave son `static` |
| `GamificationAlertsService` | `view/gamification/gamification-alerts.service.ts:25` | Crea eventos de notificación (semillas/rachas/germinación), formatea títulos/descripciones, formatea timestamps relativos (Hoy/Ayer/Hace N días, `:351`), `markNotificationAsRead`, `deleteAllNotifications`. `getNotifications` parsea `data` JSON y mapea con `validateEventData` | `@aws-amplify/datastore` (`SortDirection`), `GamificationEventDSService`, `gamification-alerts-types`, modelo `GamificationEvent` | **PURO** (lógica) + Amplify. Es `@Injectable` con métodos `static` |
| `gamification-alerts-types.service` | `view/gamification/gamification-alerts-types.service.ts` | **Solo tipos + datos.** `GamificationEventType/Subtype`, `EventData` (union), `eventMessages` (catálogo de ~15 mensajes ES por subtipo con placeholders `{days}`/`{stage}`, `:60`), `validateEventData` (type guard, `:211`) | Ninguna | **PURO** (sin clase, sin DI) |
| `NotificationService` (badge) | `view/gamification/notification.service.ts:7` | Contador reactivo de no-leídos vía `BehaviorSubject<number>`: `updateUnreadCount`, `getUnreadCount`, `hasUnreadNotifications` | **`rxjs`** (`BehaviorSubject`, `Observable`) | **ANGULAR-DI** (RxJS es portable a RN; se puede mantener o pasar a estado/store) |
| `MoonPhaseService` | `view/moon/moon-phase.service.ts:93` | Cálculo/almacenamiento de fase lunar. Ver §5.1 | `extends MoonPhaseAPIService`, `FileSystemService`, **`@capacitor/filesystem`** (`Directory`) | **ANGULAR-DI** + acopla a FileSystem (plataforma vía `FileSystemService`) |
| `AppUsageService` | `view/app-usage.service.ts:11` | Telemetría: genera `sessionID`, `trackNavigation`/`trackAction` (graba `AppUsageEvent` en DataStore), `cleanupSyncedRecord`/`manualCleanupAll`/`getLocalUsageStats` | `@aws-amplify/datastore`, `AuthService`, `SessionService`, modelo `AppUsageEvent` | **ANGULAR-DI** + Amplify |
| `EnvironmentalReportService` | `view/environmental-report.service.ts:22` | **El servicio MÁS enredado con UI.** Agrega mediciones a estadísticas diarias/mensuales (mañana/tarde, temp/hum/lluvia, `:161`–`:447`) — esa parte es PURA — pero `generateReportImage`/`createImageFromReportComponent` (`:455`) **crea dinámicamente un componente Angular (`createComponent`), lo monta en el DOM (`document.body.appendChild`), espera fuentes (`document.fonts.ready`), e invoca `html-to-image` (`toPng`/`toJpeg`)** con backdrops y reintentos por plataforma | **`@angular/core`** (`ApplicationRef`, `createComponent`, `EnvironmentInjector`), **`html-to-image`**, **DOM masivo**, `EnvironmentalReportComponent` (UI), `MeasurementDSService`, `UserDSService`, `UvaDSService` | **ACOPLADO-IONIC/ANGULAR + DOM** (crítico). La agregación de datos es **PURA** y extraíble |
| `ShareService` | `view/share.service.ts:19` | Compartir reporte como imagen: en Capacitor escribe el PNG a `Directory.Cache` y usa `Share.share` (con `files[]` para android, reintentos), en web abre `window.open` con HTML. `shareText`, `canShare` | **`@capacitor/filesystem`**, **`@capacitor/share`**, **`@ionic/angular`** (`Platform`), **DOM** (`window.open`, `navigator.share`, `navigator.clipboard`) | **ACOPLADO-PLATAFORMA + IONIC** |

### 5.1 Algoritmo de Fase Lunar (`MoonPhaseService`)

`MoonPhaseService extends MoonPhaseAPIService` (`moon-phase.service.ts:93`). No calcula la fase astronómicamente: la **descarga del backend** y la **cachea en archivos**.

- **Descarga + persistencia** (`downloadAndStoreMoonPhaseData`, `:121`): itera **24 meses** hacia adelante (`config.monthsToDownload=24`, `:106`), llama `getMoonPhase({year,month})` y **sanea una cadena AWSJSON mal formada** con 5 `.replace()` encadenados (`:147`–`:155`: cambia `=`→`:`, comilla claves/valores, etc.) antes de escribir `lunar-phases-YYYY-MM.json` en `Directory.Data` vía `FileSystemService`. **Frágil** (parsing por regex).
- **Mapeo de fases** (`PHASE_MAPPING`, `:94`): nombres en español del backend (`'Luna nueva'`, `'Luna llena'`, `'Creciente'`, `'Menguante'`, `'Cuarto creciente'`, `'Cuarto menguante'`) → enum `LunarPhase` (NEW_MOON/FULL_MOON/FIRST_QUARTER/LAST_QUARTER). `mapPhaseToEnum` (`:407`) con fallback NEW_MOON; `mapPhaseToCalendarStatus` (`:421`) lo pasa a string kebab.
- **Consultas** sobre el cache: `getCurrentPhase` (lee `dailyLunarInfo[díaActual]`, `:186`), `getMonthPhases` (ordena por día, `:217`), `getNextMoonEvents(count=2)` (`:254`): recorre meses leyendo archivos, detecta `'Luna nueva'`/`'Luna llena'`, filtra eventos futuros y devuelve los próximos N.

**Portabilidad:** la lógica de mapeo, recorrido de meses y selección de eventos es **PURA**; solo el I/O (`FileSystemService`/`Directory`) está acoplado a plataforma. El saneo regex de AWSJSON es deuda técnica a vigilar en la migración.

---

## 6. Gamificación — Algoritmos a alto nivel (foco de la misión)

La gamificación se reparte entre **`UserProgressDSService`** (estado en DataStore + reglas de racha/hito) y **`GamificationService`** (recompensas por tarea) y **`GamificationAlertsService`** (notificaciones). Toda la lógica es **PURA/algorítmica sobre Amplify DataStore** — no toca UI ni Capacitor — y por tanto **altamente preservable**.

### 6.1 Modelo `UserProgress`
Campos relevantes (`src/models/index.d.ts:85`): `ts` (fecha ISO), `Seed` (semillas), `Streak` (racha), `Milestones` (hito germinado: `''|'brote'|'plantula'|'flor'`), `SaveStreak` (bool, día en que se rescató racha), `completedTasks` (tareas del día), `additionalInfo`, `userID`.

### 6.2 Recompensa por completar tareas — `completeTaskProcess(totalTask)` (`gamification.service.ts:178`)
Con **reintentos (max 3, backoff)** y verificación post-update:
1. Lee `getLastUserProgress()` (que a su vez puede crear el registro del día — ver 6.4).
2. `newCompletedTasks = completedTasks + 1`.
3. **Primera tarea del día** (`completedTasks===0`): `+1 Seed` + alerta `first_task`.
4. **Todas completas** (`newCompletedTasks >= totalTask`): `+1 Seed`, `+1 Streak`, alerta `all_tasks`, ejecuta `streakBonus()`, y si `newStreak % 7 !== 0 && newStreak % 3 === 0` emite alerta `streak_progress`.
5. Update atómico vía `updateUserProgress`, luego re-lee para verificar; si falla, lanza y reintenta.

### 6.3 Bonus de racha — `streakBonus()` (`gamification.service.ts:395`)
Constantes: `daysForStreak=7`, `bonusSeedForStreak=3`. Si `Streak % 7 === 0` → `+3 Seed` + alerta `streak_reward(streak)`.

### 6.4 Gestión diaria de racha — `getLastUserProgress()` (`user-progress-ds.service.ts:119`)
Es el corazón del modelo de rachas. Al leer el último progreso calcula `daysDifference` con `calculateDaysDifference` (compara a medianoche, `:335`) y:
- **0 días** (mismo día): devuelve el registro actual.
- **1 día** (ayer): crea registro nuevo del día con `completedTasks=0`, mantiene `Streak` **solo si ayer hubo tareas** (`lastProgress.completedTasks===0 ? 0 : Streak`). Si ayer no completó nada pero tenía racha>0 → alerta `streak_recovery`.
- **>1 día** (inactividad): crea registro `Streak=0` + alerta `streak_lost`.
En todos los casos pasa por `handleMilestoneAssignment` (6.6) para asignar semilla/hito si cambió de mes.

### 6.5 Recuperar racha — `recoverStreak()` (`gamification.service.ts:306`)
Coste `recoverStreakCost=5` semillas. Si `Seed < 5` → falla. Reconstruye el progreso de ayer (`SaveStreak=true`, `additionalInfo` descriptivo), recalcula `newStreak` basándose en el progreso de hace dos días (`Streak+1` o `1`), descuenta 5 semillas del registro de hoy y emite `streak_recovered`.

### 6.6 Semilla→Hito (germinación mensual) — `seedToMilestone` + `handleMilestoneAssignment` (`user-progress-ds.service.ts:365`,`:385`)
Umbrales de germinación por semillas acumuladas:
- `<11` → `''` (no germina, conserva semillas)
- `11–40` → `'brote'` (resetea semillas a 0)
- `41–63` → `'plantula'` (reset a 0)
- `≥64` → `'flor'` (reset a 0)

`handleMilestoneAssignment` se dispara cuando `monthsDifference > 0` (cambió de mes): asigna el hito al registro del último día del mes (o crea uno con `ts` = último día del mes anterior), y emite `germination_success(milestone)` o `germination_fail`. **Nota:** estos umbrales están hardcodeados en el servicio, aunque `ConfigModel.gamification` (`config.model.ts:46`) define `milestones`/`streakReward`/`seedsForOneTask` configurables — hay divergencia entre config remota y constantes hardcodeadas (deuda a revisar).

### 6.7 Agregaciones de calendario
- `getCompleteTaskWeek(totalTasks)` (`:200`): evalúa días completos/incompletos de la semana actual (desde domingo).
- `getCompletedTasksByMonthYear(year,month,totalTasks)` (`:237`) y `getCountTasksByMonthYear` (`:271`): igual para un mes.
- `evaluateCompletedTasks` (`:309`): clasifica cada día en `daysComplete`/`daysIncomplete`/`daysSaveStreak` según `tasks>=totalTasks`, `tasks>0`, `saveStreak`.

### 6.8 Notificaciones de gamificación
`GamificationAlertsService` crea `GamificationEvent` con `eventType` (`seeds`/`streak`/`achievement`) y `data` JSON (`{subtype,isUnread,messageIndex,...}`). `eventMessages` (`gamification-alerts-types.service.ts:60`) es un catálogo de ~135 mensajes en español. `getNotifications` (`:228`) deserializa, valida con `validateEventData`, resuelve título/descripción y formatea timestamp relativo. El "borrado" es lógico (`isUnclean=false`, `markAllAsClean`).

---

## 7. Modelos, Interfaces y GraphQL

### 7.1 `src/models/`
| Archivo | Contenido | Clasificación |
|---|---|---|
| `session.model.ts` | `interface Session` (userID/name/lastName/phone/racimoID/uvaID/racimoName/racimoLinkCode/racimoConfiguration) + `sessionKeys[]` | **PURO** |
| `schema.js` (989 líneas) | Esquema DataStore generado por Amplify (definición de modelos RACIMO/Measurement/UserProgress/GamificationEvent/AppUsageEvent/User/UVA + relaciones/índices) | **PURO** (datos) — **se regenera** con Amplify CLI, no se migra a mano |
| `schema.d.ts` | Solo `export declare const schema: Schema` | **PURO** |
| `index.js` / `index.d.ts` | `initSchema(schema)` exporta las clases de modelo (Eager/Lazy types) | Amplify (generado) |
| `configuration/config.model.ts` | `ConfigModel`: racimo/branding/fieldsUVA/measurementRegistration/components/documentation/`gamification` (milestones, streakReward, seedsForOneTask...) | **PURO** |
| `configuration/measurements.model.ts` | `MeasurementModel`: tasks/flows/guides/measurements/bonus/historical (+ `Task`,`Flow`,`Guide`,`Measurement`,`Historical`,`Graph`,`Bonus`,`Restrictions`...). Define el motor de medición configurable por RACIMO | **PURO** |
| `configuration/colors.model.ts` | `ColorsModel = Record<string, HexColor|RgbColor>` (branding) | **PURO** |

### 7.2 `src/app/Interfaces/`
| Archivo | Contenido | Clasificación |
|---|---|---|
| `IMeasurement.ts` | `IMeasurement` (UI de medición: name/unit/icon/colores/range/value) | **PURO** |
| `ITask.ts` | `ITask` (name/restrictions/completed/color/icon/flows...) | **PURO** |

### 7.3 `src/graphql/` + `src/API.ts`
- `queries.ts` (1002 líneas), `mutations.ts` (718), `subscriptions.ts` (709), `API.ts` (3116 líneas) — **todo generado por Amplify Codegen** (operaciones + tipos TypeScript de AppSync). `getMoonPhase` es una query escalar AWSJSON (`queries.ts:11`). **Clasificación PURO/generado** — no se migra a mano, se **regenera** con `amplify codegen`. Portable tal cual a RN.

---

## 8. Pipe

| Pipe | Archivo | Responsabilidad | Dependencias | Clasificación |
|---|---|---|---|---|
| `SafeHtmlPipe` | `core/pipes/safe-html.pipe.ts:9` | Sanitiza HTML dinámico (config remota) con **DOMPurify** + `DomSanitizer.bypassSecurityTrustHtml`. Hook para preservar `style` con `var(...)` | **`@angular/platform-browser`** (`DomSanitizer`), `dompurify` (DOM) | **ACOPLADO-IONIC/DOM** — RN no tiene `innerHTML`; se reemplaza por `react-native-render-html` u otro renderizador. La lógica de sanitización (DOMPurify) no aplica igual |

---

## 9. Servicios acoplados a plataforma fuera de `view/`

| Servicio | Archivo | Responsabilidad | Dependencias | Clasificación |
|---|---|---|---|---|
| `AppMinimizeService` | `minimize/app-minimize.service.ts:9` | Maneja el **botón físico de retroceso Android**: si la ruta está en `routesToMinimize`, minimiza la app; si no, `window.history.back()` | **`@ionic/angular`** (`Platform.backButton`), **`@angular/router`** (`Router`), **`@capacitor/app`** (`App.minimizeApp`), **DOM** (`window.history`) | **ACOPLADO-IONIC + PLATAFORMA** |
| `NotificationService` (push local) | `services/notification/notification.service.ts:31` | Notificaciones locales diarias (6am/6pm) con canales Android, permisos runtime (Android 13+), exact-alarm (Android 12+), estado de batería, guía Private Space (Android 15+) | **`@capacitor/local-notifications`**, **`@capacitor/preferences`**, **`@capacitor/core`**, **`@capacitor/device`** | **ACOPLADO-PLATAFORMA** (alto) |

`NotificationService` es ~410 líneas muy específicas de Capacitor/Android; en RN se reescribe sobre `expo-notifications` (canales, permisos y scheduling tienen APIs distintas). La **lógica de horarios** (cálculo de `morningTime`/`afternoonTime` y reprogramación si ya pasó la hora, `:116`–`:142`) es PURA y reutilizable.

---

## 10. Tests unitarios existentes (`.spec.ts`)

**57 archivos `.spec.ts` en total**; en `core/services/` y `services/` hay 21 specs (uno por servicio principal). **Importante:** la inmensa mayoría son specs de andamiaje Jasmine/`TestBed` que solo verifican `'should be created'` — **no cubren la lógica de negocio**.

Specs de servicios existentes: `auth.service.spec`, `session.service.spec`, `configuration-app.service.spec`, `file-system.service.spec`, `s3.service.spec`, `measurement-ds`, `racimo-ds`, `sync-monitor-ds`, `user-ds`, `user-progress-ds`, `uva-ds`, los 5 de `api/`, `gamification.service.spec`, `moon-phase.service.spec`, `setup.service.spec`, `setup-racimo.service.spec`, `services/notification/notification.service.spec`.

- `moon-phase.service.spec.ts` (16 líneas) y `user-progress-ds.service.spec.ts` (16 líneas): **solo `should be created`**.
- `gamification.service.spec.ts` (190 líneas): contiene **tests reales detallados** de `completeTaskProcess`, `recoverStreak`, `streakBonus` (incremento de Seed/Streak, coste de 5 semillas, bonus en múltiplos de 7)… **pero todo está dentro de un bloque comentado `/* ... */`** (a partir de `gamification.service.spec.ts:35`). El único `it` activo es `should be created`. Es decir, **la lógica de gamificación no tiene cobertura efectiva**, aunque los casos de prueba ya están redactados y son recuperables.

**Specs que merece la pena portar/activar** (cubren lógica preservable y de alto valor):
1. `gamification.service.spec.ts` — **descomentar y activar**; es el activo de prueba más valioso (cubre rachas/semillas/recuperación).
2. `user-progress-ds.service.spec.ts` — escribir tests reales para `getLastUserProgress`, `seedToMilestone`, `handleMilestoneAssignment`, `calculateDaysDifference`, `evaluateCompletedTasks` (hoy vacío).
3. `moon-phase.service.spec.ts` — tests reales para `mapPhaseToEnum`, `getNextMoonEvents`, recorrido de meses (hoy vacío).
4. `setup-racimo.service.spec.ts` — la generación de ID secuencial de UVA (regex) es lógica de negocio testeable.

Como Jasmine/Karma + `TestBed` son específicos de Angular, al migrar se recomienda **re-implementar estos tests en Jest** (o Vitest) sobre las funciones puras ya extraídas, mockeando DataStore.

---

## 11. Veredicto de portabilidad

### 11.1 Clasificación consolidada (servicios de lógica)

**PURO (portable tal cual; solo acopla a DataStore/SessionService):**
`errors-api.handleAPIError`, `gamification-alerts-types` (tipos+catálogo de mensajes), y el grueso algorítmico de `UserProgressDSService`, `GamificationService`, `GamificationAlertsService`, `MeasurementDSService`, `GamificationEventDSService`, `UserDSService`, `UvaDSService`, `RacimoDSService`. Modelos (`session.model`, `config.model`, `measurements.model`, `colors.model`), interfaces (`IMeasurement`, `ITask`) y todo `src/graphql` + `src/API.ts` + `src/models/schema.js` (generados; se regeneran).

**ANGULAR-DI (cambio mecánico del decorador; lógica intacta):**
`AuthService`, `TestUsersService`, todos los `api/*` (UserAPI/RacimoAPI/UvaAPI/UserProgressAPI/MoonPhaseAPI), `S3Service`, `SetupService`, `SetupRacimoService`, `AppUsageService`, `SyncMonitorDSService`, `NotificationService` (badge RxJS).

**ACOPLADO-PLATAFORMA (swap Capacitor→Expo, contrato preservable):**
`SessionService` (Preferences→SecureStore/AsyncStorage), `FileSystemService` (→expo-file-system), `MoonPhaseService` (solo el I/O), `ConfigurationAppService` (I/O portable; branding CSS/Blob no), `NotificationService` push (→expo-notifications), `ShareService` (→expo-sharing). 

**ACOPLADO-IONIC/DOM (extraer o reescribir):**
`AppMinimizeService` (back button Android → `BackHandler`/`expo-router`), `SafeHtmlPipe` (→ render-html lib), y sobre todo **`EnvironmentalReportService.createImageFromReportComponent`** (Angular `createComponent` + DOM + `html-to-image`).

### 11.2 Porcentaje real preservable

Estimación sobre ~30 módulos de lógica (excluyendo archivos generados, que se regeneran):
- **~70–75% preservable casi sin tocar** (PURO + ANGULAR-DI + capa Amplify completa: auth, api, datastore, gamificación, fase lunar algorítmica, setup, modelos, GraphQL). Amplify v6 es framework-agnóstico y corre en RN, lo que salva la mayor parte de la complejidad (offline sync, OTP, AppSync).
- **~20% swap mecánico de plugin** Capacitor→Expo manteniendo los contratos `{success,data|error}` ya definidos (Session, FileSystem, Share, Notifications, parte de Config).
- **~5–8% lógica enredada con UI/DOM** a extraer/reescribir.

### 11.3 Dónde está la lógica enredada con UI (hay que extraer)

1. **`EnvironmentalReportService` (`view/environmental-report.service.ts`) — el caso más grave.** Mezcla dos responsabilidades: (a) **agregación de datos** (`processDailyData :161`, `calculatePeriodStats :237`, `calculateTotalRainfall :309`, `calculateSummary :346`) que es **100% PURA y debe extraerse a un módulo aparte**; (b) **render-a-imagen** (`createImageFromReportComponent :455`) que crea un componente Angular, lo inyecta en `document.body`, espera `document.fonts.ready` y usa `html-to-image`. En RN esto se reescribe con `react-native-view-shot` capturando un componente RN; la parte (a) se reutiliza intacta.
2. **`ConfigurationAppService.applyColors` (`:273`)** y `loadBlobFromFilesystem` (`:235`): branding por CSS variables sobre `document.documentElement` y `URL.createObjectURL` — no existe en RN; el theming pasa a un context/provider.
3. **`SafeHtmlPipe`**: renderizado de HTML dinámico (config remota documentación) — sin equivalente directo; requiere librería de render-html en RN.
4. **`AppMinimizeService`**: la decisión de minimizar vs. retroceder por ruta es lógica de negocio reutilizable, pero está atada a `Platform.backButton`, `Router` y `window.history`.
5. **`ShareService`** mezcla escritura de archivo (portable) con `window.open`/HTML web y `navigator.share` (fallback web no aplica en RN).

### 11.4 Riesgos transversales para la migración
- **`SessionService` es el cuello de botella de toda la capa de datos** (instanciado estáticamente en cada DS service). Un único swap, pero alto fan-in.
- **Patrón mixto estático vs. `@Injectable`**: los DS services son clases con métodos `static` (sin DI) mientras los demás usan `@Injectable`. Conviene unificar el patrón al portar (módulos/funciones o un container) para no arrastrar DI de Angular.
- **Inicialización de Amplify**: `generateClient()` a nivel de módulo exige `Amplify.configure()` previo; replicar el orden en el bootstrap de Expo.
- **Saneo regex de AWSJSON en fase lunar** (`moon-phase.service.ts:147`) y **divergencia umbrales hardcodeados vs. `ConfigModel.gamification`**: deuda técnica que la migración debería resolver, no copiar ciegamente.
- **Cobertura de tests casi nula** sobre la lógica de gamificación/rachas (los tests valiosos están comentados): migrar sin red de seguridad. Recuperar/activar `gamification.service.spec.ts` antes de tocar el algoritmo.

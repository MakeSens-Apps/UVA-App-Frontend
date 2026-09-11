# Discovery — Capa AWS Amplify y de Datos (UVA App)

> Fase 1 de la migración Ionic/Angular → React Native (Expo + Development Builds).
> Documento de **solo lectura**: ningún archivo de código fue modificado.
> Todas las afirmaciones referencian `archivo:línea`. Las rutas son relativas al root del repo salvo indicación.

---

## 0. Resumen de versiones y librerías

- `aws-amplify`: declarado `^6.8.2` (`package.json:54`), **instalado `6.10.3`** (verificado en `node_modules`). Es Amplify **v6** (API modular `aws-amplify/auth`, `aws-amplify/api`, `aws-amplify/utils`, `aws-amplify/analytics`).
- `@aws-amplify/datastore`: declarado `^5.0.60` (`package.json:33`), **instalado `5.0.65`**. DataStore v5 es la versión compatible con Amplify v6.
- `@aws-amplify/storage`: importado en `s3.service.ts` (resuelto vía `aws-amplify` v6).
- Persistencia local de sesión: `@capacitor/preferences` (`package.json:48`).
- Sistema de archivos local: `@capacitor/filesystem` (`package.json:42`).
- **No** se usa `@capacitor/network` en el código TS (grep sin resultados); la detección de red la hace DataStore internamente y se observa por Hub.

---

## 1. Configuración e inicialización de Amplify

### 1.1 Archivos de configuración
- `src/amplifyconfiguration.json` — config canónica consumida en runtime. Contiene:
  - `aws_project_region: us-east-1`, Pinpoint Analytics `appId 8342a7773127441e8542486c17a96572` (`amplifyconfiguration.json:1-9`).
  - AppSync: endpoint `https://swmmbj4xmfa5pelhgbljkxonuu.appsync-api.us-east-1.amazonaws.com/graphql`, `authenticationType: AMAZON_COGNITO_USER_POOLS`, **apiKey `da2-ocpxiy4zsncszex4m7lepzxgnq`** (`amplifyconfiguration.json:10-14`).
  - Cognito: Identity Pool `us-east-1:4dc52da2-...`, User Pool `us-east-1_kIEbum0qE`, web client `5l1s62cf25qi33oisq334335pn` (`amplifyconfiguration.json:15-18`).
  - Cognito username = `PHONE_NUMBER`; signup attrs = `FAMILY_NAME, NAME, PHONE_NUMBER`; MFA `ON` por SMS; verificación por `PHONE_NUMBER` (`amplifyconfiguration.json:20-39`).
  - S3: bucket `uvav20df3ae4a64104e4481062c143641f849d454f-develop`, región `us-east-1` (`amplifyconfiguration.json:40-41`).
- `src/aws-exports.js` — duplicado heredado del mismo contenido (no se importa en runtime; `main.ts` importa el `.json`). Marcado "DO NOT EDIT … automatically generated" (`aws-exports.js:1-2`).
- `.graphqlconfig.yml` — config de codegen Amplify CLI: `schemaPath: schema.json`, target TS, `apiId: uqr6xntysfa3lbguhirvcj3pa4`, `framework: ionic`, `maxDepth: 2`. Genera `src/API.ts`.
- `amplify/` — backend NO presente localmente: solo `amplify/.config/*` y `cli.json`/`team-provider-info.json`. **No existe `schema.graphql`** ni recursos de backend en el repo (verificado con `find amplify -name schema.graphql` → vacío). El backend se administra fuera de este repo.

> ⚠️ Credenciales (apiKey de AppSync, IDs de pool) están **hardcodeadas en el repo**. Ver Riesgos.

### 1.2 Inicialización (dos pasos)
1. **`src/main.ts:15-19`** — punto de entrada Angular: `Amplify.configure(config)` con el JSON importado, **antes** de `bootstrapApplication`. El comentario dice "Configurar Amplify sin DataStore".
2. **`src/app/app.component.ts:39-48`** — en el constructor del shell, `DataStore.configure({ syncExpressions: [...] })` (selective sync, sección 4).
   - Tras `platform.ready()`, llama `SyncMonitorDSService.subscribeToSync()` (`app.component.ts:54`), inicializa back-button, tracking de navegación y utilidades debug.
   - `initAutoTrack()` (`app.component.ts:69-95`) configura Pinpoint Analytics (`configureAutoTrack` para `session` y `pageView`) — importado de `aws-amplify/analytics`.

> No hay segunda llamada a `Amplify.configure`; DataStore se configura aparte vía `DataStore.configure`. No se observa `ssr`, `Amplify.configure(config, { ssr })` ni libraryOptions.

---

## 2. Auth — flujo completo de Cognito

Servicio central: `src/app/core/services/auth/auth.service.ts`. API modular `aws-amplify/auth` (imports `auth.service.ts:1-22`).

### 2.1 Operaciones (todas envueltas en `AuthResponse<T>` success/error)
| Método | API Amplify | Línea |
|---|---|---|
| `SignIn(phone)` | `signIn({ username: phone, password: phone })` | `auth.service.ts:116-140` |
| `enableMFAForUser()` | `updateMFAPreference({ sms: 'PREFERRED' })` | `auth.service.ts:146-152` |
| `ConfirmSignIn(code)` | `confirmSignIn({ challengeResponse: code })` | `auth.service.ts:159-170` |
| `SignOut()` | `signOut()` | `auth.service.ts:176-183` |
| `SignUp(name,phone,lastName)` | `signUp({ username, password, options.userAttributes })` | `auth.service.ts:192-215` |
| `ConfirmSignUp(phone,code)` | `confirmSignUp({ username, confirmationCode })` | `auth.service.ts:223-235` |
| `ResendVerificationCode(phone)` | `resendSignUpCode({ username })` | `auth.service.ts:242-249` |
| `CurrentAuthenticatedUser()` | `getCurrentUser()` | `auth.service.ts:254-263` |
| `CurrentUserAttributes()` | `fetchUserAttributes()` | `auth.service.ts:269-278` |
| `handleDeleteUser()` | `deleteUser()` | `auth.service.ts:283-291` |

**Particularidades del flujo (clave para la migración):**
- **Password = phone**: tanto en `signIn` como en `signUp` el password ES el número de teléfono (`auth.service.ts:118`, `:200-202`). Patrón "passwordless" simulado sobre Cognito.
- **Sign-in con teléfono**: username = phone (formato `+57XXXXXXXXXX`).
- **MFA SMS**: al iniciar sesión un usuario NO de prueba que ya quedó `isSignedIn`, se fuerza `updateMFAPreference({ sms:'PREFERRED' })` (`auth.service.ts:121-126`). El OTP por SMS es el segundo paso del login.
- **Manejo de `CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED`**: si `nextStep.signInStep` es ese valor, se reintenta vía `ConfirmSignIn(phone)` (`auth.service.ts:127-132`).
- **`handleAuthError`** mapea `AuthError.name` (`UserNotFoundException`, `NotAuthorizedException`, `CodeMismatchException`, `NetworkError`, default) a tipos `validation|network|authentication|unknown` (`auth.service.ts:67-98`).
- **Sesión/refresh**: el código **no** llama `fetchAuthSession` en ningún punto (grep vacío). El refresh de tokens es manejado internamente por Amplify; la persistencia de tokens es responsabilidad del key-value store de Amplify (en web: localStorage). Esto es relevante para RN (sección 9).

### 2.2 Usuarios de prueba — `test-users.service.ts`
- Lista hardcodeada de teléfonos de prueba (`test-users.service.ts:10-19`):
  `+570000000000`, `+573000000000`, `+573000000001`, `+573000000002`, `+573000000003`, `+573007586230`.
- `isTestUser(phoneNumber)` → `this.testUsers.includes(phoneNumber)` (`test-users.service.ts:30-32`).
- Uso: en `SignIn`, los usuarios de prueba **no** reciben `enableMFAForUser()` (`auth.service.ts:121-126`), es decir saltan el forzado de MFA SMS. (La memoria del proyecto indica que `3000000002` salta OTP y aterriza directo en home.)

### 2.3 Orquestación de sesión — `SetupService` y `SessionService`
- `SetupService` (`view/setup/setup.service.ts`) envuelve Auth + persistencia de sesión + creación de usuario por API:
  - `signIn` guarda `phone` en Preferences y, si `isSignedIn`, llama `currentAuthenticatedUser()` (`setup.service.ts:53-64`).
  - `signUp` guarda `userID` (de `response.data.userId`) y `phone`; si `UsernameExistsException`, reenvía código (`setup.service.ts:113-135`).
  - `confirmSignIn`/`confirmSignUp` → `currentAuthenticatedUser()` (`setup.service.ts:71-78`, `:140-148`).
  - `currentAuthenticatedUser()` lee `getCurrentUser()` + `fetchUserAttributes()` y persiste `userID/name/lastName/phone` en sesión (`setup.service.ts:165-180`).
  - `createNewUser()` usa **API GraphQL directa** (no DataStore): `userAPI.getUser` y `userAPI.createUser`, luego `userProgressAPI.createUserProgress` con Seed/Streak iniciales (`setup.service.ts:185-217`). Ver sección 5.
- **`SessionService`** (`session/session.service.ts`) persiste el modelo `Session` en **`@capacitor/preferences`** (no en Amplify): `setInfo/getInfo/setInfoField/clearSession` (`session.service.ts:16-76`).
  - `clearSession()` → `Preferences.clear()` (`session.service.ts:74-76`), invocado en logout.
- Modelo `Session` (`src/models/session.model.ts`): `userID, name, lastName, phone, racimoID, uvaID, racimoName, racimoLinkCode, racimoConfiguration`. Es **información de sesión de la app**, separada de los tokens de Cognito.

---

## 3. DataStore — modelos (`src/models/schema.js`)

`schema.js` es el esquema de DataStore (codegenVersion 3.4.4, version hash `6c5f6208...`, `schema.js:988-989`). Se instancia vía `initSchema(schema)` en `src/models/index.js:6`, exportando las clases `RACIMO, Measurement, UserProgress, GamificationEvent, AppUsageEvent, User, UVA`.

**7 modelos. `enums: {}` y `nonModels: {}` vacíos** (`schema.js:986-987`). Todos `syncable: true`.

### 3.1 RACIMO (`schema.js:3-136`)
- Campos: `id` (ID req), `Name` (String req), `LinkageCode` (String req), `Configuration` (String opc), `createdAt/updatedAt` (AWSDateTime readOnly).
- Relaciones HAS_MANY: `UVAs` → UVA (assocWith `racimoID`), `GamificationEvents` → GamificationEvent (`racimoID`), `AppUsageEvents` → AppUsageEvent (`racimoID`).
- **Auth rules** (`schema.js:107-133`): `public:read`, `private(iam): CRUD`, `private(userPools): read`.

### 3.2 Measurement (`schema.js:137-255`)
- Campos: `id`, `type` (String req), `data` (AWSJSON opc), `logs` (AWSJSON opc), `ts` (AWSDateTime req), `task` (String opc), `uvaID` (ID req), `createdAt/updatedAt`.
- Índice secundario `byUVA` = `[uvaID, ts]` (`schema.js:214-221`).
- **Auth rules** (`schema.js:224-252`): `owner` (provider userPools, ownerField `owner`, identityClaim `cognito:username`) → `create/read/update` (sin delete); `public:read`; `private(iam):read`.

### 3.3 UserProgress (`schema.js:256-383`)
- Campos: `id`, `ts` (req), `Seed` (Int), `Streak` (Int), `Milestones` (String), `SaveStreak` (Boolean), `completedTasks` (Int), `additionalInfo` (String), `userID` (ID req), `createdAt/updatedAt`.
- Índice `byUser` = `[userID, ts]` (`schema.js:347-354`).
- **Auth rules** (`schema.js:357-380`): `owner` (ownerField `userID`!, identityClaim `cognito:username`) → `create/update/delete/read`; `private(iam):read`. **Ojo:** el ownerField es `userID` (el ID de Cognito), no un campo `owner`.

### 3.4 GamificationEvent (`schema.js:384-507`)
- Campos: `id`, `userID` (req), `racimoID` (req), `eventType` (String req), `ts` (req), `data` (AWSJSON), `isUnclean` (Boolean), `createdAt/updatedAt`.
- Índices: `byUser` = `[userID, ts]`, `byRacimo` = `[racimoID, ts]`.
- **Auth rules**: `owner` (ownerField `userID`) → CRUD; `private(iam):read`.
- `isUnclean` es el flag que gobierna la **sync expression selectiva** (sección 4).

### 3.5 AppUsageEvent (`schema.js:508-638`)
- Campos: `id`, `userID` (req), `racimoID` (req), `sessionID` (String req), `screenName` (String req), `ts` (req), `action` (String req), `duration` (Int opc), `createdAt/updatedAt`.
- Índices: `byUser`, `byRacimo`.
- **Auth rules**: `owner` (ownerField `userID`) → CRUD; `private(iam):read`.

### 3.6 User (`schema.js:639-805`)
- Campos: `id`, `Name` (req), `LastName` (req), `PhoneNumber` (**AWSPhone** req), `Email` (**AWSEmail** opc), `Rank` (String opc), `uvaID` (ID opc), `createdAt/updatedAt`.
- HAS_MANY: `UserProgresses`, `GamificationEvents`, `AppUsageEvents`. BELONGS_TO: `UVA` (targetName `uvaID`).
- **Auth rules** (`schema.js:778-802`): `owner` (ownerField **`id`**, identityClaim `cognito:username`) → CRUD; `private(iam):read`. El owner se ata al `id` del registro = `userId` de Cognito.

### 3.7 UVA (`schema.js:806-984`)
- Campos: `id`, `latitude/longitude/altitude` (String opc), `fields` (AWSJSON opc), `enabled` (Boolean opc), `createdAt` (AWSDateTime — **NO** readOnly aquí, `schema.js:851-857`), `userID` (ID req), `racimoID` (ID req), `updatedAt` (readOnly).
- HAS_ONE: `User` (assocWith `id`, targetName `userID`). HAS_MANY: `Measurements` (assocWith `uvaID`).
- Índices con queryField: `byUser` (`UVAbyUserID`, fields `[userID]`), `byRACIMO` (`UVAsByRacimoID`, fields `[racimoID, createdAt]`).
- **Auth rules** (`schema.js:944-980`): `public:read`, `private:read`, `owner` (ownerField `userID`) → `create/read/update`, `private(iam): CRUD`.

**Grafo de relaciones:** `RACIMO 1—* UVA 1—* Measurement`; `RACIMO 1—* (GamificationEvent, AppUsageEvent)`; `User 1—1 UVA` (HAS_ONE/BELONGS_TO) y `User 1—* (UserProgress, GamificationEvent, AppUsageEvent)`.

---

## 4. DataStore — selective sync, conflictos y monitoreo

### 4.1 `DataStore.configure` / sync expressions (`app.component.ts:39-48`)
```
DataStore.configure({ syncExpressions: [
  syncExpression(GamificationEvent, () => (ge) => ge.isUnclean.eq(true)),
  syncExpression(AppUsageEvent,    () => (ae) => ae['id'].eq('')), // nunca baja de la nube
]});
```
- **GamificationEvent**: solo sincroniza desde la nube los registros con `isUnclean === true`.
- **AppUsageEvent**: la predicate `id.eq('')` (id nunca vacío) garantiza que **nunca se descargan** AppUsageEvents desde la nube; son outbox-only (se crean local → suben → se borran local, sección 4.3).
- Los demás modelos (RACIMO, Measurement, UserProgress, User, UVA) sincronizan completos (sin syncExpression → sync full sujeto a auth rules).
- **No** hay `maxRecordsToSync`, `fullSyncInterval` ni `errorHandler`/`conflictHandler` configurados en `DataStore.configure`. La resolución de conflictos usa la **estrategia por defecto de DataStore (Auto-Merge)**; no se define estrategia custom en el cliente.

### 4.2 Monitor de sincronización — `sync-monitor-ds.service.ts`
- Enum `STATE_SYNC_DS = { NOINIT, UNSYNC, SYNC, READY }` (`sync-monitor-ds.service.ts:6-11`).
- Estado estático global: `state`, `networkStatus`, `isSubscribed`, `appUsageServiceInstance` (`:20-23`).
- `subscribeToSync()` (estático, idempotente vía `isSubscribed`) suscribe a **`Hub.listen('datastore', ...)`** (`:41-70`) y mapea eventos:
  - `networkStatus` → actualiza `networkStatus = data.active` (`:44-48`).
  - `outboxMutationEnqueued` → `state = UNSYNC` (`:49-51`).
  - `outboxMutationProcessed` → si es AppUsageEvent, llama `appUsageService.cleanupSyncedRecord(id)` (`:52-60`) — limpieza outbox.
  - `syncQueriesReady` → `state = SYNC` (`:61-63`).
  - `ready` → `state = READY` (`:64-66`).
- También **`Hub.listen('auth', ...)`**: al evento `signedOut` ejecuta `DataStore.clear()` (`:72-76`). Limpia el store local al cerrar sesión.
- Type guards `isNetworkStatusData` (`:112-122`) e `isAppUsageEvent` — este último identifica el modelo por `data.model.name === 'AppUsageEvent'` (`:129-151`). **Riesgo de minificación** (ver Riesgos).
- `synchronizedData()` → true si `state ∈ {SYNC, READY}` (`:85-90`).
- `waitForSyncDataStore()` (estático): hace **`DataStore.start()`** y luego hace polling cada 100 ms hasta `state === READY` (`:96-106`). Es el gatekeeper de arranque usado por varias páginas.

### 4.3 Outbox-only AppUsageEvent (flujo completo)
- Se crean local en `app-usage.service.ts` vía `DataStore.save(new AppUsageEvent(...))` en `trackNavigation` (`:65-79`) y `trackAction` (`:91-113`).
- Al subir (`outboxMutationProcessed`), `cleanupSyncedRecord` hace `DataStore.delete` del registro local (`app-usage.service.ts:39-53`).
- Métodos de mantenimiento: `manualCleanupAll`, `getLocalUsageStats` (`app-usage.service.ts:132-170`).
- `sessionID` se genera en cliente: `session_${Date.now()}_${random}` (`app-usage.service.ts:31-34`).

### 4.4 Arranque / parada de DataStore (todos los call-sites)
Verificado por grep `DataStore.(start|stop|clear|configure|observe)`:
- `app.component.ts:39` — `DataStore.configure` (sync expressions).
- `sync-monitor-ds.service.ts:74` — `DataStore.clear()` en `signedOut`.
- `sync-monitor-ds.service.ts:97` — `DataStore.start()` dentro de `waitForSyncDataStore`.
- `splash-animation.page.ts:77` — `await SyncMonitorDSService.waitForSyncDataStore()` (arranque offline-first en splash; `:71-95`).
- `project-vinculation.page.ts:85` y `:88` — `waitForSyncDataStore()` tras vincular RACIMO.
- `profile.page.ts:237` — `DataStore.clear()` en logout (`goBack('/login')`, `:231-242`).
- `configuration.page.ts:253` — `syncData()` hace `DataStore.start()` si hay red, si no muestra error (`:250-260`). Es la **sincronización manual** desde Ajustes.
- **`DataStore.stop()` NO se usa en ninguna parte** (no aparece en grep). No hay observers reactivos (`DataStore.observe`/`observeQuery`) en el código: todas las lecturas son `DataStore.query` puntuales.

---

## 5. GraphQL directo (fuera de DataStore) — `src/graphql/*` y `core/services/api/*`

### 5.1 Por qué existe GraphQL directo además de DataStore
DataStore solo sincroniza lo que las **auth rules + sync expressions** permiten al usuario actual. Hay datos que se consultan/crean **antes** de que el usuario tenga UVA/RACIMO asignado o que no deben quedar en el store local. Por eso el flujo de **vinculación a RACIMO** y **creación de usuario/UVA** usa `generateClient()` de `aws-amplify/api` directamente.

Todos los servicios crean un cliente módulo-singleton: `const client = generateClient();` (p.ej. `uva-api.service.ts:20`, `racimo-api.service.ts:15`, `user-api.service.ts:20`, `moon-phase-api.service.ts:10`, `user-progress-api.service.ts:10`). **No** se pasa `authMode` explícito (grep `authMode` vacío) → usa el default del config = `AMAZON_COGNITO_USER_POOLS`.

### 5.2 Operaciones GraphQL realmente usadas por la app
Aunque `src/graphql/{queries,mutations,subscriptions}.ts` contienen el set completo generado (29 queries, 21 mutations, 21 subscriptions — listados abajo), **solo un subconjunto se invoca**:

| Servicio | Operación | Tipo | Línea |
|---|---|---|---|
| `RacimoAPIService` | `listRACIMOS` | query | `racimo-api.service.ts:48-63` |
| `RacimoAPIService` | `getRACIMO` | query | `racimo-api.service.ts:70-85` |
| `UvaAPIService` | `UVAbyUserID` | query | `uva-api.service.ts:49-71` |
| `UvaAPIService` | `UVAsByRacimoID` | query | `uva-api.service.ts:79-101` |
| `UvaAPIService` | `createUVA` | mutation | `uva-api.service.ts:109-129` |
| `UvaAPIService` | `updateUVA` | mutation | `uva-api.service.ts:138-158` |
| `UserAPIService` | `createUserOnly` (mutation inline custom) | mutation | `user-api.service.ts:31-89` |
| `UserAPIService` | `getUser` | query | `user-api.service.ts:97-112` |
| `UserProgressAPIService` | `createUserProgress` | mutation | `user-progress-api.service.ts:33-50` |
| `MoonPhaseAPIService` | `getMoonPhase` | query (custom resolver) | `moon-phase-api.service.ts:41-56` |

- **`createUserOnly`** es una mutation GraphQL **escrita a mano e inline** dentro de `user-api.service.ts:31-53` (no la generada `createUser`), porque solo selecciona los campos escalares de User sin las conexiones — evita traer relaciones. Tipada como `GeneratedMutation<CreateUserMutationVariables, CreateUserMutation>`.
- **`getMoonPhase($year,$month)`** es un **resolver GraphQL custom** que devuelve `AWSJSON` plano (`queries.ts`, def: `getMoonPhase(year, month)` sin selección de campos de modelo). NO corresponde a un modelo DataStore — es datos astronómicos calculados en backend. Consumido por `moon/moon-phase.service.ts`.
- Consumidores de los API services: `setup.service.ts` (createUser/getUser/createUserProgress) y `setup-racimo.service.ts` (getRACIMO/listRACIMOS/UVAbyUserID/UVAsByRacimoID/createUVA/updateUVA). `setup-racimo.service.ts` genera IDs de UVA secuenciales tipo `UVA_<code>_00001` (`setup-racimo.service.ts:120-150`).

### 5.3 Set completo generado (referencia)
- **queries.ts** (29): `getMoonPhase`, `get/list/sync RACIMOS`, `get/list/sync Measurements` + `measurementsByUvaIDAndTs`, `get/list/sync UserProgresses` + `userProgressesByUserIDAndTs`, `get/list/sync GamificationEvents` + `gamificationEventsByUserIDAndTs` + `gamificationEventsByRacimoIDAndTs`, `get/list/sync AppUsageEvents` + `appUsageEventsByUserIDAndTs` + `appUsageEventsByRacimoIDAndTs`, `get/list/sync Users`, `get/list/sync UVAS` + `UVAbyUserID` + `UVAsByRacimoID`.
- **mutations.ts** (21): `create/update/delete` para los 7 modelos.
- **subscriptions.ts** (21): `onCreate/onUpdate/onDelete` para los 7 modelos. **Ninguna subscription se importa/usa en el código de app** (grep de uso solo encuentra el archivo generado). Las subscriptions las consume DataStore internamente, no la capa app.
- Las queries `sync*` y los campos `_version/_deleted/_lastChangedAt/owner` indican que el backend tiene **conflict detection (versioning) habilitado** — requerido por DataStore.

### 5.4 Manejo de errores de API — `errors-handle/errors-api.service.ts`
- `handleAPIError(err)` (`errors-api.service.ts:22-28`): loguea, y si `err instanceof Error` → `{name:'unexpecteError', mensage, type:'unknown'}`, si no `{name:'unknownerror', ...}`.
- Tipos `errorAPIResponse` y `APIErrorResponse` (`errors-api.service.ts:1-11`), con `type ∈ {validation, network, authentication, unknown}` (aunque en la práctica solo devuelve `unknown`).
- Cada API service inspecciona `response.errors` (errores GraphQL parciales) y los pasa por `handleAPIError` antes del catch (p.ej. `uva-api.service.ts:58-59`). Nota typo `mensage` propagado en toda la base.

---

## 6. S3 — `core/services/storage/s3/s3.service.ts`

- **Solo lectura.** Importa `list`, `downloadData`, `ListAllWithPathOutput`, `StorageError` de `@aws-amplify/storage` (`s3.service.ts:2-7`). **No hay `uploadData`/`put`/`remove`** (grep vacío) → la app no sube nada a S3.
- `listFiles(path)`: `list({ path, options:{ listAll:true } })` y filtra a `Item[]` con `size` definido (`s3.service.ts:85-97`, `:175-190`).
- `getFile(path)`: `downloadData({ path }).result`; según extensión devuelve `JSON` (parseado), `TXT` (texto) o `BLOB` (png/jpg/jpeg/svg vía `.body.blob()`); otros → error "Unsupported file type" (`s3.service.ts:106-167`).
- **Rutas / nivel de acceso**: usa la **API de paths v6** (no `accessLevel`/`identityId`). Las rutas son del tipo `public/racimos/<racimoLinkCode>/...`. El prefijo `public/` implica nivel de acceso **guest/public** del bucket. Construcción de la ruta en `configuration-app.service.ts:15` (`basePath = 'public/racimos'`) + `:292-298` (`pathRacimo = public/racimos/<racimoLinkCode>`).
- Archivos descargados (consumidos por `ConfigurationAppService`): `config.json` (`:101`,`:112`), `measurementRegistration/measurementsRegistration.json` (`:136`), `branding/colors.json` (`:158`), imágenes branding vía `loadImage` (`:189-203`). Estos se persisten en el filesystem del dispositivo (`@capacitor/filesystem`, `Directory.Data`) por `FileSystemService`.
- `handleAuthError` mapea `StorageError.name` a tipos `{S3Validation, network, authentication, unknown}` (`s3.service.ts:198-232`).

> La configuración de cada RACIMO (branding/colores/mediciones) vive en S3 bajo `public/racimos/<code>/` y se baja una vez para operar offline. Es un mecanismo de **white-labeling dinámico** — central para la app y debe replicarse en RN.

---

## 7. Sistema de archivos local — `file-system/file-system.service.ts`

- Wrapper sobre `@capacitor/filesystem` (`Filesystem`, `Directory`, `Encoding`, etc., `file-system.service.ts:1-12`). Métodos `writeFile/readFile/getFileUri/...` usados por `ConfigurationAppService` para persistir lo descargado de S3 y servir imágenes (URI en Android/iOS via `Capacitor.convertFileSrc`, Blob URL en web — `configuration-app.service.ts:189-266`).
- **No es Amplify**, pero es parte integral de la capa de datos (cache de config de RACIMO). En RN debe migrar a `expo-file-system`.

---

## 8. Analytics (Pinpoint)

- `configureAutoTrack` de `aws-amplify/analytics` para `session` y `pageView` (`app.component.ts:69-95`). No se usan `record()` ni `identifyUser()` (grep vacío). Pinpoint appId está en el config (`amplifyconfiguration.json:5-8`).

---

## 9. SECCIÓN OBLIGATORIA — Qué cambia para React Native / Expo

### 9.1 Dependencias nativas requeridas por Amplify v6 en RN
Según la documentación oficial de Amplify Gen 1/v6 para React Native (`docs.amplify.aws` → "Project setup / Use existing resources / React Native"), la librería `@aws-amplify/react-native` requiere instalar y enlazar:
- **`@react-native-async-storage/async-storage`** — reemplaza `window.localStorage`. Amplify v6 lo usa como **key-value storage por defecto para los tokens de Cognito** y para el cache. Sin él, Auth no persiste sesión entre arranques. (En este repo la sesión Cognito se persiste hoy implícitamente en localStorage del WebView.)
- **`@react-native-community/netinfo`** — necesario para que **DataStore detecte el estado de red** (alimenta el evento Hub `networkStatus`). Hoy esa detección la hace el navegador; en RN sin NetInfo, DataStore no sabrá cuándo hay conexión y no disparará sync.
- **`react-native-get-random-values`** — polyfill de `crypto.getRandomValues`, requerido por DataStore/Amplify para generar UUIDs (los `id` de los modelos). Debe importarse **antes** que `aws-amplify`.
- **`@aws-amplify/react-native`** (+ sus peer deps como `@react-native-community/netinfo`, `react-native-get-random-values`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill`) — paquete que adapta Amplify v6 al runtime nativo.
- Con **Expo** estas son librerías con código nativo → requieren **Development Build** (no funcionan en Expo Go). Esto encaja con el destino "Expo + Development Builds".

### 9.2 Adapter de almacenamiento de DataStore (SQLite)
- En web, DataStore usa IndexedDB; en RN el adapter por defecto es **AsyncStorage**, que tiene límites de tamaño/rendimiento. La opción recomendada para volumen de datos (este app guarda Measurements históricas) es el **SQLite adapter**: `@aws-amplify/datastore-storage-adapter` con `SQLiteAdapter`, configurado vía:
  ```ts
  import { DataStore } from '@aws-amplify/datastore';
  import { SQLiteAdapter } from '@aws-amplify/datastore-storage-adapter/SQLiteAdapter';
  DataStore.configure({ storageAdapter: SQLiteAdapter, syncExpressions: [...] });
  ```
  En Expo, `SQLiteAdapter` depende de un módulo SQLite nativo → requiere Development Build. **Decisión a tomar:** AsyncStorage adapter (más simple, suficiente si el volumen local es bajo dado el outbox-only de AppUsageEvent y selective sync) vs SQLite (mejor para histórico de Measurements). Hoy las sync expressions ya limitan el store (sección 4.1), lo que mitiga el problema.

### 9.3 Configuración de Amplify en RN
- `Amplify.configure(config)` funciona igual (es agnóstico de plataforma). Se sigue importando el JSON de `amplifyconfiguration.json`. **Cambio clave:** el `import config from './amplifyconfiguration.json'` (`main.ts:17`) debe moverse al entry-point de RN (p.ej. `App.tsx` o `index.js`), y `react-native-get-random-values` debe importarse antes.
- `DataStore.configure({ syncExpressions })` (`app.component.ts:39-48`) se conserva tal cual; `syncExpression`, predicates (`isUnclean.eq`, `id.eq('')`) son idénticos.
- El `password = phone` y el flujo OTP/MFA SMS no cambian a nivel de API (`signIn`, `confirmSignIn`, `signUp`, `confirmSignUp`, `updateMFAPreference` son los mismos módulos `aws-amplify/auth`). **La lógica de `auth.service.ts`, `setup.service.ts`, `setup-racimo.service.ts` y todos los `*-ds.service.ts` es portable casi 1:1** (no dependen de Angular DI más allá del decorador; los `static` services no usan DI). Esto cumple el objetivo de preservar lógica de negocio.

### 9.4 Hub / listeners — diferencias en RN
- `Hub.listen('datastore', ...)` y `Hub.listen('auth', ...)` (`sync-monitor-ds.service.ts:41-76`) funcionan igual en RN (mismo `aws-amplify/utils`). El evento `networkStatus` **solo se emite si NetInfo está instalado** (sección 9.1).
- ⚠️ El type guard `isAppUsageEvent` depende de `data.model.name === 'AppUsageEvent'` (`sync-monitor-ds.service.ts:140-141`). En un bundle RN con **minificación/Hermes**, `Function.name` puede quedar ofuscado → la limpieza outbox de AppUsageEvent fallaría silenciosamente. Hay que comparar contra la clase importada (`data.model === AppUsageEvent`) o un identificador estable. Mismo riesgo aplica a cualquier dependencia de nombres de clase.

### 9.5 Storage (S3) en RN
- `list`/`downloadData` de `aws-amplify/storage` funcionan en RN. **PERO**: `getFile` usa `response.body.text()` y `response.body.blob()` (`s3.service.ts:129`,`:150`) y luego `btoa`/`atob`/`URL.createObjectURL`/`Blob` (`configuration-app.service.ts:67-69`, `:247-257`). En RN **`Blob`/`URL.createObjectURL` no existen nativamente** y `btoa/atob` no están globalmente disponibles → hay que reemplazar por `expo-file-system` + base64 (`FileSystem.writeAsStringAsync` con `EncodingType.Base64`) o `react-native-blob-util`. La rama `web` de `loadImage` desaparece; la rama `android/ios` (`Capacitor.convertFileSrc`) se reemplaza por URIs `file://` de `expo-file-system`.

### 9.6 Plugins Capacitor a reemplazar (capa de datos)
- `@capacitor/preferences` (sesión, `session.service.ts`) → `@react-native-async-storage/async-storage` (que ya se instala para Amplify) o `expo-secure-store` para datos sensibles.
- `@capacitor/filesystem` (cache de config de RACIMO, `file-system.service.ts`, `configuration-app.service.ts`) → `expo-file-system`.
- `Capacitor.getPlatform()` / `Capacitor.convertFileSrc` (`configuration-app.service.ts:191-223`) → `Platform.OS` de RN + URIs de `expo-file-system`.

### 9.7 Resumen de portabilidad
| Componente | Portabilidad a RN | Nota |
|---|---|---|
| `auth.service.ts`, `test-users.service.ts` | Alta (1:1) | API `aws-amplify/auth` idéntica |
| `setup.service.ts`, `setup-racimo.service.ts` | Alta | quitar `@Injectable`, conservar lógica |
| `*-ds.service.ts` (6 servicios) | Alta | clases con métodos `static`, sin DI real |
| `schema.js` / `models/index.js` | 1:1 | mismo `initSchema` |
| `sync-monitor-ds.service.ts` | Media | Hub OK; arreglar `model.name`, requiere NetInfo |
| API services + `graphql/*` | Alta | `generateClient` igual |
| `s3.service.ts` + `configuration-app.service.ts` | **Baja/Media** | Blob/URL/btoa/atob/Capacitor FS no existen en RN |
| `session.service.ts` | Media | Preferences → AsyncStorage |
| Analytics `configureAutoTrack` | Media | requiere setup Pinpoint RN |

---

## 10. Hallazgos que esperaba y NO encontré (verificado)
- **No** existe `schema.graphql` ni backend Amplify en el repo (`amplify/` solo tiene `.config`). El esquema vive en `schema.json` (codegen input) y `schema.js` (DataStore).
- **No** se usa `fetchAuthSession` en ningún punto → el manejo de tokens/refresh es 100% implícito de Amplify.
- **No** hay `DataStore.stop()`, ni observers reactivos (`observe`/`observeQuery`) — todas las lecturas son `query` puntuales.
- **No** hay uploads a S3 (solo `list` + `downloadData`).
- **No** se importa `@capacitor/network` en TS — la red la reporta DataStore por Hub.
- **No** se usan las GraphQL **subscriptions** ni las queries `sync*`/`list*`/`get*` directamente para la mayoría de modelos (solo el subconjunto de la tabla 5.2). El resto de `graphql/*` es código generado sin consumir.

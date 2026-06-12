# Flujos de usuario y estado global — Discovery (Fase 1, migración Ionic → React Native)

> Documento de descubrimiento. Solo lectura del código fuente. Las afirmaciones llevan referencia `archivo:línea`.
> Objetivo: que un agente pueda traducir flujos y estado a React Navigation + contexts/stores.

## 0. Mapa de rutas (origen Angular Router)

Definición raíz en `src/app/app.routes.ts:3-165`. Rutas con tabs en `src/app/pages/tabs/tabs.routes.ts:4-45`.

Rutas raíz (no-tabs):
- `''` → `SplashAnimationPage` (`app.routes.ts:14-20`).
- `login` → `LoginPage` (`app.routes.ts:9-13`).
- `register` → `RegisterPage` (nombre + apellido) (`app.routes.ts:21-25`).
- `pre-register` → `PreRegisterPage` (`app.routes.ts:31-37`).
- `register/set-phone-register` → `SetPhoneRegisterPage` (`app.routes.ts:38-44`).
- `otp/:type/:phone` → `OtpPage` (`app.routes.ts:26-30`). `:type` ∈ {`login`,`register`}.
- `otp/:type/:phone/validate-code` → `ValidateCodePage` (`app.routes.ts:45-51`).
- `register/project-vinculation` → `ProjectVinculationPage` (`app.routes.ts:52-58`).
- `register/validate-project` → `ValidateProjectPage` (`app.routes.ts:59-65`).
- `register/project-vinculation-done` → `ProjectVinculationDonePage` (`app.routes.ts:66-72`).
- `register/register-project-form` → `RegisterProjectFormPage` (`app.routes.ts:73-79`).
- `register/register-completed` → `RegisterCompletedPage` (`app.routes.ts:80-86`).
- `register-success` → `RegisterSuccessPage` (`app.routes.ts:158-164`).
- `register-measurement` y `register-measurement-new` → ambos `RegisterMeasurementPage` (`app.routes.ts:144-157`).
- `measurement-detail`, `moon-phase`, `profile`, `personal-info`, `achievement`, `configuration`, `alerts`, `alerts/creation` → páginas sueltas (`app.routes.ts:88-143`).
- `home` → `MeasurementPage` (alias suelto; OJO: duplica `app/tabs/register`) (`app.routes.ts:88-93`).

Rutas con tabs (`tabs.routes.ts`): `app/tabs/home` → `HomePage`, `app/tabs/moon-phase` → `MoonPhasePage`, `app/tabs/register` → `MeasurementPage`, `app/tabs/history` → `HistoricalPage`. Default → `tabs/home`.

> Riesgo de migración: la pestaña "registro de medición" se sirve por DOS rutas (`app/tabs/register` y la suelta `register-measurement-new`), y `MeasurementPage` (lista de tareas) aparece bajo tres rutas distintas (`home` suelto, `app/tabs/register`). En React Navigation hay que consolidar.

---

## 1. Estado global compartido (mapa para contexts/stores de React)

Hay CUATRO mecanismos de estado global, ninguno es un store reactivo unificado. Esto es lo más crítico de mapear.

### 1.1 Sesión persistida — Capacitor Preferences (clave-valor en disco)
- Servicio: `SessionService` (`src/app/core/services/session/session.service.ts`).
- Backing store: `@capacitor/preferences` (`session.service.ts:3`).
- Modelo: `Session` con claves `userID, name, lastName, phone, racimoID, uvaID, racimoName, racimoLinkCode, racimoConfiguration` (`src/models/session.model.ts:1-23`).
- API: `setInfo` (`session.service.ts:16-23`), `getInfo` (`30-44`), `setInfoField` (`52-67`, si `value===undefined` hace `remove`), `clearSession` → `Preferences.clear()` (`74-76`).
- **Escritores**: `SetupService.signIn/signUp/confirm*/currentAuthenticatedUser/setParametersUser` (`setup.service.ts:55,107-110,125-126,174-178`), `SetupRacimoService` (racimoID/uvaID/racimoName/racimoLinkCode/racimoConfiguration: `setup-racimo.service.ts:90-95,148,202,223-228`), `SplashAnimationPage.continueWithAuthenticatedFlow` (`splash-animation.page.ts:152,184-186`).
- **Lectores**: prácticamente todos los DS services (`MeasurementDSService.session`, `UserProgressDSService.session`, etc. ver §1.4) y páginas (`measurement.page.ts:130`, `home.page.ts`, etc.).
- Para React: candidato a **SessionContext / store persistido** (AsyncStorage o expo-secure-store). NO es reactivo hoy — los lectores hacen `await getInfo()` puntual; en React conviene un store con suscripción para que la UI reaccione.

### 1.2 Estado de sincronización DataStore — campos estáticos en clase
- Servicio: `SyncMonitorDSService` (`src/app/core/services/storage/datastore/sync-monitor-ds.service.ts`).
- `static state: STATE_SYNC_DS` (enum `NOINIT|UNSYNC|SYNC|READY`) (`sync-monitor-ds.service.ts:6-11,20`).
- `static networkStatus: boolean` (`:21`).
- `static isSubscribed`, `static appUsageServiceInstance` (`:22-23`).
- Se actualiza vía `Hub.listen('datastore', …)` por eventos `networkStatus|outboxMutationEnqueued|outboxMutationProcessed|syncQueriesReady|ready` (`:41-70`). En `signedOut` limpia DataStore (`:72-77`).
- **Lectores**: `ProjectVinculationPage` (`waitForSyncDataStore`, `:85,88`), `SplashAnimationPage` (`:77,86`), `ConfigurationPage.ionViewWillEnter` (`configuration.page.ts:132-133`), `ConfigurationPage.syncData` (`:252`).
- `waitForSyncDataStore()` hace polling cada 100ms hasta `state===READY` tras `DataStore.start()` (`:96-106`).
- Para React: **SyncContext** (estado de red + estado de sync). Hoy es un singleton estático mutado por Hub; en React se modela con un provider que suscribe al Hub de Amplify y expone `{state, networkStatus, synchronizedData()}`.

### 1.3 Contador de notificaciones no leídas — único BehaviorSubject RxJS
- Servicio: `NotificationService` de gamificación (`src/app/core/services/view/gamification/notification.service.ts`).
- `private unreadCountSubject = new BehaviorSubject<number>(0)`; expone `unreadCount$` (`notification.service.ts:8-10`). **Es el ÚNICO `BehaviorSubject/Subject` compartido en toda la app** (verificado por grep).
- API: `updateUnreadCount(n)` (`:21`), `getUnreadCount()` (`:29`), `hasUnreadNotifications()` (`:37`).
- **Escritores**: `ProfilePage.loadUnreadCount` (`profile.page.ts:187`), `AlertsPage.updateUnreadCount` (`alerts.page.ts:82`).
- **Lectores/suscriptores**: `ProfilePage.ionViewWillEnter` se suscribe a `unreadCount$` y cambia el ícono de la campana (`profile.page.ts:165-171`).
- Para React: este sí es reactivo → mapea a un **NotificationContext** o estado en Zustand/Redux con `unreadCount`.

> ADVERTENCIA: la suscripción en `ProfilePage.ionViewWillEnter` (`profile.page.ts:165`) no se desuscribe → fuga potencial. En React usar `useEffect` con cleanup.

### 1.4 Estado de cachés en memoria — `ConfigurationAppService` (singleton Angular)
- `ConfigurationAppService` (`providedIn:'root'`) cachea en memoria: `configApp`, `configMeasurement`, `configColors` y `pathRacimo` (`configuration-app.service.ts:15-19`). Los getters memoizan: solo recargan de FileSystem si la propiedad es `null` (`:111-124, 135-147, 157-169`).
- Para React: **ConfigContext** que carga una vez (de FileSystem) la config del RACIMO y la expone. El branding aplica variables CSS vía `applyColors` (`:273-285`) — en RN esto NO existe; ver Riesgos.

### 1.5 Servicios DataStore con `static session = new SessionService()`
Patrón repetido: cada DS service instancia su propio `SessionService` estático para leer `userID/uvaID/racimoID` (`measurement-ds.service.ts:9`, `user-progress-ds.service.ts:15`, `gamification-event-ds.service.ts:13`, `user-ds.service.ts:14`, `uva-ds.service.ts:16`). Son clases con métodos **estáticos** (no inyectables). `GamificationService extends UserProgressDSService` (`gamification.service.ts:19`); `MoonPhaseService extends MoonPhaseAPIService` (`moon-phase.service.ts:93`).

### 1.6 Otros estados persistidos en Preferences (NO en `Session`)
- `lastMeasurementValues` — buffer entre flujos encadenados de medición (`register-measurement.page.ts:384,484,522`).
- `notificationPermissionGrantedUser` (`notificationKey`) — toggle de notificaciones del usuario (`services/notification/notification.service.ts:7,206,222`).
- `notificationPermissionProgrammed` (`notificationProgrammedKey`) — flag de "ya programadas" (`:8,106,181,197`).

### 1.7 Estado puramente local de cada página (no global, pero a migrar)
- Visibilidad de modales: objetos `modals: Record<string,boolean>` en `home.page.ts:62-67`, `profile.page.ts:115-117`, `achievement.page.ts:38-41`, `personal-info.page.ts:120-123`. Se abren/cierran con `cdr.detectChanges()`.
- `MeasurementPage`: `tasks`, `tasksCompleted`, `userProgress`, `showBonus`, `OpenModalSurprise` (`measurement.page.ts:95-108`).
- `HistoricalPage`: `timeFrame`, `typeView`, `variables`, `measureSelected`, índices de mes/año (`historical.page.ts:72-89`).

---

## 2. Flujo de REGISTRO (sign-up completo)

### Diagrama (pasos numerados → archivo responsable)
1. `LoginPage` → botón "registrarme" llama `goToRegister()` → navega a `pre-register` (`login.page.ts:81-83`). También se llega desde el modal "no registrado" (`login.page.ts:168-169`).
2. `PreRegisterPage`: checkbox de términos habilita botón (`checkTerm`, `pre-register.page.ts:47-50`); `goToRegister()` → navega a `register` (`:57-59`).
3. `RegisterPage`: form `name`+`lastName` (min 3) (`register.page.ts:53-59`). `goToSetNumber()` → `SetupService.setParametersUser(name,lastName)` (guarda en Preferences) → navega `register/set-phone-register` (`register.page.ts:67-73`; `setup.service.ts:107-110`).
4. `SetPhoneRegisterPage`: `ngOnInit` carga `user` desde sesión (`set-phone-register.page.ts:71-73`). Form `phone` (exactamente 10 dígitos) (`:53-62`). Al confirmar el modal de número → `SetupService.signUp('+57'+phone)` (`:107-108`).
   - `signUp` lee `name/lastName` de sesión, llama `AuthService.SignUp(name,phone,lastName)` (Cognito `signUp` con `username=password=phone`) (`setup.service.ts:118-135`; `auth.service.ts:192-215`). Si OK guarda `userID` y `phone` (`setup.service.ts:125-126`). Si `UsernameExistsException` → reenvía código (`:130-132`).
   - Éxito → navega `otp/register/:phone` (`set-phone-register.page.ts:111-114`).
5. `OtpPage` (`type='register'`): timer 60s (`otp.page.ts:77-93`); al completar 6 dígitos `validateForm()` (`:171-227`) → `SetupService.confirmSignUp(otp)` (`:208`) → `AuthService.ConfirmSignUp(phone, code)` (Cognito `confirmSignUp`) (`setup.service.ts:143-150`; `auth.service.ts:223-235`). Si OK navega `otp/register/:phone/validate-code` (`otp.page.ts:214-216`). Reenvío: `resetTime()` → `reSendCodeSignUp()` (`otp.page.ts:151-165`; `setup.service.ts:157-163`).
6. `ValidateCodePage` (`type='register'`): muestra loader 2s y navega a `register-success` (`validate-code.page.ts:34-43`).
7. `RegisterSuccessPage`: botón → `goToLogin()` reemplaza URL por `/login` (`register-success.page.ts:28-30`).

> NOTA IMPORTANTE: tras `register` el usuario NO entra directo al home. Va a `register-success` → `login` y debe **iniciar sesión de nuevo** (camino login, §3). La vinculación a RACIMO/UVA ocurre en el camino de login, no en el de registro.

### Persistencia (qué y cuándo)
- `name/lastName` → Preferences en paso 3 (`setup.service.ts:108-109`).
- `userID/phone` → Preferences en paso 4 al `signUp` exitoso (`setup.service.ts:125-126`).
- Usuario en backend (`User` + `UserProgress`) se crea más tarde en `createNewUser()` durante login (§3, paso 5). El registro Cognito ≠ registro en GraphQL.

### Bordes
- Sin red durante `signUp`/`confirmSignUp`: `AuthService.handleAuthError` mapea `NetworkError` → `{type:'network'}` (`auth.service.ts:82-83`), pero `SetPhoneRegisterPage` solo loguea "El numero ya esta registrado" (FIXME, `:116-117`). No hay UI de error de red.
- Código OTP incorrecto: `confirmSignUp` retorna `false` → `showError=true` (`otp.page.ts:209-212`).

---

## 3. Flujo de LOGIN + OTP + validate-code (+ usuarios de prueba)

### Diagrama
1. `LoginPage`: form `phone` (10 dígitos) (`login.page.ts:57-66`). `goToOtp()` → modal de confirmación de número (`abrirModal`, `:98-142`). Al "OK":
2. `SetupService.signIn('+57'+phone)` (`login.page.ts:115-117`) → `AuthService.SignIn` (Cognito `signIn` con `username=password=phone`) (`setup.service.ts:52-62`; `auth.service.ts:116-140`).
   - Guarda `phone` en sesión (`setup.service.ts:55`).
   - **MFA / usuarios de prueba**: si NO es usuario de prueba y `isSignedIn`, fuerza MFA SMS `PREFERRED` (`auth.service.ts:121-126,146-152`). La lista de prueba está en `TestUsersService.testUsers` (`+570000000000, +573000000000..3, +573007586230`) (`test-users.service.ts:10-19`); `isTestUser(phone)` compara el string completo con `+57` (`:30-32`).
   - **Bypass de OTP**: si `signInResponse.isSignedIn === true` (usuarios de prueba no requieren segundo factor) → en `LoginPage` se llama `createNewUser()` y navega DIRECTO a `register/project-vinculation` SIN OTP (`login.page.ts:124-127`). Si requiere MFA (`isSignedIn===false`) → navega `otp/login/:phone` (`:128-133`).
   - `UserNotFoundException` → abre modal "no registrado" → ofrece ir a registro (`login.page.ts:119-121,149-177`).
3. `OtpPage` (`type='login'`): al completar OTP, si NO hay usuario autenticado aún → `confirmSignIn(otp)` (`otp.page.ts:176-182`; `setup.service.ts:70-76` → `auth.service.ts:159-170`). Luego `createNewUser()` (`otp.page.ts:185`).
4. `createNewUser()` (`setup.service.ts:189-220`): lee `userID/name/lastName/phone` de sesión; consulta `userAPI.getUser({id})`; si NO existe crea `User` (GraphQL) y `UserProgress` inicial `{Seed:0, Streak:0, ts:now}` (`:203-216`). Devuelve true si ya existía o se creó.
5. Éxito → navega `otp/login/:phone/validate-code` (`otp.page.ts:186-189`).
6. `ValidateCodePage` (`type='login'`): loader 2s → navega `register/project-vinculation` (`validate-code.page.ts:36-37`).

### Persistencia
- `phone` en sesión (`setup.service.ts:55`). Tras `currentAuthenticatedUser()` se llenan `userID/name/lastName/phone` desde atributos Cognito (`setup.service.ts:170-182`).
- `User` y `UserProgress` en GraphQL/DataStore en paso 4.

### Bordes
- `confirmSignIn` falla → `showError=true` (`otp.page.ts:178-182`).
- `createNewUser()` falla → alerta nativa "No se pudo crear el usuario" (`otp.page.ts:191-202`).
- Reenvío OTP login: `resetTime()` → `reSendCodeSignIn()` → reusa `signIn(phone)` con `phone` de sesión (`otp.page.ts:153-154`; `setup.service.ts:83-89`).
- Sin sesión / sin red: el splash decide (§7).

---

## 4. Vinculación a RACIMO/UVA (puente entre auth y home)

Tras login (paso 6 de §3) se entra a `register/project-vinculation`. Esta sub-fase decide si el usuario ya tiene UVA (va al home) o debe crear/validar proyecto.

### Diagrama
1. `ProjectVinculationPage.ngOnInit` (`project-vinculation.page.ts:79-95`): lee `user` de sesión; si `userID`:
   - `SetupRacimoService.getUVA(userID)` (`setup-racimo.service.ts:77-111`): consulta `uvaAPI.getUVAByUser`; si hay UVA guarda `racimoID/uvaID/racimoLinkCode` en sesión y retorna true.
   - Si tiene UVA y NO existe config local (`configuration.configExists()`, `:84`): `waitForSyncDataStore()` y navega `register/validate-project` (`:85-86`).
   - Si tiene UVA y SÍ existe config: `waitForSyncDataStore()` y navega `app/tabs/home` (`:88-89`).
   - Si NO tiene UVA: queda en la pantalla para ingresar el código de RACIMO (6 chars) (form `code`, `:62-71`).
2. Ingresar código → `goToValidateProject()` → `SetupRacimoService.getRACIMOByCode(code)` (`project-vinculation.page.ts:102-115`; `setup-racimo.service.ts:186-208`). Guarda `racimoID`, luego `getRACIMOByID` guarda `racimoName/racimoLinkCode/racimoConfiguration` (`:215-233`). Éxito → `register/validate-project`; falla → `showError=true`.
3. `ValidateProjectPage.ngOnInit` → `startTimerAndDownload()` (`validate-project.page.ts:41-81`): en paralelo descarga config (`config.downLoadData()`, S3→FileSystem) y fases lunares (`moonphase.downloadAndStoreMoonPhaseData()`, 24 meses) más un timer de 2s. Si AMBAS OK → `loadBranding()` y navega `register/project-vinculation-done`; si falla → vuelve a `register/project-vinculation` (`:75-80`).
4. `ProjectVinculationDonePage.ngOnInit` (`project-vinculation-done.page.ts:33-46`): lee config, muestra logo del branding, espera 3s → navega `register/register-project-form`.
5. `RegisterProjectFormPage.ngOnInit` (`register-project-form.page.ts:62-82`): si el user YA tiene UVA → salta a `register/register-completed` (`:66-69`). Si no, construye form dinámico desde `configModel.fieldsUVA` (`buildForm`, `:89-101`).
6. `goToCompleted()` (`register-project-form.page.ts:106-119`): `SetupRacimoService.createNewUVA()` (genera id `UVA_<code>_<00000+1>`, crea UVA en GraphQL, guarda `uvaID`) (`setup-racimo.service.ts:117-151`) + `updateUVA(JSON fields)` (`:161-179`). Éxito → `register/register-completed`.
7. `RegisterCompletedPage.ngOnInit`: espera 3s → navega `app/tabs/home` (`register-completed.page.ts:34-38`).

### Bordes
- Sin red en `validate-project`: `downLoadData`/`downloadAndStoreMoonPhaseData` fallan → vuelve a `project-vinculation` (`validate-project.page.ts:78-79`). No hay mensaje explícito de "sin internet".
- Config requiere `racimoLinkCode` en sesión: `getPathRacimo()` devuelve false sin él y aborta descargas (`configuration-app.service.ts:292-299`).

---

## 5. Flujo de MEDICIÓN (home → selección → guía → registro → DataStore → gamificación)

### 5.1 Cómo se define cada tipo de medición
Toda la configuración de medición vive en un JSON descargado de S3 (`measurementsRegistration.json`) y se tipa con `MeasurementModel` (`src/models/configuration/measurements.model.ts:132-139`). Estructura:
- `tasks: Record<string,Task>` — cada `Task` tiene `name`, `flows: string[]`, `restrictions` (activeDays/activeTime/activeDuration/requiredTask) (`measurements.model.ts:1-34`).
- `flows: Record<string,Flow>` — cada `Flow` tiene `guides: string[]`, `measurements: string[]`, `restrictions?: Record<string,FlowRestriction>` (con `validationFunction`), `nextFlow: string|null` (`:36-50`).
- `guides: Record<string,Guide>` — `icon`, `image`, `text` (HTML), `nextGuide`, `showAutomatic?` (`:52-59`).
- `measurements: Record<string,Measurement>` — `fields` (nº de dígitos), `unit`, `range{min,max,optionalMessage}`, `style`, `icon`. En runtime se añaden `fieldsArray`, `value`, `id`, `showRestrictionAlert`, `textRestrictionAlert` (`:69-82`).
- `bonus: Record<string,Bonus>` — `schedule{daysOfWeek,occurrences}`, `months`, `seedReward` (`:122-130`).
- `historical: Historical[]` — para gráficas (`:100-120`).

Carga: `ConfigurationAppService.getConfigurationMeasurement()` lee `<racimo>/measurementRegistration/measurementsRegistration.json` desde `Directory.Data` y memoiza (`configuration-app.service.ts:131-147`).

### 5.2 Diagrama del flujo
1. `HomePage` (pestaña home): muestra fecha, progreso semanal, calendario, tarjeta lunar. En `ionViewWillEnter` carga `userProgress` (`UserProgressDSService.getLastUserProgress`), fase lunar (`moonphase.getCurrentPhase`) y `getCompleteTaskWeek(totalTask)` (`home.page.ts:155-167`). NO inicia la medición directamente — la lista de tareas está en `MeasurementPage` (pestaña `register`).
2. `MeasurementPage` (pestaña selección de medición): `ngOnInit` carga config y `totalTask = countTasks(config)` (`measurement.page.ts:129-138`). `getDataMeasurement()` arma `this.tasks` desde `config.tasks`, consulta mediciones del día (`MeasurementDSService.getMeasurementsByDay`) y reparte tareas completas/incompletas (`measurement.page.ts:157-272`). El "bonus sorpresa" (`moniliacisis`) se evalúa por semana/mes/día (`:163-201`).
3. Usuario toca una tarea → `goToRegister(task)` (`measurement.page.ts:388-408`):
   - Si la tarea tiene restricción de horario activa y el usuario NO es de prueba → no hace nada (`hasRestrictionTimeTask`, `:426-448`).
   - Encuentra el primer `flow` no completado y navega `register-measurement-new` con `queryParams {flowId, taskId}` (`:400-405`).
4. `RegisterMeasurementPage.ngOnInit` (`register-measurement.page.ts:128-184`): carga config, lee `flowId/taskId` de queryParams, arma `this.measurement` mapeando `flow.measurements` → objetos `Measurement` con `fieldsArray` y carga iconos vía `configuration.loadImage` (`:147-171`). Si el flow tiene guías y `showAutomatic`, abre la guía automáticamente (`:172-180`).
5. **Guía** (`GuideMeasurementComponent`): se presenta como modal Ionic (`OpenGuide`, `register-measurement.page.ts:199-227`). El componente carga imagen/icono y renderiza `text` como HTML (`SafeHtmlPipe`) (`guide-measurement.component.ts:74-89`). "Continuar" devuelve `{nextGuide}` y se encadena la siguiente guía (`:96-101`; `register-measurement.page.ts:219-223`).
6. **Captura**: inputs por dígito; `onDigitsChange` arma `value = Number(fieldsArray.join(''))` (`register-measurement.page.ts:255-300`).
7. `save()` (`register-measurement.page.ts:315-373`):
   - Valida que todas las mediciones tengan valor (`:316-322`) y estén en rango `[min,max]` (`:323-340`).
   - Si el flow tiene `restrictions` → `validateRestriction()` (compara contra `lastMeasurementValues` con la función embebida `'0:>:1'`; si falla pone `showRestrictionAlert` y lanza error) (`:341-343,380-476`).
   - Construye `measurementDate: Record<id,value>` y llama `MeasurementDSService.addMeasurement('RAW', data, {}, now, taskId)` (`:359-372`).
8. `MeasurementDSService.addMeasurement` (`measurement-ds.service.ts:19-42`): lee `uvaID` de sesión, hace `DataStore.save(new Measurement({type, data:JSON, logs:JSON, ts, task, uvaID}))`. Offline-first: se encola y sincroniza después.
9. `goToNexFlowOrSavePreference()` (`register-measurement.page.ts:482-528`):
   - Si NO hay `nextFlow`: borra `lastMeasurementValues`, cierra modal, y **dispara gamificación**: `GamificationService.completeTaskProcess(totalTask)` (`:492`), luego navega `app/tabs/register?update=true` y fuerza `window.location.reload()` (`:494-503`).
   - Si HAY `nextFlow`: guarda valores actuales en `lastMeasurementValues` (Preferences) para el siguiente flow (`:514-526`). `goToComplete()` navega al siguiente flow con `backButtom:false` (`:534-552`).

### 5.3 Gamificación disparada al guardar (detalle en §6)
`GamificationService.completeTaskProcess(totalTask)` (`gamification.service.ts:178-275`) actualiza `UserProgress` y crea alertas.

### Bordes
- Mediciones vacías o fuera de rango: `save()` retorna sin guardar (`register-measurement.page.ts:320,338`). Mensaje de error vía `getMessageError` (`:559-571`).
- Restricción de horario: bloquea navegación a registro salvo usuarios de prueba (`measurement.page.ts:389-394`).
- `window.location.reload()` (`:503`) es un anti-patrón web; **no existe en RN** (ver Riesgos).

---

## 6. Flujo de GAMIFICACIÓN (logros, rachas, alertas, notificaciones locales)

### 6.1 Modelo de progreso
`UserProgress` (DataStore) con `Seed, Streak, Milestones, SaveStreak, completedTasks, additionalInfo, userID, ts` (`user-progress-ds.service.ts:23-47`).

### 6.2 Eventos que disparan cambios (mapa completo)
- **Completar tareas** → `completeTaskProcess(totalTask)` (`gamification.service.ts:178-275`):
  - Primera tarea del día (`completedTasks===0`): `Seed+1` y alerta `createFirstTaskAlert` (`:212-215,238-239`).
  - Todas completas (`newCompletedTasks>=totalTask`): `Seed+1`, `Streak+1`, alerta `createAllTasksAlert`, llama `streakBonus()`, y si `streak%7!==0 && streak%3===0` → `createStreakProgressAlert(streak)` (`:216-251`).
  - Reintentos: hasta 3 con backoff exponencial (`:179-271`).
- **Bonus de racha de 7 días** → `streakBonus()` (`:395-418`): si `Streak%7===0` suma `+3` semillas y `createStreakRewardAlert(streak)`.
- **Tarea sorpresa** (modal bonus en home) → `surpriseTaskProcess()` `Seed+1` (`measurement.page.ts:414-419`; `gamification.service.ts:281-300`).
- **Recuperar racha** (pagando 5 semillas) → `recoverStreak()` (`gamification.service.ts:306-389`): cuesta 5 semillas, recalcula racha de ayer/hoy, `createStreakRecoveredAlert`. Se invoca desde `MeasurementDetailPage.openModal` (`measurement-detail.page.ts:369`).
- **Apertura/recalculo diario** → `getLastUserProgress()` (`user-progress-ds.service.ts:119-171`) tiene EFECTOS SECUNDARIOS:
  - Si pasó 1 día: crea progreso nuevo manteniendo racha; si ayer hubo 0 tareas pero había racha → `createStreakRecoveryAlert` (`:144-160`).
  - Si pasó >1 día: reinicia racha y `createStreakLostAlert` (`:161-169`).
  - Hitos mensuales: `handleMilestoneAssignment` convierte semillas a `brote/plantula/flor` y crea `createGerminationSuccessAlert`/`createGerminationFailAlert` (`:385-442`; umbrales en `seedToMilestone` `:365-378`).
  > Riesgo: `getLastUserProgress()` se llama desde MUCHAS pantallas en `ngOnInit/ionViewWillEnter` (home, profile, historical, measurement, header, measurement-detail) y muta estado/crea alertas como efecto colateral. En React, separar lectura de side-effects.

### 6.3 Alertas (eventos de gamificación)
- `GamificationAlertsService` crea eventos vía `GamificationEventDSService.createGamificationEvent(eventType, JSON(data))` (`gamification-alerts.service.ts:31-222`; `gamification-event-ds.service.ts:23-49`).
- Subtipos y mensajes (15 variantes c/u) en `eventMessages` (`gamification-alerts-types.service.ts:60-204`). Tipos: `seeds|streak|achievement|bonus`; subtipos: `first_task|all_tasks|streak_reward|germination_success|germination_fail|streak_recovery|streak_recovered|streak_lost|streak_progress` (`:14-29`).
- Lectura para UI: `getNotifications(limit)` mapea eventos a `GamificationNotification{title, description, isUnread, timestamp, type, subtype}` (`gamification-alerts.service.ts:228-291`). `markNotificationAsRead` (`:392-418`), `deleteAllNotifications` → `markAllAsClean` (`:424-426`).
- `GamificationEventDSService.getGamificationEvents` filtra por `userID && isUnclean===true` (`gamification-event-ds.service.ts:57-76`). Sync expression: solo se sincronizan `GamificationEvent` con `isUnclean===true` (`app.component.ts:41-43`).

### 6.4 Pantallas de gamificación
- `AlertsPage` (`profile/alerts`): lista notificaciones, marca leídas, borra todas, actualiza `unreadCount` (§1.3) (`alerts.page.ts:34-83`). Iconos por tipo/subtipo (`:90-139`).
- `AchievementPage`: lee `getMilestones()` y pinta iconos `brote/plantula/flor` (`achievement.page.ts:46-78`).
- `CreationPage` (`alerts/creation`): pantalla de debug que crea alertas manualmente (`creation.page.ts:24-127`).
- `ProfilePage`: campana refleja `unreadCount$` (`profile.page.ts:165-171`).

### 6.5 Notificaciones locales (recordatorios programados) — distinto de las alertas
- Servicio local: `src/app/services/notification/notification.service.ts` (OJO: hay DOS `NotificationService`; este usa `@capacitor/local-notifications`).
- `scheduleDailyNotifications(6, 18)` programa 2 notificaciones diarias repetidas (`:96-189`); requiere permisos (`requestPermissions`, `:59-88`), canal Android (`createNotificationChannels`, `:238-260`), permiso de alarma exacta Android 12+ (`:266-290`).
- Se programan desde `HomePage.setNotifications` si el usuario las habilitó (`home.page.ts:182-188`).
- Se gestionan desde `ConfigurationPage` (toggle `activeNoti` → `setEnableNotifications` → schedule/cancel) (`configuration.page.ts:211-246`; `services/notification/notification.service.ts:221-232`).

### Bordes
- Sin permisos: `scheduleDailyNotifications` aborta con log (`services/notification/notification.service.ts:100-103`).
- Ya programadas: no reprograma (flag `notificationProgrammedKey`) (`:105-114`).

---

## 7. Flujo de ARRANQUE / SPLASH (decisión de sesión, offline-first)

`SplashAnimationPage.checkUserAuthentication()` (`splash-animation.page.ts:71-142`):
1. Espera sync de DataStore (`waitForSyncDataStore`, `:77`).
2. `UserDSService.getUser()` (local) (`:80`).
3. Si hay usuario local Y hay red → valida con Cognito (`CurrentAuthenticatedUser`); si falla → `/login`; si OK → `continueWithAuthenticatedFlow(userId)` (`:86-108`).
4. Si hay usuario local SIN red → usa `sessionInfo.userID` y continúa offline (`:109-121`).
5. Si NO hay usuario local → exige auth Cognito fresca; falla → `/login` (`:122-137`).
6. `continueWithAuthenticatedFlow` (`:148-199`): guarda `userID`; busca UVA (`UvaDSService.getUVAByuserID`); sin UVA o sin `racimoID` → `register/validate-project`; con `racimoCode` (`RacimoDSService.getRacimoCode`) guarda `uvaID/racimoID/racimoLinkCode` y → `app/tabs/home`.
- La navegación espera a que termine la animación (`waitForAnimationToEnd`, `:206-215`).

### Bordes
- Sin red + sin `userID` en sesión → `/login` (`:117-119`).
- Inconsistencia (UVA sin user) → retorna sin navegar (`:172-176`).

---

## 8. Flujo HISTÓRICO (historical → time-frame → measurement-detail)

### 8.1 `HistoricalPage`
- `ngOnInit` (`historical.page.ts:115-123`): `initializeRegisters` (`getCountTasksByMonthYear`), `initializeCompletedTasks` (12 meses en paralelo, `getCompletedTasksByMonthYear(year,month,3)`), carga config y `initializeVariables(historical)`.
- `TimeFrameComponent` (`time-frame/`): segmento `month|year`, emite `segmentChange` (`time-frame.component.ts:17-28`); `HistoricalPage.changeSegment` recalcula variables (`historical.page.ts:161-179`).
- `typeView` alterna `calendar|chart` (`changeModeData`, `:141-154`).
- **Datos consultados**: por mes `MeasurementDSService.getMeasurementsByMont(year,month)` (`measurement-ds.service.ts:93-116`); por año `getMeasurementsByDateRange(jan1,dec31)` (`historical.page.ts:512-526`; `measurement-ds.service.ts:71-86`).
- **Agregación por rango**: `transformData` reagrupa por id de medición y ordena por ts (`:631-659`); `calculateMeasurement` agrupa por día (`YYYY-MM-DD`) y aplica `sum|mean` (`:708-752`); `calculateDetailedMeasurement` saca `avg/min/max` diarios para gráficas de línea (`:762-803`); `calculateOverallStats` saca min/max/avg globales (`:812-871`). El `aggregationFunction` viene de `Historical.aggregationFunction` (`measurements.model.ts:106`).
- Gráfica: `AreachartComponent.UpdateChart(...)` (Chart.js) con labels/data/colores/tipo (`historical.page.ts:384-446`).
- Compartir: `shareMonthlyReport()` genera imagen con `EnvironmentalReportService.generateReportImage` y comparte con `ShareService`; fallback a texto (`:892-1078`). Usa `LoadingController` con timeout y un loader DOM manual (`showAlternativeLoader`, `:1234-1289`) → **incompatible con RN**.

### 8.2 Navegación a detalle
- Desde `HistoricalPage.goToDetail($event)` (clic de día de calendario) → navega `measurement-detail` con `queryParams {...$event, origin:'history'}`, ignorando días futuros (`:295-302`). Igual desde `HomePage.goToDetail` con `origin:'home'` (`home.page.ts:203-210`).

### 8.3 `MeasurementDetailPage`
- `ngOnInit` (`measurement-detail.page.ts:91-94`): `initializeUserProgress` (setea `showAlert_incomplete = Seed<5`) y se suscribe a queryParams.
- `processRouteParams` (`:126-146`): determina `backRoute` según `origin`, formatea fecha, carga tareas/mediciones del día (`loadTasksAndMeasurements`, `:154-180`) consultando `MeasurementDSService.getMeasurementsByDay` y la config.
- Agrupa mediciones por tarea (`groupRemainingLazyMeasurements`, `:264-339`) y separa completas/incompletas.
- Recuperar racha: `openModal()` cobra 5 semillas → `GamificationService.recoverStreak()` (`:348-380`).

### Bordes
- Datos vacíos: `transformData`/`calculateMeasurement` devuelven objetos vacíos → gráfica con arrays vacíos (`historical.page.ts:398-410, 433-445`).
- Año futuro deshabilitado (`isNextYearDisabled`, `:318-320`).

---

## 9. Flujo de SINCRONIZACIÓN (manual y automática)

### 9.1 Automática (DataStore + Hub)
- Configuración: `main.ts:19` `Amplify.configure`; `AppComponent` configura `syncExpressions` (solo `GamificationEvent.isUnclean===true`; nunca traer `AppUsageEvent` de la nube) (`app.component.ts:39-48`).
- `SyncMonitorDSService.subscribeToSync()` se llama en `platform.ready()` (`app.component.ts:54`). Escucha eventos del Hub y actualiza `state`/`networkStatus` (§1.2). En `outboxMutationProcessed` de `AppUsageEvent` borra el registro local sincronizado (`sync-monitor-ds.service.ts:52-60`; `app-usage.service.ts:39-52`).
- `waitForSyncDataStore()` hace `DataStore.start()` y espera `READY` (`sync-monitor-ds.service.ts:96-106`). Lo usan splash y project-vinculation.
- En `auth signedOut` → `DataStore.clear()` (`sync-monitor-ds.service.ts:72-77`); también en `ProfilePage.goBack('/login')` (`profile.page.ts:237`).

### 9.2 Manual (`profile/configuration` + `sync-action`)
- `ConfigurationPage.ionViewWillEnter`: `isDataStoreSyncPending = !synchronizedData()`, `isConfigurationAppAvailible = networkStatus` (`configuration.page.ts:131-133`).
- `syncData()`: si hay red → `DataStore.start()`; si no → toast "Necesita internet" (`:251-259`).
- `updateConfiguration()`: re-descarga config + fases lunares con loader (`:265-297`).
- `SyncActionComponent` (`sync-action/`): UI tonta con `@Input` (isInfoPending, textos, título, botón) y `@Output clickSync` (`sync-action.component.ts:17-34`). El padre conecta el click a `syncData`.

### Bordes
- Sin red en sync manual: toast de error (`configuration.page.ts:254-257`).
- `App.addListener('appStateChange')` refresca estado al volver de ajustes del sistema (`configuration.page.ts:152-159`) — Capacitor App API.

---

## 10. Fase lunar (contexto, no flujo principal)
- `MoonPhaseService extends MoonPhaseAPIService` (`moon-phase.service.ts:93`). Descarga 24 meses de fases y las guarda como JSON por mes en `Directory.Data` (`downloadAndStoreMoonPhaseData`, `:121-180`). El parseo del response hace reemplazos de string frágiles (`:147-155`).
- `getCurrentPhase()` lee el archivo del mes y mapea a `LunarPhase` (`:186-211`). `getMonthPhases()`, `getNextMoonEvents()` (`:217-356`).
- Consumido por `HomePage` (tarjeta lunar, `home.page.ts:160-163`) y `MoonPhasePage`.

---

## 11. Resumen del mapa de estado para React (traducción sugerida)

| Estado actual | Mecanismo Angular | Reactivo hoy | Destino React |
|---|---|---|---|
| Sesión (`userID, phone, racimoID, uvaID, racimoLinkCode, …`) | `SessionService` + Capacitor Preferences (`session.service.ts`) | No (pull `await getInfo()`) | SessionContext/store persistido (AsyncStorage/SecureStore) |
| Estado de sync + red | `SyncMonitorDSService` static `state`/`networkStatus` + Amplify Hub (`sync-monitor-ds.service.ts`) | No (static mutado por Hub) | SyncContext que suscribe Hub |
| Nº notificaciones no leídas | `NotificationService` `BehaviorSubject` (`view/gamification/notification.service.ts`) | **Sí** | NotificationContext / Zustand `unreadCount` |
| Config de RACIMO (app/measurement/colors) | `ConfigurationAppService` cachés en memoria + FileSystem (`configuration-app.service.ts`) | No | ConfigContext (carga única) |
| Progreso de gamificación (`UserProgress`) | DataStore + métodos estáticos (`user-progress-ds.service.ts`) | No (pull) | Acceso a DataStore/Amplify desde hook + cache |
| `lastMeasurementValues` (buffer entre flows) | Preferences (`register-measurement.page.ts`) | No | Estado efímero del stack de registro |
| Toggle/flag notificaciones | Preferences keys (`services/notification/notification.service.ts`) | No | Settings store persistido |

---

## 12. Cosas que esperaba y verifiqué que NO existen / matices
- **No hay un store global unificado** (Redux/NgRx/Akita). Estado disperso en Preferences, statics y un único `BehaviorSubject`.
- **No hay guards de ruta de Angular** (`CanActivate`): la protección de navegación es imperativa dentro de `ngOnInit`/splash. Habrá que recrear gating en React Navigation.
- El registro (`register`) **NO** lleva al home: termina en `register-success` → `login`. La vinculación a RACIMO solo ocurre por el camino de login.
- `NotificationService` existe **dos veces** con responsabilidades distintas: contador de no leídas (`core/services/view/gamification/notification.service.ts`) y notificaciones locales (`services/notification/notification.service.ts`). No confundir al migrar.
- La función de restricción de flujo está **hardcodeada** a `'0:>:1'` (`register-measurement.page.ts:434`) pese a que el modelo define `validationFunction` por restricción (`measurements.model.ts:49`). El campo del modelo se ignora.

# Inventario de Pantallas — UVA App (Fase 1 Descubrimiento)

> Documento de descubrimiento para la migración **Ionic/Angular 18 → React Native (Expo + Dev Builds)**.
> Solo lectura sobre `src/`. Todas las afirmaciones llevan referencia `archivo:línea`.

## Resumen de conteo

- **Total de componentes de pantalla (componentes de página y "page-like") inventariados: 31.**
  - **Páginas de ruta de nivel raíz / tab (componentes navegables como pantalla): 27.**
  - **Componentes auxiliares que actúan como sub-vista o modal de pantalla (no son ruta propia): 4** → `TimeFrameComponent`, `GuideMeasurementComponent`, `SyncActionComponent`, y el shell `TabsPage`.
- **Definiciones de ruta totales: 31** (25 en `app.routes.ts` + 5 hijos en `tabs.routes.ts`; varias rutas apuntan al mismo componente).
- Fuentes de ruteo: `src/app/app.routes.ts` (rutas planas) y `src/app/pages/tabs/tabs.routes.ts` (rutas hijas de tabs).

### Páginas huérfanas / rutas no alcanzables (detalle al final)

1. **`register-measurement`** (`app.routes.ts:144-150`) — ruta declarada pero **nunca navegada**; todo el código usa `register-measurement-new` (`measurement.page.ts:400`, `register-measurement.page.ts:538`). Carga el mismo `RegisterMeasurementPage`.
2. **`home`** (`app.routes.ts:87-93`) — ruta declarada que carga `MeasurementPage`, pero **nadie navega a `/home`**; la app usa `app/tabs/home` (→ `HomePage`) y `app/tabs/register` (→ `MeasurementPage`). Ver `app-minimize.service.ts:17` que solo la lista como ruta a minimizar, no navega.
3. **`alerts/creation`** (`app.routes.ts:125-131`) — pantalla de pruebas/QA de alertas de gamificación; **ninguna navegación en el código apunta a ella** (solo aparece su propia definición de ruta). Es una pantalla de desarrollo.

---

## Mapa de navegación de alto nivel

```
'' (SplashAnimationPage)
  ├─ /login (LoginPage)
  │    ├─ modal confirmar teléfono → signIn
  │    │    ├─ MFA requerida → otp/login/:phone (OtpPage)
  │    │    └─ ya logueado → register/project-vinculation
  │    └─ no registrado → pre-register (PreRegisterPage)
  │         └─ register (RegisterPage)
  │              └─ register/set-phone-register (SetPhoneRegisterPage)
  │                   └─ otp/register/:phone (OtpPage)
  │                        └─ otp/:type/:phone/validate-code (ValidateCodePage)
  │                             ├─ login → register/project-vinculation
  │                             └─ register → register-success (RegisterSuccessPage) → /login
  ├─ register/project-vinculation (ProjectVinculationPage)
  │    └─ register/validate-project (ValidateProjectPage)
  │         ├─ ok → register/project-vinculation-done (ProjectVinculationDonePage)
  │         │         └─ register/register-project-form (RegisterProjectFormPage)
  │         │              └─ register/register-completed (RegisterCompletedPage) → app/tabs/home
  │         └─ fail → register/project-vinculation
  └─ app/tabs (TabsPage shell, 3 tabs)
       ├─ /home  (HomePage)
       ├─ /register (MeasurementPage)   [tab "Registrar"]
       │    └─ register-measurement-new (RegisterMeasurementPage)  [flujos multi-paso]
       ├─ /history (HistoricalPage)
       │    └─ measurement-detail (MeasurementDetailPage)
       └─ /moon-phase (MoonPhasePage)   [tab oculto, alcanzable por moon-card]

Fuera de tabs (navegación lateral por header → /profile):
  /profile (ProfilePage)
    ├─ /personal-info (PersonalInfoPage)
    ├─ /achievement (AchievementPage)
    ├─ /configuration (ConfigurationPage)  → sub-vista app-sync-action
    └─ /alerts (AlertsPage)
```

**Convención de salida común:** El `HeaderComponent` (botón de perfil) navega a `/profile` (`header.component.ts:86`) y su back navega al `routerBackButton` recibido por `@Input` (`header.component.ts:113`).

---

## 1. SplashAnimationPage

- **Ruta:** `''` (raíz) — `app.routes.ts:14-20`
- **Archivo:** `src/app/pages/splash-animation/splash-animation.page.ts` / `.html`
- **Propósito:** Pantalla de arranque con animaciones (hoja, "powered by", logo MakeSens) y, en paralelo, resolución de autenticación offline-first para decidir la pantalla inicial.
- **Parámetros de entrada:** ninguno.
- **Servicios:** `AnimationController` (Ionic), `Router`, `SessionService`, `AuthService`, y métodos estáticos `SyncMonitorDSService.waitForSyncDataStore` / `.networkStatus` (`splash-animation.page.ts:77,86`), `UserDSService.getUser` (`:80`), `UvaDSService.getUVAByuserID` (`:156`), `RacimoDSService.getRacimoCode` (`:180`).
- **Estados de UI:** solo animación; no hay loading/empty/error visibles. Errores se loguean por consola y redirigen a `/login` (`:140`).
- **Formularios:** ninguno.
- **Modales/alertas/toasts:** ninguno.
- **Navegación de entrada:** punto de entrada de la app.
- **Navegación de salida (decidida en `checkUserAuthentication`/`continueWithAuthenticatedFlow`):**
  - `/login` si no hay usuario o falla auth (`:95,107,119,140,197`).
  - `register/validate-project` si no hay UVA, racimo o código (`:159,167,193`).
  - `app/tabs/home` si todas las validaciones pasan (`:188`).
- **Comportamientos especiales:** lifecycle `ngOnInit` (auth check) + `ionViewDidEnter` (lanza animaciones, `:233`). Espera fin de animación con `setInterval` cada 100ms (`waitForAnimationToEnd`, `:206-215`). `onFinish` de animación con `setTimeout` 500ms (`:286-290`). Lógica offline-first dependiente de `networkStatus`.

## 2. LoginPage

- **Ruta:** `login` — `app.routes.ts:9-13`
- **Archivo:** `src/app/pages/auth/login/login.page.ts` / `.html`
- **Propósito:** Ingreso por número de celular; dispara `signIn` y enrutamiento a OTP o registro.
- **Parámetros de entrada:** ninguno.
- **Servicios:** `Router`, `FormBuilder`, `ModalController`, `SetupService` (`signIn` `:115`, `createNewUser` `:126`).
- **Formulario:** reactivo `form` con control `phone`: `required`, `minLength(10)`, `maxLength(10)` (`login.page.ts:57-66`). Botón "Continuar" deshabilitado si `form.invalid` (`login.page.html:21`). Input `type="tel"`, `maxlength=10`, placeholder `XXXXXXXXXX`.
- **Estados de UI:** sin loading explícito; el botón se habilita/inhabilita por validación.
- **Modales (vía `AlertComponent`):**
  - Confirmación de teléfono (`abrirModal`, `:98-141`): contenido `¿Es correcto este número de teléfono: <strong>{phone}</strong>?`, cancel `No, editar`, ok `Sí, continuar`, `backdropDismiss:false`.
  - No registrado (`openModalNoRegister`, `:149-177`): contenido `El número <strong>{phone}</strong> no se encuentra registrado. ¿Quieres registrarte?`, cancel `No`, ok `Sí, registrame`.
- **Navegación de salida:**
  - Si `isSignedIn` (sin MFA): `createNewUser()` + `register/project-vinculation` (`:126-127`).
  - Si requiere MFA: `otp/login/{phone}` (`:129`).
  - `UserNotFoundException` → modal no-registro → `pre-register` (`goToRegister`, `:82`).
  - Texto "Registrate aquí" → `pre-register` (`login.page.html:30`).
- **Comportamientos especiales:** `OnDestroy` desuscribe `backButtonSubscription` (declarada pero nunca asignada, `:42,185`).

## 3. OtpPage

- **Ruta:** `otp/:type/:phone` — `app.routes.ts:26-30`
- **Archivo:** `src/app/pages/auth/otp/otp.page.ts` / `.html`
- **Propósito:** Verificación OTP de 6 dígitos para login o registro.
- **Parámetros de entrada:** route params `type` (`login`|`register`) y `phone` (`otp.page.ts:68-69`).
- **Servicios:** `Router`, `ActivatedRoute`, `ChangeDetectorRef`, `SetupService` (`reSendCodeSignIn/Up`, `currentAuthenticatedUser`, `confirmSignIn`, `confirmSignUp`, `createNewUser`), `AlertController`.
- **Formulario:** 6 inputs controlados por array `otp[]` (no Reactive Forms). Validación: solo dígitos `^\d*$`, máximo 1 char por campo (`:116`); auto-avance de foco (`:120-124`); al 6º campo auto-envía (`:126-128`).
- **Estados de UI:** `showError` muestra tarjeta de error "El código ingresado es incorrecto. Por favor, inténtalo de nuevo o pide un nuevo código." (`otp.page.html:21-30`). Texto "Puedes pedir uno nuevo en {mm:ss} min." mientras `timer>0` (`:33-37`).
- **Modales/alertas:** `AlertController` nativo si falla creación de usuario: header `Alerta`, subHeader `No se pudo crear el usuario`, message `No createUser`, botón `Aceptar` (`otp.page.ts:192-201`).
- **Navegación de salida:** ambos flujos → `/otp/{type}/{phone}/validate-code` (`:187,214`). Botón "salir" → `/login` (`otp.page.html:47`, `routerLink`).
- **Comportamientos especiales:** **Timer** de 60s con `setInterval` y `detectChanges` (`startTimer`, `:84-93`); `resetTime` re-envía código y reinicia timer (`:151-165`). `@ViewChildren('otpInput')` para gestión de foco. `OnDestroy` con `backButtonSubscription` (nunca asignada).

## 4. ValidateCodePage

- **Ruta:** `otp/:type/:phone/validate-code` — `app.routes.ts:45-51`
- **Archivo:** `src/app/pages/auth/otp/validate-code/validate-code.page.ts` / `.html`
- **Propósito:** Pantalla intermedia "Validando código" con loader animado, que redirige tras 2s.
- **Parámetros de entrada:** route param `type` (`validate-code.page.ts:26`).
- **Servicios:** `Router`, `ActivatedRoute`.
- **Estados de UI:** muestra `loader.gif` (`validate-code.page.html:2`).
- **Navegación de salida (timer 2s, `ngOnInit`):** `login` → `register/project-vinculation`; `register` → `register-success` (`:36-41`).
- **Comportamientos especiales:** `setTimeout` 2000ms (`:35`). Sin cancelación del timeout.

## 5. RegisterPage

- **Ruta:** `register` — `app.routes.ts:21-25`
- **Archivo:** `src/app/pages/auth/register/register.page.ts` / `.html`
- **Propósito:** Captura de nombre y apellido al inicio del registro.
- **Servicios:** `FormBuilder`, `Router`, `SetupService` (`setParametersUser`, `:68`).
- **Formulario:** `name` (`required`, `minLength(3)`) y `lastName` (`required`, `minLength(3)`) (`register.page.ts:53-59`). `setErrorInput` añade/quita clase `border_error` por validez (`:82-88`). Botón deshabilitado si `form.invalid`.
- **Navegación de salida:** `register/set-phone-register` (`goToSetNumber`, `:72`).
- **Comportamientos especiales:** importa `IonRouterOutlet`/`RouterOutlet` (potencial vista anidada, aunque el HTML no usa `<router-outlet>`).

## 6. PreRegisterPage

- **Ruta:** `pre-register` — `app.routes.ts:31-37`
- **Archivo:** `src/app/pages/auth/register/pre-register/pre-register.page.ts` / `.html`
- **Propósito:** Bienvenida + aceptación de términos y condiciones.
- **Servicios:** `Router`, `ChangeDetectorRef`.
- **Formulario:** checkbox de términos; `enabledButton` se activa con `ionChange` (`checkTerm`, `:47-50`). Botón "Continuar" deshabilitado hasta aceptar.
- **Navegación de salida:** `register` (`goToRegister`, `:57`).

## 7. SetPhoneRegisterPage

- **Ruta:** `register/set-phone-register` — `app.routes.ts:38-44`
- **Archivo:** `src/app/pages/auth/register/set-phone-register/set-phone-register.page.ts` / `.html`
- **Propósito:** Captura de teléfono en el flujo de registro y disparo de `signUp`.
- **Parámetros de entrada:** ninguno por ruta; carga datos del usuario vía `SetupService.getParametersUser` en `ngOnInit` (`:72`).
- **Servicios:** `Router`, `FormBuilder`, `ModalController`, `SetupService` (`signUp`, `:107`).
- **Formulario:** `phone`: `required`, `minLength(10)`, `maxLength(10)` (`:54-62`).
- **Modal (`AlertComponent`):** confirmación de teléfono, contenido `¿Es correcto este número de teléfono: <strong>{phone}</strong>?`, cancel `No, editar`, ok `Sí, continuar` (`:90-100`).
- **Estados de UI / error:** muestra `{user?.name}` en el subtítulo. Si número ya registrado, **solo loguea por consola** (FIXME, `:116-117`) — no hay UI de error.
- **Navegación de salida:** `otp/register/{phone}` si `signUp` ok (`:111`).

## 8. ProjectVinculationPage

- **Ruta:** `register/project-vinculation` — `app.routes.ts:52-58`
- **Archivo:** `src/app/pages/auth/register/project-vinculation/project-vinculation.page.ts` / `.html`
- **Propósito:** Vinculación a un RACIMO mediante código de invitación de 6 caracteres.
- **Servicios:** `FormBuilder`, `Router`, `SetupService` (`getParametersUser`), `SetupRacimoService` (`getUVA`, `getRACIMOByCode`), `ConfigurationAppService` (`configExists`), `ChangeDetectorRef`, `MoonPhaseService` (inyectado, no usado directamente aquí), `SyncMonitorDSService.waitForSyncDataStore`.
- **Formulario:** `code`: `required`, `minLength(6)`, `maxLength(6)` (`:62-71`). Placeholder `Ejemplo: ISA234`.
- **Estados de UI:** `showError` muestra tarjeta "El código ingresado es incorrecto. Por favor, inténtalo de nuevo." (`project-vinculation.page.html:18-25`).
- **Navegación de entrada:** desde login (sin MFA) y desde validate-code (login).
- **Navegación de salida:**
  - `ngOnInit`: si ya hay UVA y no existe config → `register/validate-project`; si existe config → `app/tabs/home` (ambos tras `waitForSyncDataStore`, `:84-90`).
  - Código válido → `register/validate-project` (`goToValidateProject`, `:107`).
  - Botón "salir" → `/login` (`routerLink`, html `:33`).
- **Comportamientos especiales:** espera sincronización de DataStore. `OnDestroy` con `backButtonSubscription` (nunca asignada).

## 9. ValidateProjectPage

- **Ruta:** `register/validate-project` — `app.routes.ts:59-65`
- **Archivo:** `src/app/pages/auth/register/validate-project/validate-project.page.ts` / `.html`
- **Propósito:** Pantalla de descarga/vinculación con loader; descarga config + datos de fases lunares en paralelo.
- **Servicios:** `Router`, `ConfigurationAppService` (`downLoadData`, `loadBranding`), `SessionService`, `MoonPhaseService` (`downloadAndStoreMoonPhaseData`).
- **Estados de UI:** loader (`loader.gif`) + botón "Cancelar".
- **Navegación de salida (`startTimerAndDownload`):** éxito (ambas descargas) → `register/project-vinculation-done` (`:77`); fallo → `register/project-vinculation` (`:79`). Botón "Cancelar" → `/register/project-vinculation` con `cancelTimer()` (html `:5-9`).
- **Comportamientos especiales:** `setTimeout` 2000ms en paralelo con `Promise.all` de dos descargas (`:54-77`); `cancelTimer` hace `clearTimeout` (`:88-92`).

## 10. ProjectVinculationDonePage

- **Ruta:** `register/project-vinculation-done` — `app.routes.ts:66-72`
- **Archivo:** `src/app/pages/auth/register/project-vinculation-done/project-vinculation-done.page.ts` / `.html`
- **Propósito:** Confirmación de vinculación con confeti y código del racimo.
- **Servicios:** `Router`, `ConfigurationAppService` (`getConfigurationApp`, `loadImage`).
- **Estados de UI:** muestra `racimoCode` (linkageCode) e icono de branding; gif `confety.gif`.
- **Navegación de salida:** tras `setTimeout` 3000ms → `register/register-project-form` (`:43-45`).
- **Comportamientos especiales:** carga branding/logo de la config; timer 3s sin cancelación.

## 11. RegisterProjectFormPage

- **Ruta:** `register/register-project-form` — `app.routes.ts:73-79`
- **Archivo:** `src/app/pages/auth/register/register-project-form/register-project-form.page.ts` / `.html`
- **Propósito:** Formulario **dinámico** de datos de ubicación de la UVA, construido a partir de `configModel.fieldsUVA`.
- **Servicios:** `FormBuilder`, `Router`, `SetupService`, `SetupRacimoService` (`getUVA`, `createNewUVA`, `updateUVA`), `ConfigurationAppService` (`getConfigurationApp`, `loadImage`).
- **Formulario:** dinámico. `buildForm` añade un control por cada campo de `fieldsUVA` con `required` + `minLength(4)` (`:89-101`). Cada input renderiza `field.value.displayText` (`register-project-form.page.html:13,18`). `setErrorInput` gestiona `border_error` (`:127-133`). `hideKeyboard` con `blur` en Enter (`:139-143`).
- **Navegación de entrada:** desde project-vinculation-done (timer).
- **Navegación de salida:**
  - `ngOnInit`: si ya existe UVA → `register/register-completed` (`:68`).
  - `goToCompleted`: crea+actualiza UVA; éxito → `register/register-completed` (`:115`); fallo → `register/register-project-form` (`:117`).
- **Comportamientos especiales:** formulario reactivo construido en runtime según config remota.

## 12. RegisterCompletedPage

- **Ruta:** `register/register-completed` — `app.routes.ts:80-86`
- **Archivo:** `src/app/pages/auth/register/register-completed/register-completed.page.ts` / `.html`
- **Propósito:** Confirmación "Registro completado / ¡Empecemos!" con confeti.
- **Servicios:** `Router`, `ChangeDetectorRef`.
- **Navegación de salida:** `setTimeout` 3000ms → `app/tabs/home` (`:34-38`).
- **Comportamientos especiales:** `OnDestroy` con `backButtonSubscription` (nunca asignada). Timer sin cancelación.

## 13. RegisterSuccessPage

- **Ruta:** `register-success` — `app.routes.ts:158-164`
- **Archivo:** `src/app/pages/auth/register/register-success/register-success.page.ts` / `.html`
- **Propósito:** Confirmación de registro satisfactorio (flujo `register`), con botón a login.
- **Servicios:** `Router`.
- **Navegación de entrada:** desde validate-code cuando `type==='register'` (`validate-code.page.ts:40`).
- **Navegación de salida:** botón "Iniciar sesión" → `/login` con `navigateByUrl(..., {replaceUrl:true})` (`goToLogin`, `:29`).

## 14. TabsPage (shell de tabs)

- **Ruta:** `app/tabs` (contenedor) — `tabs.routes.ts:5-39`, montado vía `app.routes.ts:4-8`.
- **Archivo:** `src/app/pages/tabs/tabs.page.ts` / `.html`
- **Propósito:** Shell de navegación inferior con 3 botones de tab.
- **Tabs visibles (`tabs.page.html`):** `home` → `/tabs/home` ("Inicio"), `register` → `/tabs/register` ("Registrar"), `history` → `/tabs/history` ("Historial").
- **Rutas hijas declaradas (`tabs.routes.ts:8-38`):** `home`→HomePage, `moon-phase`→MoonPhasePage (NO tiene botón en la barra), `register`→MeasurementPage, `history`→HistoricalPage; default redirect a `/tabs/home`.
- **Comportamientos especiales:** `addIcons({triangle, ellipse, square})` (íconos no usados realmente; la barra usa SVGs locales). **Nota:** `moon-phase` es ruta hija sin botón de tab — se alcanza por la `moon-card` del home.

## 15. HomePage

- **Ruta:** `app/tabs/home` — `tabs.routes.ts:10-13`
- **Archivo:** `src/app/pages/home/home.page.ts` / `.html`
- **Propósito:** Dashboard: fecha actual, racha/semillas, calendario semanal, barra de progreso, tarjeta de fase lunar, modales explicativos.
- **Servicios:** `NotificationService` (services/notification), `Router`, `ChangeDetectorRef`, `MoonPhaseService` (`getCurrentPhase`), `ConfigurationAppService` (`getConfigurationApp`, `getConfigurationMeasurement`, `countTasks`), estáticos `UserProgressDSService.getLastUserProgress` y `.getCompleteTaskWeek`.
- **Componentes hijos:** `HeaderComponent`, `CalendarComponent` (vista `week`), `ProgressBarComponent`, `MoonCardComponent`.
- **Estados de UI:** valores `?? 0 / ?? []` para vacío; no hay estado de error explícito (errores a consola).
- **Modales (4, gestionados por flag `modals[]`):**
  - `modal_Days`: estados de los días (completos/incompletos/por registrar); botón "Siguiente" abre `modal_Days_question` (`home.page.html:67-113`).
  - `modal_Days_question`: ejemplo de racha; botón "Entendido" (`:116-166`).
  - `modal_token`: explicación de semillas (+2/+1, recuperar racha 5 semillas, +3 a los 7 días); botón "Siguiente" → `modal_token_2` (`:170-233`).
  - `modal_token_2`: germinación mensual (rangos 11-40 brote, 41-63 plántula, >63 flor, 0-10 nada); botón "Entendido" (`:235-328`).
- **Navegación de salida:** moon-card → `/app/tabs/moon-phase` (`goToMoonCalendar`, `:174`); botón "Ver historial" `href="app/tabs/history"`; botón "Completar registros" `href="app/tabs/register"`; click en día del calendario → `measurement-detail` con `queryParams {...$event, origin:'home'}` (`goToDetail`, `:207`, solo si no es futuro).
- **Comportamientos especiales:** `ngOnInit` carga config + programa notificaciones (`setNotifications`/`scheduleDailyNotifications`, `:182-188`). `ionViewWillEnter` recarga progreso, fase lunar y tareas de la semana (`:155-167`). `onCloseAndOpen` usa `setTimeout(300ms)` para evitar race conditions entre modales (`:116-124`).

## 16. MeasurementPage (tab "Registrar")

- **Ruta:** `app/tabs/register` — `tabs.routes.ts:22-27`. (También declarada como `home` en `app.routes.ts:87-93`, ruta huérfana.)
- **Archivo:** `src/app/pages/measurement/measurement.page.ts` / `.html`
- **Propósito:** Lista de tareas de medición del día (sin completar / completadas), barra de progreso, bonus "sorpresa" condicional.
- **Servicios:** `Router`, `SessionService`, `SetupService` (`signOut`), `ConfigurationAppService` (`getConfigurationApp/Measurement`, `countTasks`), `TestUsersService` (`isTestUser`), estáticos `MeasurementDSService.getMeasurementsByDay`, `UserProgressDSService.getLastUserProgress`, `GamificationService.surpriseTaskProcess`. Usa `SafeHtmlPipe`.
- **Estados de UI:** `tasks?.length` → sección "Registros sin completar"; `hasTaskComplete` → "Registros completados" con valores. Bonus visible solo si `showBonus` (lógica de fecha/semana/día en `getDataMeasurement`, `:157-201`).
- **Modal:** `modal_surprise` (bonus moniliasis): "Responde esta pregunta y gana: +{seedReward}" + `message` de config; botones "Si"/"No" (ambos `responseBonus(true)`) y "Omitir" (`responseBonus(false)`) (`measurement.page.html:100-148`).
- **Navegación de salida:** `goToRegister(task)` → `register-measurement-new` con queryParams `{flowId, taskId}` (`:400-405`), solo si no hay restricción de tiempo o es usuario de prueba (`:389-394`).
- **Comportamientos especiales:** lifecycle `ngOnInit` (config) + `ionViewWillEnter` (progreso) + `ionViewDidEnter` (`getDataMeasurement`, `:362`). Restricciones de tiempo por tarea (`hasRestrictionTimeTask`/`getTextRestrictionTime`, `:426-488`) con textos dinámicos "Disponible en X horas/minutos" / "Disponible hasta las HH:MM". `close()` hace `signOut`+`clearSession`+navega a `''` (`:374-382`). Agrupación compleja de mediciones (`groupRemainingLazyMeasurements`).

## 17. RegisterMeasurementPage

- **Ruta:** `register-measurement-new` — `app.routes.ts:151-157` (ruta efectiva). (`register-measurement` `:144-150` apunta al mismo componente pero es huérfana.)
- **Archivo:** `src/app/pages/measurement/register-measurement/register-measurement.page.ts` / `.html`
- **Propósito:** Captura de valores de medición por **flujo** (multi-paso/encadenado), con guías, validación de rango y restricciones cruzadas, y persistencia.
- **Parámetros de entrada (query params, `:136-140`):** `flowId`, `taskId`, `backButtom` (string `'false'` controla botón de retroceso). También admite `@Input() flow`, `@Input() taskId` (uso programático).
- **Servicios:** `ModalController`, `ActivatedRoute`, `Router`, `ConfigurationAppService` (`getConfigurationMeasurement`, `countTasks`, `loadImage`), `Location`, estático `MeasurementDSService.addMeasurement`, `GamificationService.completeTaskProcess`, `Preferences` (`@capacitor/preferences`). Usa `SafeHtmlPipe`.
- **Formulario / inputs:** inputs por dígito (`fieldsArray`), un input por dígito según `fields`; validación: solo `^\d*$`, 1 char por input, auto-avance de foco (`onDigitsChange`, `:255-300`). Validaciones en `save` (`:315-373`): rechaza valores `undefined/null`; verifica `range.min/max`; ejecuta `validateRestriction` (restricciones cruzadas entre mediciones usando operadores `+ - * / < > =`, `:37-49,380-476`).
- **Estados de UI:** alerta inline "¿Estás seguro de este dato?" cuando el valor está fuera de rango o viola restricción (`register-measurement.page.html:52-62,170-177`); mensaje de error generado por `getMessageError` ("La {sortName} no puede ser {menor|mayor} a {valor} {unidad}", `:559-571`). Filtro `blur` sobre el contenido al abrir modal de confirmación.
- **Modales:**
  - `modal_modal_confirmation` ("Verifica los datos 🧐"): repite inputs y botón "Guardar registro" → `save()` (html `:122-196`).
  - `modal_register_Ok` ("{flow.name} guardados", gif): botón "Siguiente" si hay `nextFlow` → `goToComplete()` (`:94-120`).
  - **Guías** vía `GuideMeasurementComponent` como modal (`OpenGuide`, `:199-227`), encadenadas por `nextGuide`. Auto-abre la primera guía si `showAutomatic` (`:172-180`).
- **Navegación de salida:** Header back → `app/tabs/register` (`routerBackButton`, html `:6`). Sin `nextFlow`: tras 2s limpia preferences, `GamificationService.completeTaskProcess`, navega a `app/tabs/register?update=true` y fuerza `window.location.reload()` (`goToNexFlowOrSavePreference`, `:482-512`). Con `nextFlow`: `goToComplete` → `register-measurement-new` con `{flowId:nextFlow, taskId, backButtom:false}` (`:534-552`).
- **Comportamientos especiales:** suscripción a `route.queryParams` (no se desuscribe explícitamente). Persistencia transitoria en `@capacitor/preferences` (`lastMeasurementValues`) entre flujos. `window.location.reload()` (recarga total de la webview). `ngOnDestroy` solo cierra modal Ok.

## 18. HistoricalPage (tab "Historial")

- **Ruta:** `app/tabs/history` — `tabs.routes.ts:28-32`
- **Archivo:** `src/app/pages/historical/historical.page.ts` / `.html` (modelo en `historical.model.ts`)
- **Propósito:** Histórico de registros por mes/año, en vista calendario o gráfica; estadísticas (avg/min/max) por variable; compartir reporte mensual.
- **Servicios:** `Router`, `ChangeDetectorRef`, `ConfigurationAppService`, `EnvironmentalReportService` (`generateReportImage`), `ShareService` (`canShare`, `shareReportImage`, `shareText`), `LoadingController`, `ToastController`, estáticos `MeasurementDSService` (`getMeasurementsByMont/ByDateRange`) y `UserProgressDSService` (`getLastUserProgress`, `getCountTasksByMonthYear`, `getCompletedTasksByMonthYear`).
- **Componentes hijos:** `HeaderComponent`, `TimeFrameComponent`, `CalendarComponent`, `AreachartComponent`.
- **Parámetros de entrada:** ninguno (estado interno: `currentMonthIndex`, `currentYearIndex`).
- **Estados de UI:** segmento Mes/Año; toggle "Ver como gráfica/calendario" (`changeModeData`, `:141`); calendario solo si `completedTaskMonth`. Cuadro `nRegisters` Registros.
- **Modales/toasts/loaders (en compartir, `shareMonthlyReport` `:892-1078`):**
  - LoadingController "Generando reporte..." (con timeout 2s y **loader DOM alternativo** inyectado a mano `showAlternativeLoader`, `:1234-1289`).
  - Toasts: "Reporte compartido exitosamente" (success), "La función de compartir no está disponible en este dispositivo" (warning), "Reporte compartido como texto (imagen no disponible)" (warning), "Error al compartir el reporte. Intenta de nuevo." (danger).
  - Fallback a compartir texto (`shareReportAsText`, `:1085`) con plantilla "📊 Reporte de Datos Ambientales - {mes año}…".
- **Navegación de salida:** click en día → `measurement-detail` con `queryParams {...$event, origin:'history'}` (`goToDetail`, `:299`, no futuros).
- **Comportamientos especiales:** lifecycle `ngOnInit` (carga registros, tareas, variables) + `ionViewWillEnter` (semillas). Múltiples `setTimeout` (regenerar calendario `:240`, render chart `:266`). Manipulación directa del DOM para loader/spinner (CSS inline + `document.createElement`). Lógica de agregación pesada (sum/mean, detailed stats) toda en el componente.

## 19. TimeFrameComponent (sub-vista de Historical)

- **Ruta:** no es ruta; se usa embebido en HistoricalPage.
- **Archivo:** `src/app/pages/historical/time-frame/time-frame.component.ts` / `.html`
- **Propósito:** Segmento Mes/Año (`ion-segment`).
- **Entrada/Salida:** `@Input() timeFrame`; `@Output() segmentChange` emite `'month'|'year'` (`:18-28`).
- **Formularios/validaciones:** ninguno (solo `ngModel` del segmento).

## 20. MeasurementDetailPage

- **Ruta:** `measurement-detail` — `app.routes.ts:132-138`
- **Archivo:** `src/app/pages/historical/measurement-detail/measurement-detail.page.ts` / `.html`
- **Propósito:** Detalle de un día: registros completados/incompletos y opción de recuperar racha pagando semillas.
- **Parámetros de entrada (query params, `:116-127`):** objeto `calendar` serializado (`date`, `dayOfMonth`, `state`, …) + `origin` (`'home'`|`'history'`) que define `backRoute`.
- **Servicios:** `ActivatedRoute`, `ModalController`, `ConfigurationAppService`, estáticos `UserProgressDSService.getLastUserProgress`, `MeasurementDSService.getMeasurementsByDay`, `GamificationService.recoverStreak`. Componentes `HeaderComponent`, `DayComponent`, `SafeHtmlPipe`.
- **Estados de UI:**
  - `showAlert_incomplete && isYesterday`: alerta danger "No tienes suficientes semillas para recuperar tu racha😒, necesitas: 5" (html `:77-89`).
  - `showAlert_complete_seed`: alerta info "Día completado con semillas" (`:90-93`).
  - Botón "Recupera tu racha" solo si `state==='incomplete' && isYesterday && !showAlert_incomplete` (`:94-107`).
- **Modal (`AlertComponent`, `openModal` `:348-380`):** contenido HTML "Recupera tu racha pagando: 5 [semilla] ¿Quieres pagar 5 semillas para recuperar tu racha?" (`modalContent`, `:34-38`); cancel `omitir`, ok `Pagar`, `reverseButton:true`, `colorBtn:'uva_blue-600'`. Al confirmar: `recoverStreak()` + estado a `complete` + muestra alerta de éxito.
- **Navegación de salida:** Header back → `backRoute` (`app/tabs/home` o `app/tabs/history`).
- **Comportamientos especiales:** `ngOnInit` async; suscripción a `route.queryParams` (sin desuscripción explícita). `date-fns` con locale `es` global (`setDefaultOptions`). `isYesterday` controla la lógica de recuperación.

## 21. MoonPhasePage

- **Ruta:** `app/tabs/moon-phase` — `tabs.routes.ts:14-20` (también `moon-phase` plana en `app.routes.ts:139-143`).
- **Archivo:** `src/app/pages/moon-phase/moon-phase.page.ts` / `.html`
- **Propósito:** Calendario lunar del mes y próximos eventos lunares.
- **Servicios:** `MoonPhaseService` (`getCurrentPhase`, `getMonthPhases`, `getNextMoonEvents`), estático `UserProgressDSService.getLastUserProgress`. Componentes `HeaderComponent`, `CalendarComponent` (typeCalendar `moon`), `MoonCardComponent`.
- **Estados de UI:** sin loading/empty explícitos; errores a consola (`:107`).
- **Navegación de entrada:** desde HomePage (moon-card).
- **Navegación de salida:** Header back → `/app/tabs/home` (`routerBackButton`, html `:4`).
- **Comportamientos especiales:** `ngOnInit` ejecuta `Promise.all` de 3 llamadas (`:79-83`); `ionViewWillEnter` actualiza semillas. Formatea fechas de eventos con `toLocaleDateString('es-ES', …)`.

## 22. ProfilePage

- **Ruta:** `profile` — `app.routes.ts:94-98`
- **Archivo:** `src/app/pages/profile/profile.page.ts` / `.html`
- **Propósito:** Perfil del usuario, menú de navegación interna, compartir app, cerrar sesión, badge de notificaciones.
- **Servicios:** `Router`, `SessionService`, `SetupService` (`signOut`), `ConfigurationAppService` (`getConfigurationApp`, `loadImage`), `NotificationService` (gamification, `unreadCount$`), `ChangeDetectorRef`, estáticos `UserDSService.getUser`, `UserProgressDSService.getLastUserProgress`, `GamificationService.getNotifications`; `DataStore.clear` (`@aws-amplify/datastore`), `Clipboard`, `Share` (`@capacitor`).
- **Estados de UI:** muestra nombre, "Graduado 🎓", "Semillas: {seed}"; badge rojo si `hasUnreadNotifications`; ícono `notifications`/`notifications-outline` según conteo.
- **Modal:** `modal_show_comparte` (compartir) con opciones WhatsApp / Notion / Facebook / Copiar enlace / Más (`shareOptions[]`, `:87-114`).
- **Navegación de salida (`goBack(url)` y enlaces):** `/personal-info`, `/achievement`, `/configuration`, `/alerts` (botón campana, html `:13`), botón back → `/app/tabs/home` (html `:5`). "Cerrar sesión" (`goBack('/login')`): `signOut` + `clearSession` + `DataStore.clear()` + navega a `''` (`:232-243`). "Soporte documental" abre URL externa `https://docs.makesens.co/ayuda-uva` (`goUrl`, `:259-262`).
- **Comportamientos especiales:** `ionViewWillEnter` se **suscribe a `unreadCount$`** sin desuscribirse (riesgo de fuga, `:165-171`). Usa `window.open`, `Clipboard.write` (con `alert('Enlace copiado…')`), `Share.share`, `wa.me`. `appLink` apunta a Google Play.

## 23. PersonalInfoPage

- **Ruta:** `personal-info` — `app.routes.ts:113-119`
- **Archivo:** `src/app/pages/profile/personal-info/personal-info.page.ts` / `.html`
- **Propósito:** Ver/editar datos personales y de ubicación; eliminar cuenta.
- **Servicios:** `Router`, `FormBuilder`, `AlertController`, `ChangeDetectorRef`, `AuthService` (`handleDeleteUser`), estáticos `UserDSService.getUser/updateUser`, `UvaDSService.getUVAByID/updateUVA`.
- **Formularios (2 reactivos):**
  - `userPersonalForm`: campos `userName`, `userLastName`, `userPhoneNumber` (disabled), `userEmail` (`userPersonalFields`, `:30-56`).
  - `userLocationForm`: `finca`, `vereda`, `municipio`, `latitude` (onLine), `longitude` (onLine), `altitude` (`userLocationFields`, `:59-98`).
  - Controles sin validadores explícitos más allá de `disabled`; el guardado exige ambos `valid` o muestra alerta (`onSubmit`, `:225-252`).
- **Estados de UI:** modo `isEditable` alterna readonly/editable; "Graduado 🎓" / "Semillas". `focused` añadido/removido por foco (manipulación DOM, `:296-323`).
- **Modales/alertas:**
  - `AlertController`: "Error / Para guadar todos los datos deben ser completados." (`showAlert`, `:258-266`); "Error / No se pudo borrar la cuenta" (`:344-351`).
  - `modal_Delete`: confirmación de borrado ("¿Quieres eliminar tu cuenta?", botones "Sí, quiero eliminarla" / "No, no quiero eliminarla", html `:137-179`).
  - `modal_Delete_2`: requiere escribir "ELIMINAR CUENTA" (`validateInput`, `:329-332`); botón "Confirmar" deshabilitado hasta validar; "Cancelar" (html `:181-229`).
- **Navegación de salida:** back → `/profile`; tras borrar cuenta exitoso → `/login` (`:343`).
- **Comportamientos especiales:** `ionViewWillEnter` rellena formularios desde DataStore; parseo defensivo de `uva.fields` (string/objeto, `:197-212`). `CUSTOM_ELEMENTS_SCHEMA`. Manipulación directa del DOM para foco (`document.querySelector`).

## 24. AchievementPage

- **Ruta:** `achievement` — `app.routes.ts:99-105`
- **Archivo:** `src/app/pages/profile/achievement/achievement.page.ts` / `.html`
- **Propósito:** Galería de logros (brote/plántula/flor) y modales explicativos de semillas.
- **Servicios:** `Router`, `ChangeDetectorRef`, `ConfigurationAppService` (inyectado, no usado en el flujo principal), estático `UserProgressDSService.getMilestones`.
- **Estados de UI:** grid de íconos de logros desbloqueados; botón flotante "¿Dudas?".
- **Modales:** `modal_token_a` (semillas, "Siguiente" → `modal_token_b`) y `modal_token_b` (germinación mensual + "Entendido"). Textos idénticos a los modales de HomePage (`:28-186`).
- **Navegación de salida:** back → `/profile`.
- **Comportamientos especiales:** `ionViewWillEnter` mapea milestones (`brote`/`plantula`/`flor`) a íconos (`:46-78`). `CUSTOM_ELEMENTS_SCHEMA`. **Nota:** `achievements` se acumula en cada `ionViewWillEnter` sin reset (posible duplicación al re-entrar).

## 25. AlertsPage (perfil → Notificaciones)

- **Ruta:** `alerts` — `app.routes.ts:120-124`
- **Archivo:** `src/app/pages/profile/alerts/alerts.page.ts` / `.html`
- **Propósito:** Lista de notificaciones de gamificación, marcar como leídas, eliminar todas.
- **Servicios:** `Router`, `NotificationService` (gamification, `updateUnreadCount`), `GamificationService` (estático: `getNotifications`, `markNotificationAsRead`, `deleteAllNotifications`).
- **Estados de UI:** lista con indicador de no leído; **estado vacío** `#noNotifications`: "No hay notificaciones / Cuando completes tareas y ganes logros, aparecerán aquí" (html `:55-63`). Íconos/colores por tipo y subtipo (`getNotificationIcon`/`getNotificationIconBg`, `:90-139`).
- **Navegación de salida:** back → `/profile`; botón ajustes (header) → `/configuration` (`openSettings`, `:54`).
- **Comportamientos especiales:** `ionViewWillEnter` carga notificaciones (`:34-39`). `console.log` de notificaciones (`:37`). Marca leída en el click del item.

## 26. ConfigurationPage

- **Ruta:** `configuration` — `app.routes.ts:106-112`
- **Archivo:** `src/app/pages/profile/configuration/configuration.page.ts` / `.html`
- **Propósito:** Configuración de notificaciones (con diagnóstico de sistema Android), sincronización de DataStore y actualización de config remota.
- **Servicios:** `Router`, `ConfigurationAppService` (`downLoadData`, `loadBranding`), `MoonPhaseService` (`downloadAndStoreMoonPhaseData`), `ToastController`, `LoadingController`, `SyncMonitorDSService` (instancia + estáticos `networkStatus`/`synchronizedData`), `NotificationService` (services/notification: `getEnableNotifications`, `setEnableNotifications`, `requestPermissions`, `getSystemStatus`, `getComprehensiveNotificationState`, `showPrivateSpaceGuidance`, `showBatteryOptimizationGuidance`), `App` (`@capacitor/app` listener `appStateChange`), `DataStore.start`.
- **Componentes hijos:** dos `app-sync-action`.
- **Estados de UI:** toggle de notificaciones; panel colapsable de estado del sistema (permisos, programación, batería); chips de estado con color/texto dinámicos (`getNotificationStatusColor/Text`, `:373-401`); spinner de carga.
- **Toasts:** múltiples — "Notificaciones habilitadas correctamente", "Notificaciones deshabilitadas", "Permisos de notificación requeridos…", "Permisos de notificación otorgados", "Necesita internet para ejecutar esta accion", "Hubo un error al descargar los datos…", success/danger (`:221,238,304-325,348`).
- **Loader:** LoadingController "Cargando..." (`updateConfiguration`, `:266`).
- **Navegación de salida:** back → `/profile`.
- **Comportamientos especiales:** lifecycle `ionViewWillEnter` (carga estado) + **`ionViewWillLeave`** (remueve listener, `:165-170`). `App.addListener('appStateChange')` con `setTimeout(500ms)` para refrescar al volver de ajustes del sistema (`:152-159`). Fuerte acoplamiento a permisos/batería de Android (no portable directo a Expo).

## 27. SyncActionComponent (sub-vista de Configuration)

- **Ruta:** no es ruta; embebido (x2) en ConfigurationPage.
- **Archivo:** `src/app/pages/profile/configuration/sync-action/sync-action.component.ts` / `.html`
- **Propósito:** Tarjeta reutilizable de "acción de sincronización" con estado pendiente/al día y botón.
- **Entrada/Salida:** `@Input()` `isInfoPending`, `infoPendingText`, `noInfoPendingText`, `title`, `buttonText`; `@Output() clickSync` (`:18-26`). Botón deshabilitado si no hay info pendiente (html `:34`).
- **Formularios/validaciones:** ninguno.

## 28. CreationPage (alerts/creation) — PANTALLA DE QA/DESARROLLO

- **Ruta:** `alerts/creation` — `app.routes.ts:125-131` (**huérfana**, no navegada).
- **Archivo:** `src/app/pages/alerts/creation/creation.page.ts` / `.html`
- **Propósito:** Herramienta de pruebas para crear manualmente cada tipo de alerta de gamificación. Título visible "Gamification Alerts Creation" / "Test Alert Creation" (html `:3,11`).
- **Servicios:** `GamificationAlertsService` (estático: `createFirstTaskAlert`, `createAllTasksAlert`, `createStreakRewardAlert`, `createGerminationSuccessAlert`, `createGerminationFailAlert`, `createStreakRecoveryAlert`, `createStreakLostAlert`, `createStreakProgressAlert`).
- **UI:** grid de botones, uno por subtipo de alerta (`alerts[]`, `:24-80`).
- **Navegación:** sin entrada ni salida (no hay back ni links).
- **Comportamientos especiales:** errores a consola; pantalla puramente de desarrollo. **Candidata a excluir de la migración.**

---

## Páginas auxiliares referenciadas (no son `pages/**` pero actúan como vistas/modales de pantalla)

Estas se usan como modal-pantalla y son load-bearing para el flujo; se documentan por completitud (viven fuera de `pages/`):

- **`GuideMeasurementComponent`** (`src/app/pages/measurement/guide-measurement/guide-measurement.component.ts`): modal de guía paso a paso. `@Input() guide`, `@Input() isHtmlText`. Soporta texto plano, array o HTML (`safeHtml`). Botón "Siguiente"/"Entendido" según `nextGuide`; cierra con `modalCtrl.dismiss({nextGuide})` (`:96-101`). Checkbox "Mostrar automaticamente." (sin binding funcional). Carga imágenes vía `ConfigurationAppService.loadImage`.
- **`AlertComponent`** (`src/app/components/alert/alert.component.ts`): modal genérico de confirmación. `@Input()` `content` (HTML), `ShowCancelButton`, `textCancelButton`, `textOkButton`, `reverseButton`, `bordersInCancelBtn`, `colorBtn`. Devuelve `{action: 'OK'|...}` por `onDidDismiss`. Usado por Login, SetPhoneRegister, MeasurementDetail.

---

## Tabla resumen de rutas

| Componente | Ruta(s) | Archivo de ruta | Params |
|---|---|---|---|
| SplashAnimationPage | `''` | app.routes.ts:14 | — |
| LoginPage | `login` | app.routes.ts:9 | — |
| OtpPage | `otp/:type/:phone` | app.routes.ts:26 | type, phone |
| ValidateCodePage | `otp/:type/:phone/validate-code` | app.routes.ts:45 | type, phone |
| RegisterPage | `register` | app.routes.ts:21 | — |
| PreRegisterPage | `pre-register` | app.routes.ts:31 | — |
| SetPhoneRegisterPage | `register/set-phone-register` | app.routes.ts:38 | — |
| ProjectVinculationPage | `register/project-vinculation` | app.routes.ts:52 | — |
| ValidateProjectPage | `register/validate-project` | app.routes.ts:59 | — |
| ProjectVinculationDonePage | `register/project-vinculation-done` | app.routes.ts:66 | — |
| RegisterProjectFormPage | `register/register-project-form` | app.routes.ts:73 | — |
| RegisterCompletedPage | `register/register-completed` | app.routes.ts:80 | — |
| RegisterSuccessPage | `register-success` | app.routes.ts:158 | — |
| MeasurementPage | `home` (HUÉRFANA) / `app/tabs/register` | app.routes.ts:87 / tabs.routes.ts:22 | — |
| ProfilePage | `profile` | app.routes.ts:94 | — |
| AchievementPage | `achievement` | app.routes.ts:99 | — |
| ConfigurationPage | `configuration` | app.routes.ts:106 | — |
| PersonalInfoPage | `personal-info` | app.routes.ts:113 | — |
| AlertsPage | `alerts` | app.routes.ts:120 | — |
| CreationPage | `alerts/creation` (HUÉRFANA) | app.routes.ts:125 | — |
| MeasurementDetailPage | `measurement-detail` | app.routes.ts:132 | queryParams (calendar + origin) |
| MoonPhasePage | `moon-phase` / `app/tabs/moon-phase` | app.routes.ts:139 / tabs.routes.ts:14 | — |
| RegisterMeasurementPage | `register-measurement` (HUÉRFANA) / `register-measurement-new` | app.routes.ts:144 / :151 | queryParams flowId, taskId, backButtom |
| HomePage | `app/tabs/home` | tabs.routes.ts:10 | — |
| HistoricalPage | `app/tabs/history` | tabs.routes.ts:28 | — |
| TabsPage | `app/tabs` (shell) | tabs.routes.ts:5 | — |

---

## Notas transversales relevantes para la migración

- **Lifecycle de Ionic ampliamente usado:** `ionViewWillEnter` (Home, Measurement, Historical, MoonPhase, Profile, PersonalInfo, Achievement, Alerts, Configuration), `ionViewDidEnter` (Splash, Measurement), `ionViewWillLeave` (Configuration). React Navigation no tiene equivalente 1:1 — requerirá `useFocusEffect`/`useIsFocused`.
- **Navegación por strings de ruta + `queryParams`/`state`** en todo el código — necesitará mapeo a params tipados de React Navigation.
- **Timers/redirecciones automáticas** en pantallas "loader": ValidateCode (2s), ValidateProject (2s), ProjectVinculationDone (3s), RegisterCompleted (3s). Varias sin `clearTimeout`.
- **Manipulación directa del DOM / `window`:** Historical (loader inyectado, `window.location.reload` indirecto), RegisterMeasurement (`window.location.reload()`, `document.getElementById` para foco), PersonalInfo (`document.querySelector`), Profile (`window.open`, `alert()`). Nada de esto existe en React Native.
- **Modales gestionados por flag booleano + `ChangeDetectorRef`** (Home, Achievement, PersonalInfo, Profile, Measurement) y por `ModalController` (Login, SetPhone, MeasurementDetail, RegisterMeasurement/Guide). Dos paradigmas distintos a unificar.
- **Suscripciones RxJS no desuscritas:** `ProfilePage` (`unreadCount$`), `RegisterMeasurementPage`/`MeasurementDetailPage` (`route.queryParams`). Las propiedades `backButtonSubscription` se declaran pero **nunca se asignan** en Login/Otp/ProjectVinculation/RegisterCompleted.

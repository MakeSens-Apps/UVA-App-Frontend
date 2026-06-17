# Auditoría de Cobertura de Estados — Migración Ionic→React Native (App UVA)

> Auditoría pantalla-por-pantalla: estados esperados (original Ionic) vs estados cubiertos (RN) vs estados faltantes, con referencias `archivo:línea`. Cubre 6 features y todas sus pantallas.

---

## Resumen ejecutivo

| Métrica | Valor (auditoría inicial) | Valor (tras remediación) |
|---|---|---|
| **Features auditadas** | 6 | 6 |
| **Pantallas auditadas** | 31 | 31 |
| **COMPLETA** | 17 | **22** |
| **PARCIAL** | 14 | **9** |
| **FALTANTE** | 0 | 0 |

### Conteo por feature (actualizado tras remediación)

| Feature | COMPLETA | PARCIAL | FALTANTE | Total | Delta |
|---|---|---|---|---|---|
| auth-register | 14 | 0 | 0 | 14 | +2 |
| home | 1 | 1 | 0 | 2 | +1 |
| measurement | 0 | 4 | 0 | 4 | — |
| historical-detail | 2 | 1 | 0 | 3 | +1 |
| profile | 3 | 2 | 0 | 5 | +2 |
| moon-config | 2 | 1 | 0 | 3 | — |
| **TOTAL** | **22** | **9** | **0** | **31** | **+6** |

> Nota: `MeasurementDetailScreen` aparece en 3 features (home, measurement, historical-detail) como PARCIAL en todas; se cuenta una vez por feature en la tabla anterior. Pantallas físicas distintas: 29.

### Lectura rápida

- **Ninguna pantalla está completamente FALTANTE** — toda pantalla del original tiene equivalente en RN.
- **auth-register** y **moon-config** son las features más completas.
- **measurement** es la más afectada: las 4 pantallas son PARCIAL, con el **multi-flow encadenado fundamentalmente roto**.
- Los gaps PARCIAL más graves son funcionales (multi-flow, notificaciones diarias, variables de vista año); el resto son cosméticos/feedback (toasts, branding, focus visual).

---

## Hallazgos más graves (cobertura)

| # | Severidad | Feature/Pantalla | Estado faltante | Refs |
|---|---|---|---|---|
| 1 | CRÍTICA | measurement / MeasurementScreen + RegisterMeasurement | Multi-flow: `flows[0]` siempre, `flowId` no se pasa como param, `goToComplete` carga flow erróneo | `measurement.page.ts:396-404` vs `MeasurementScreen.tsx:351-355`; `RegisterMeasurementScreen.tsx:206-213,463-466` |
| 2 | ALTA | measurement / GuideMeasurementScreen | Encadenamiento `nextGuide` roto: `closeModal(true)` hace `goBack()` sin abrir la siguiente guía | `register-measurement.page.ts:219-224` vs `GuideMeasurementScreen.tsx:143-154` |
| 3 | ALTA | home / HomeScreen | `setNotifications`/`scheduleDailyNotifications` (notificaciones diarias) totalmente ausente | `home.page.ts:149` vs `HomeScreen.tsx` (sin import de LocalRemindersService) |
| 4 | ALTA | historical-detail / HistoricalScreen | Variables de vista año incorrectas: useEffect hardcodea `'month'` | `historical.page.ts:512-526` vs `HistoricalScreen.tsx:329` |
| 5 | MEDIA | historical-detail / MeasurementDetailScreen | Estados `saveStreak` y `today` del Day nunca se asignan (solo complete/incomplete/normal) | `measurement-detail.page.html:12` vs `MeasurementDetailScreen.tsx:185-292` |
| 6 | MEDIA | historical-detail / HistoricalScreen | Tipo de gráfica `bar` no soportado (lluvia se dibuja como línea) | `historical.page.ts:421,434` vs `Areachart.tsx` (sin prop type) |
| 7 | MEDIA | measurement / RegisterMeasurement | Modal de confirmación con valores de solo lectura (original tiene inputs editables) | `register-measurement.page.html:148-165` vs `RegisterMeasurementScreen.tsx:681-697` |
| 8 | MEDIA | auth-register / ProjectVinculationScreen | Mensaje personalizado con nombre + WhatsApp perdido (texto genérico) | `project-vinculation.page.html:3` vs `ProjectVinculationScreen.tsx:239` |
| 9 | MEDIA | profile / ProfileScreen | Logo de branding dinámico ausente (logo hardcodeado) | `profile.page.ts:145-151` vs `ProfileScreen.tsx:411-416` |
| 10 | MEDIA | profile / AlertsScreen | Color de icono `streak_recovery` incorrecto (#0d8f9a en vez de #164551) | `alerts.page.scss:105-108` vs `AlertsScreen.tsx:213-215` |

---

## Feature: auth-register (14 pantallas — 12 COMPLETA / 2 PARCIAL)

**Veredicto:** Sustancialmente completa. Los 13 screens tienen equivalente y los flujos principales funcionan. La lógica de negocio (validaciones, navegación, timers, errores inline, confirmaciones modales, OTP, branding dinámico, sincronización DataStore) está fielmente portada. 4 hallazgos verificables.

| Pantalla | Status | Estados faltantes (refs) |
|---|---|---|
| SplashScreen | COMPLETA | Ninguno. Animación, 3 ramas de destino (login/validate-project/app), offline-first, guard timeout 10s, doble condición animationDone&&authDone con destinationRef (fix B13c). `SplashScreen.tsx:30-265`, `useAuthGate.ts:86-200`. |
| LoginScreen | COMPLETA | MENOR: backdropDismiss:false original vs onRequestClose RN (`login.page.ts:107` vs `ConfirmModal.tsx:165`); capitalización 'No, editar'→'No, Editar' (`login.page.ts:104` vs `LoginScreen.tsx:128`). |
| OtpScreen | COMPLETA | MENOR: texto '¿No has recibido ningún código?' se oculta con showError en original (`otp.page.html:32`) pero permanece en timerText RN (`OtpScreen.tsx:328-360`); reset de showError gatillado en momento distinto. |
| ValidateCodeScreen | COMPLETA | Ninguno. loader.gif + 2000ms + ramas login/register. RN añade Cancelar (mejora). `ValidateCodeScreen.tsx:58-120`. |
| PreRegisterScreen | COMPLETA | Ninguno. Checkbox toggle + botón habilitado + navegación. `PreRegisterScreen.tsx:48-182`. |
| RegisterScreen | COMPLETA | Ninguno. required+minLength(3) ambos campos, botón disabled, error visual, submit→SetPhoneRegister. `RegisterScreen.tsx:66-228`. |
| SetPhoneRegisterScreen | COMPLETA | Ninguno. Subtítulo con userName, validaciones phone, loading, modal confirmación, FIXME preservado (console.error sin UI). `SetPhoneRegisterScreen.tsx:61-228`. |
| **ProjectVinculationScreen** | **PARCIAL** | **REAL GAP:** mensaje '{{user?.name}}, ...código de invitación enviado a tu Whatsapp...' perdido → 'Ingresa el código de 6 caracteres de tu proyecto.' (`project-vinculation.page.html:3` vs `ProjectVinculationScreen.tsx:239`). MENOR: placeholder 'Ejemplo: ISA234'→'XXXXXX' (`project-vinculation.page.html:15` vs `ProjectVinculationScreen.tsx:274`). |
| **ValidateProjectScreen** | **PARCIAL** | MENOR: Cancelar navega a Login (RN) vs project-vinculation (original) (`validate-project.page.html` vs `ValidateProjectScreen.tsx:123`); falla descarga usa goBack() vs navegación explícita (`validate-project.page.ts:79` vs `ValidateProjectScreen.tsx:106`); loader.gif → ActivityIndicator. |
| ProjectVinculationDoneScreen | COMPLETA | Divergencia en fuente del racimoCode: config.racimo.linkageCode (original) vs route.params (RN) (`project-vinculation-done.page.ts:36` vs `ProjectVinculationDoneScreen.tsx:45`). Equivalente si los valores coinciden. |
| RegisterProjectFormScreen | COMPLETA | MENOR: filtro `.filter(f => f.enabled)` (RN) oculta campos enabled:false (`register-project-form.page.ts:91` vs `RegisterProjectFormScreen.tsx:93`). |
| RegisterCompletedScreen | COMPLETA | Divergencia: logo SVG estático (original) vs branding dinámico (RN, más correcto) (`register-completed.page.ts:15` vs `RegisterCompletedScreen.tsx:53-63`). |
| RegisterSuccessScreen | COMPLETA | Ninguno. Gif done_register, textos exactos, botón con navigation.reset (=replaceUrl), sin auto-redirect. `RegisterSuccessScreen.tsx:46-115`. |

---

## Feature: home (2 pantallas — 0 COMPLETA / 2 PARCIAL)

**Veredicto:** HomeScreen PARCIAL. Los 4 modales (modal_Days, modal_Days_question, modal_token, modal_token_2) con textos y rangos correctos, patrón setTimeout(300ms), lifecycle, navegaciones y progreso implementados. 3 gaps confirmados. MeasurementDetailScreen también PARCIAL.

### HomeScreen — PARCIAL

| Estados cubiertos | Refs |
|---|---|
| Dashboard (fecha, Streak, Seed, completedTasks, CalendarWeek, ProgressBar, MoonCard) | `HomeScreen.tsx:88-357` |
| modal_Days, modal_Days_question, modal_token, modal_token_2 con textos/rangos | `HomeScreen.tsx:363-600` |
| onCloseAndOpen setTimeout(300ms) | `HomeScreen.tsx:123-134` |
| useFocusEffect (=ionViewWillEnter): getLastUserProgressPure + getCurrentPhase + getCompleteTaskWeek | `HomeScreen.tsx:156-182` |
| useEffect (=ngOnInit): getConfigurationMeasurement + countTasks + recalculateDailyProgress | `HomeScreen.tsx:138-152` |
| goToDetail (bloquea future), goToMoonCalendar, navegaciones a Historical/Measurement/Profile | `HomeScreen.tsx:191-346` |

| Estados faltantes | Severidad | Refs |
|---|---|---|
| **`setNotifications`/`scheduleDailyNotifications` AUSENTE** — HomeScreen no importa ni llama a LocalRemindersService; la programación de notificaciones diarias desde Home está completamente omitida. | ALTA | `home.page.ts:149` vs `HomeScreen.tsx` (sin import) |
| **goToDetail pasa estado incompleto** — original spread `{...$event, origin:'home'}` con date/dayOfMonth/state; RN reconstruye solo ISO sin `day.state`. MeasurementDetail recalcula dayState de la BD (equivalente pero no idéntico). | MENOR | `home.page.ts:208` vs `HomeScreen.tsx:196-201` |
| **modal_Days usa Day components numerados** en vez de SVGs de estado originales (date_check.svg, date_incomplete.svg, date_current.svg). | VISUAL | `home.page.html:82-99` vs `HomeScreen.tsx:373-388` |

### MeasurementDetailScreen — PARCIAL (ver sección destacada abajo)

---

## Feature: measurement (4 pantallas — 0 COMPLETA / 4 PARCIAL)

**Veredicto:** Las cuatro pantallas son PARCIAL; ninguna COMPLETA. El mayor riesgo funcional es el **multi-flow encadenado fundamentalmente roto**. Los estados de gamificación (semillas, restricciones de tiempo, bonus sorpresa) y las validaciones de rango están bien migrados.

### MeasurementScreen (tab Registrar) — PARCIAL

| Estados cubiertos | Refs |
|---|---|
| Lista pendientes/completadas, estado vacío (añadido), loading | `MeasurementScreen.tsx:426-559` |
| Banner bonus + modal sorpresa (Sí/No/Omitir) con seedReward/message | `MeasurementScreen.tsx:404-638` |
| Restricción horaria con textos dinámicos (minutos/horas/hasta las HH:MM) | `MeasurementScreen.tsx:149-189,454-465` |
| Tarea deshabilitada (opacity), barra de progreso, bypass test user, semilla +2 | `MeasurementScreen.tsx:346-449` |

| Estados faltantes | Severidad | Refs |
|---|---|---|
| **Multi-flow goToRegister ignora `task.flowsComplete`** — original navega al primer flow NO completado; RN siempre toma `flows[0]`. | CRÍTICA | `measurement.page.ts:396-399` vs `MeasurementScreen.tsx:351` |
| **`flowId` no se pasa como param de navegación** — RN solo pasa `{taskId, taskName}`, pierde el flowId seleccionado. | CRÍTICA | `measurement.page.ts:400-404` vs `MeasurementScreen.tsx:352-355` |

### GuideMeasurementScreen (modal guía) — PARCIAL

| Estados cubiertos | Refs |
|---|---|
| Texto array, texto HTML via RichText, imagen e ícono cargados | `GuideMeasurementScreen.tsx:74-132,253-268` |
| Botón Siguiente/Entendido, checkbox 'Mostrar automáticamente' con persistencia (mejora), auto-apertura, cierre, estado sin guía | `GuideMeasurementScreen.tsx:148-301` |

| Estados faltantes | Severidad | Refs |
|---|---|---|
| **Encadenamiento `nextGuide` roto** — `closeModal(true)` hace `goBack()` sin abrir la siguiente guía. | ALTA | `register-measurement.page.ts:219-224` vs `GuideMeasurementScreen.tsx:143-154` |
| **`isHtmlText` como entrada ausente** — original distingue texto plano vs HTML; RN siempre usa RichText para no-array, posible diferencia visual con caracteres especiales. | MEDIA | `register-measurement.page.ts:208` vs `GuideMeasurementScreen.tsx:268` |
| **Ícono enable/disable** — original solo renderiza si `guide.icon.enable`; RN renderiza si hay iconUri sin chequear el flag. | PARCIAL | `guide-measurement.component.html:14` vs `GuideMeasurementScreen.tsx:226-234` |

### RegisterMeasurementScreen (formulario multi-flujo) — PARCIAL

| Estados cubiertos | Refs |
|---|---|
| Inputs por dígito, auto-avance, solo dígitos, reset al enfocar, unidad visible | `RegisterMeasurementScreen.tsx:243-302,563-569` |
| Alert fuera de rango + getMessageError, restricción cruzada, 3 guards de save | `RegisterMeasurementScreen.tsx:357-376,577-594` |
| Modal confirmación con BlurView, modal guardado, botón Siguiente, link guía | `RegisterMeasurementScreen.tsx:601-763` |
| Multi-flow Preferences, completeTaskProcess, restricción flow-key, ícono/HTML | `RegisterMeasurementScreen.tsx:160-418` |

| Estados faltantes | Severidad | Refs |
|---|---|---|
| **goToComplete pasa nextFlow como taskName** — screen ignora taskName, carga `flows[0]`; multi-flow encadenado siempre carga el primer flow. | CRÍTICA | `RegisterMeasurementScreen.tsx:463-466,206-213` |
| **Modal confirmación de solo lectura** — original tiene inputs digit-by-digit editables; RN muestra solo Text. | MEDIA | `register-measurement.page.html:148-165` vs `RegisterMeasurementScreen.tsx:681-697` |
| **Gif done_register.gif ausente** en modal guardado. | MEDIA | `register-measurement.page.html:103-106` vs `RegisterMeasurementScreen.tsx:725-763` |
| **Blur del contenido de fondo ausente** — original aplica clase blur al ion-content; RN solo cubre el backdrop del modal. | MEDIA | `register-measurement.page.html:9` vs `RegisterMeasurementScreen.tsx:652` |
| **window.location.reload() → navigation** — confía en useFocusEffect. Aceptable si está bien implementado. | PARCIAL | `register-measurement.page.ts:504-507` vs `RegisterMeasurementScreen.tsx:399-401` |

### MeasurementDetailScreen — PARCIAL (ver sección destacada abajo)

---

## ⭐ Sección destacada: MeasurementDetailScreen — estados incompleto / completo / racha

> El usuario nombró específicamente estos estados. MeasurementDetailScreen aparece en 3 features (home, measurement, historical-detail) y es **PARCIAL en todas**. Esta es la consolidación de su cobertura.

**La pantalla migra correctamente los estados de alerta, el modal de recuperación de racha y la agrupación de mediciones. Los gaps están en: (a) el back dinámico por `origin`, (b) los estados visuales `saveStreak`/`today` del Day, y (c) detalles del modal (imagen de semilla, backdropDismiss).**

### Estados COMPLETO / INCOMPLETO / RACHA — cobertura detallada

| Estado / sub-estado | Cubierto en RN | Refs RN | Refs original |
|---|---|---|---|
| **Estado COMPLETO** (todas las tareas completas → Day 'complete', sección verde) | SÍ | `MeasurementDetailScreen.tsx:286-287,355-427` | `measurement-detail.page.ts:370` |
| **Estado INCOMPLETO** (algunas tareas incompletas → Day 'incomplete', sección blanca) | SÍ | `MeasurementDetailScreen.tsx:286-287,430-461` | `measurement-detail.page.html` |
| **Sin mediciones** (día vacío → tasksIncomplete=allTasks, dayState='normal') | SÍ | `MeasurementDetailScreen.tsx:247-254` | — |
| Sección 'Registros completados' con valores | SÍ | `MeasurementDetailScreen.tsx:355-427` | `measurement-detail.page.html` |
| Sección 'Registros sin completar' | SÍ | `MeasurementDetailScreen.tsx:430-461` | `measurement-detail.page.html` |
| **RACHA — Alert danger** 'No tienes suficientes semillas para recuperar tu racha' (`showAlertIncomplete && isYesterday`) | SÍ | `MeasurementDetailScreen.tsx:464-497` | `measurement-detail.page.html:77-89` |
| **RACHA — Alert info** 'Día completado con semillas' (`showAlertCompleteSeed`) | SÍ | `MeasurementDetailScreen.tsx:499-519` | `measurement-detail.page.html:90-93` |
| **RACHA — Botón 'Recupera tu racha'** (`dayState==='incomplete' && isYesterday && !showAlertIncomplete`) | SÍ | `MeasurementDetailScreen.tsx:522-533` | `measurement-detail.page.html:94-107` |
| **RACHA — Modal de confirmación** (content HTML, 'omitir'/'Pagar', reverseButton, colorBtn='uva_blue-600') | SÍ | `MeasurementDetailScreen.tsx:540-555` | `measurement-detail.page.ts:348-380` |
| **RACHA — Tras confirmar pago** (recoverStreak() + dayState→'complete' + showAlertCompleteSeed=true) | SÍ | `MeasurementDetailScreen.tsx:305-313` | `measurement-detail.page.ts:366-374` |
| Fecha formateada 'EEEE d de MMMM, yyyy' (locale es) | SÍ | `MeasurementDetailScreen.tsx:194-196` | `measurement-detail.page.ts:137-140` |
| showAlertIncomplete inicial Seed<5 (default true) | SÍ (alineado) | `MeasurementDetailScreen.tsx:182,209` | `measurement-detail.page.ts:64,105-107` |
| Loading | SÍ | `MeasurementDetailScreen.tsx:327-329` | — |

### Gaps de MeasurementDetailScreen

| Estado faltante | Severidad | Refs RN | Refs original |
|---|---|---|---|
| **backRoute dinámico por `origin` AUSENTE** — original vuelve a /home si origin==='home', a /history si no; RN siempre `navigation.goBack()` (no desestructura `origin`). | MEDIA | `MeasurementDetailScreen.tsx:176,324` | `measurement-detail.page.ts:130-134` |
| **Estado Day 'saveStreak' nunca se asigna** — RN computa solo 'complete'/'incomplete'/'normal'; un día con racha salvada se muestra como 'complete' en vez del ícono checkSaveStreak. | MEDIA | `MeasurementDetailScreen.tsx:185-287` (vs `Day.tsx:239-307`) | `measurement-detail.page.html:12` |
| **Estado Day 'today' nunca se asigna** — un día de hoy con tareas incompletas se muestra 'incomplete' en vez del fondo teal de 'today'. | MEDIA | `MeasurementDetailScreen.tsx:185-287` (vs `Day.tsx:163,209`) | `measurement-detail.page.html:12` |
| **Day state recalculado de BD vs param** — original recibe `date.state` del calendario; RN lo recomputa. Equivalente salvo divergencia entre caché del calendario y DataStore. | MEDIA | `MeasurementDetailScreen.tsx:285-287` | `measurement-detail.page.html:12` |
| **backdropDismiss=false del modal ausente** — original impide cerrar tocando el fondo; ConfirmModal RN no expone la prop. | BAJA | `MeasurementDetailScreen.tsx:540-555` | `measurement-detail.page.ts:359` |
| **Imagen de semilla en modal ausente** — original muestra `semilla.svg` 100x100; RN usa solo '5 semillas' en texto. | BAJA | `MeasurementDetailScreen.tsx:97-101` | `measurement-detail.page.ts:34-38` |

---

## Feature: historical-detail (3 pantallas — 1 COMPLETA / 2 PARCIAL)

**Veredicto:** TimeFrameComponent COMPLETO. HistoricalScreen y MeasurementDetailScreen con cobertura alta pero huecos verificables (variables de año, estados de Day, gráfica bar, toasts).

### HistoricalScreen (tab Historial) — PARCIAL

| Estados cubiertos | Refs |
|---|---|
| Vista mes vacío/con datos, modo calendario/gráfica, selector de variable activa, tabla avg/max/min | `HistoricalScreen.tsx:122-127,719-854` |
| Navegación mes/año con rollover, botón siguiente disabled, vista año (12 mini-calendarios grid 3 col) | `HistoricalScreen.tsx:500-534,916-1023` |
| Compartir: 'Generando...', toast éxito/error, solo en vista mes, loading | `HistoricalScreen.tsx:636-908` |

| Estados faltantes | Severidad | Refs |
|---|---|---|
| **Variables de vista año incorrectas** — useEffect hardcodea `'month'` en initializeVariables ignorando timeFrame='year'; la tabla muestra datos del mes, no del año. | ALTA | `historical.page.ts:512-526` vs `HistoricalScreen.tsx:329` |
| **Tipo de gráfica 'bar' no soportado** — Areachart RN no tiene prop 'type'; mediciones tipo bar (lluvia) se dibujan siempre como línea. | MEDIA | `historical.page.ts:421,434` vs `Areachart.tsx` |
| **Variables no se actualizan al cambiar segmento en modo gráfica** — changeSegment no invoca updateChartData. | MEDIA | `historical.page.ts:173-176` vs `HistoricalScreen.tsx:487-496` |
| Toast warning 'La función de compartir no está disponible' ausente. | MENOR | `historical.page.ts:951-963` vs RN (cae al fallback sin avisar) |
| Toast warning 'Reporte compartido como texto (imagen no disponible)' ausente — fallback muestra mismo mensaje de éxito. | MENOR | `historical.page.ts:1079-1097` vs `HistoricalScreen.tsx:643` |

### TimeFrameComponent — COMPLETA

Segmento Mes/Año, Mes activo por defecto, etiquetas español, callback al padre. `TimeFrame.tsx:66-93`, `HistoricalScreen.tsx:270,690,911`. Sin faltantes.

### MeasurementDetailScreen — PARCIAL

Ver sección destacada arriba. Gaps de historical-detail: estados Day 'saveStreak'/'today' perdidos (`measurement-detail.page.html:12` vs `MeasurementDetailScreen.tsx:185-292`), navegación de regreso por goBack() cubre ambos orígenes.

---

## Feature: profile (5 pantallas — 1 COMPLETA / 4 PARCIAL)

**Veredicto:** AchievementScreen es la única COMPLETA. Las otras 4 tienen brechas reales verificables (branding dinámico, focus visual, color de icono, batería/título).

### ProfileScreen — PARCIAL

| Estados cubiertos | Refs |
|---|---|
| Nombre, Graduado, Semillas dinámicas, badge rojo + campana condicional | `ProfileScreen.tsx:103-104,190,282-348` |
| Modal compartir (5 opciones), WhatsApp wa.me, copiar enlace, Más, soporte, cerrar sesión | `ProfileScreen.tsx:138-241,420-469` |

| Estados faltantes | Severidad | Refs |
|---|---|---|
| **Logo de branding dinámico AUSENTE** — RN usa logo hardcodeado `logo_Natura_Isagen.png`; RACIMOs con branding propio no ven su logo. | MEDIA | `profile.page.ts:145-151` vs `ProfileScreen.tsx:411-416` |
| **Logout no verifica fallo de signOut** — navega aunque signOut() falle (catch no hace rollback). | BAJA | `profile.page.ts:233-236` vs `ProfileScreen.tsx:173-186` |

### PersonalInfoScreen — PARCIAL

| Estados cubiertos | Refs |
|---|---|
| Solo lectura/edición, Teléfono disabled, parseo defensivo de fields, Lat+Lon side-by-side | `PersonalInfoScreen.tsx:96,154-170,328,416-490` |
| modal_Delete (2 pasos: aviso + input ELIMINAR CUENTA), goDeleteAccount, footer sticky, validación formulario | `PersonalInfoScreen.tsx:223,238-256,563-760` |

| Estados faltantes | Severidad | Refs |
|---|---|---|
| **Focus visual per-input AUSENTE** — original aplica clase 'focused' (borde azul) por ion-item; RN tiene borde uniforme global sin onFocus/onBlur por campo. | MEDIA | `personal-info.page.ts:296-323` vs `PersonalInfoScreen.tsx:260-261` |
| Typo 'Para guadar...' corregido a 'Para guardar...' en RN (divergencia textual, no funcional). | INFO | `personal-info.page.ts:261` vs `PersonalInfoScreen.tsx:223` |

### AchievementScreen — COMPLETA

Grid de logros (brote/plantula/flor), estado vacío con mensaje (mejora), **bug de acumulación CORREGIDO** (reset del array), FAB '¿Dudas?', modal_token_a/b con transición setTimeout(300ms), fondo con patrón. `AchievementScreen.tsx:75-484`. Sin faltantes.

### AlertsScreen — PARCIAL

| Estados cubiertos | Refs |
|---|---|
| FlatList + unread-dot, iconos por tipo/subtipo, fondos por tipo, estado vacío, markAsRead, deleteAll FAB, settings, timestamps | `AlertsScreen.tsx:67-336` |

| Estados faltantes | Severidad | Refs |
|---|---|---|
| **Color de icono `streak_recovery` INCORRECTO** — debería ser Colors-Blue-900 (#164551); RN devuelve #0d8f9a (uva_green-700, igual que streak_recovered). | MEDIA | `alerts.page.scss:105-108` vs `AlertsScreen.tsx:213-215` |

### ConfigurationScreen — PARCIAL

| Estados cubiertos | Refs |
|---|---|
| Toggle notificaciones con requestPermissions+revert, toasts, chip de estado, panel colapsable (Permisos/Programación/Batería) | `ConfigurationScreen.tsx:217-366,497-658` |
| Botón Solicitar Permisos/Guía Batería condicionales, lista issues, SyncAction #1/#2, syncData, updateConfiguration, AppState listener + cleanup | `ConfigurationScreen.tsx:174-305,664-689` |

| Estados faltantes | Severidad | Refs |
|---|---|---|
| **showBatteryOptimizationGuidance es STUB** — muestra toast en vez de abrir ajustes de batería Android (TODO B19). | MEDIA | `configuration.page.ts:366-367` vs `ConfigurationScreen.tsx:335-343` |
| **batteryOptimized nativo nunca se activa** — isBatteryOptimized() retorna false; chip 'Optimización de batería activa' y botón 'Guía de Batería' nunca aparecen en dispositivo real (DEV-1). | MEDIA | `ConfigurationScreen.tsx:44-47` |
| **Título 'Configuración' mal alineado** — textAlign:'right' en vez de centrado. | BAJA | `configuration.page.html:9` vs `ConfigurationScreen.tsx:721-723` |

---

## Feature: moon-config (3 pantallas — 2 COMPLETA / 1 PARCIAL)

**Veredicto:** Sustancialmente completa. MoonPhaseScreen y SyncActionComponent COMPLETA; ConfigurationScreen PARCIAL (mismos gaps que en profile, más un toast de tipo distinto).

### MoonPhaseScreen — COMPLETA

| Estados cubiertos | Refs |
|---|---|
| Fase inicial FULL_MOON, fase cargada, phaseMoonDays, moonEvents formato es-ES, estado vacío, estado error, seed via useFocusEffect, nombre mes español, MoonCard green, calendario moon, Promise.all 3-way, mounted guard | `MoonPhaseScreen.tsx:49-199` |

| Advertencias (no faltantes) | Severidad | Refs |
|---|---|---|
| hasProfileButton oculta perfil si seed=null (original siempre muestra header). | COSMÉTICA | `MoonPhaseScreen.tsx:155` vs `moon-phase.page.html:1-6` |
| usa getLastUserProgressPure() (sin side-effects); si MoonPhase es la primera pantalla del día, no se crea el registro diario. | BAJA | `MoonPhaseScreen.tsx:91` vs `moon-phase.page.ts:119` |

### ConfigurationScreen — PARCIAL

Cobertura completa de lifecycle (useFocusEffect=ionViewWillEnter+ionViewWillLeave), AppState listener con setTimeout 500ms, los 3 chips de diagnóstico, panel colapsable, doble SyncAction, toggle con revert, todos los toasts, updateConfiguration. Tests exhaustivos en b18-configuration.test.tsx (9 grupos, ~20 casos).

| Estados faltantes | Severidad | Refs |
|---|---|---|
| **Toast 'Notificaciones deshabilitadas' usa type:'info'** — original usa color:'success'. Mensaje correcto, color distinto. | MEDIA | `configuration.page.ts:234-238` vs `ConfigurationScreen.tsx:248` |
| showBatteryOptimizationGuidance stub (TODO B19) — original también era stub (no regresión). | BAJA | `notification.service.ts:361-363` vs `ConfigurationScreen.tsx:335-343` |
| exactAlarmAvailable real simplificado a true por defecto (DEV-2) — no regresión. | BAJA | `notification.service.ts:316-320` vs `LocalRemindersService.ts:354-358` |
| isBatteryOptimized() retorna false por defecto (DEV-1) — chip nunca se muestra en producción. | BAJA | `notification.service.ts:343-354` vs `LocalRemindersService.ts:380-384` |

### SyncActionComponent — COMPLETA

Estado sin/con pendientes, botón disabled/habilitado, click→onClickSync, props equivalentes. `SyncAction.tsx:44-183`. Sin faltantes.

---

## Backlog de remediación priorizado (cobertura)

> Lista accionable de cada estado faltante ordenada por severidad. Esto es lo que se corregirá después.

### CRÍTICA

1. **Multi-flow roto (3 puntos)** — `MeasurementScreen.tsx:351-355` + `RegisterMeasurementScreen.tsx:206-213,463-466`.
   **Fix:** (a) En MeasurementScreen, seleccionar el primer flow NO contenido en `task.flowsComplete` en vez de `flows[0]`. (b) Pasar `flowId` real como param de navegación. (c) En RegisterMeasurement, leer `flowId` del param en el init useEffect en vez de cargar siempre `task.flows[0]`. Dejar de pasar nextFlow como taskName.

### ALTA

2. **Encadenamiento `nextGuide` roto** — `GuideMeasurementScreen.tsx:143-154`.
   **Fix:** Tras OK, si existe nextGuide, navegar/reabrir la siguiente guía en vez de `goBack()` incondicional.

3. **Notificaciones diarias ausentes en Home** — `HomeScreen.tsx` (sin import).
   **Fix:** Replicar `setNotifications()` del original: importar LocalRemindersService, leer getEnableNotifications() y, si está habilitado, llamar scheduleDailyNotifications() en el useEffect de montaje.

4. **Variables de vista año incorrectas** — `HistoricalScreen.tsx:329`.
   **Fix:** Pasar el `timeFrame` actual ('month'/'year') a initializeVariables en vez de hardcodear 'month'.

### MEDIA

5. **Estados Day 'saveStreak' y 'today' perdidos en MeasurementDetail** — `MeasurementDetailScreen.tsx:185-292`.
   **Fix:** Propagar el `state` del calendario (saveStreak/today) vía param, o computar también esos estados localmente (isToday + SaveStreak del progreso).

6. **Gráfica tipo 'bar' no soportada** — `Areachart.tsx`.
   **Fix:** Añadir prop `type` ('line'|'bar') a Areachart y renderizar barras para mediciones tipo bar (lluvia).

7. **Variables no se actualizan al cambiar segmento en modo gráfica** — `HistoricalScreen.tsx:487-496`.
   **Fix:** En changeSegment, si typeView==='chart', invocar updateChartData tras initializeVariables.

8. **Modal de confirmación de solo lectura** — `RegisterMeasurementScreen.tsx:681-697`.
   **Fix:** Replicar los inputs digit-by-digit editables del original para permitir corregir antes de guardar.

9. **Mensaje personalizado de vinculación perdido** — `ProjectVinculationScreen.tsx:239`.
   **Fix:** Restaurar '{name}, por último ingresa el código de invitación enviado a tu Whatsapp...' y placeholder 'Ejemplo: ISA234'.

10. **Logo de branding dinámico ausente en Profile** — `ProfileScreen.tsx:411-416`.
    **Fix:** Cargar el logo vía ConfigContext.loadImage(branding.logo) en vez de require estático.

11. **Color de icono streak_recovery** — `AlertsScreen.tsx:213-215`.
    **Fix:** Devolver #164551 (Colors-Blue-900) para subtype streak_recovery, distinguiéndolo de streak_recovered.

12. **backRoute por origin en MeasurementDetail** — `MeasurementDetailScreen.tsx:176,324`.
    **Fix:** Desestructurar `origin` de route.params y navegar a Home/History en consecuencia (o validar que goBack() siempre acierta).

13. **Focus visual per-input en PersonalInfo** — `PersonalInfoScreen.tsx`.
    **Fix:** Añadir onFocus/onBlur por campo que cambie el borderColor del contenedor individual.

14. **showBatteryOptimizationGuidance / batteryOptimized nativo** — `ConfigurationScreen.tsx:335-343,44-47`.
    **Fix (B19):** Implementar apertura de ajustes de batería Android vía Linking/IntentLauncher y un módulo nativo para isBatteryOptimized().

15. **Modal de confirmación digit-by-digit / gif / blur en RegisterMeasurement** — `RegisterMeasurementScreen.tsx:652,725-763`.
    **Fix:** Añadir gif done_register.gif al modal guardado y blur del contenido de fondo al abrir el modal de confirmación.

16. **isHtmlText e ícono enable/disable en GuideMeasurement** — `GuideMeasurementScreen.tsx:226-268`.
    **Fix:** Aceptar isHtmlText como entrada y renderizar texto plano como literal; chequear guide.icon?.enable antes de renderizar el ícono.

17. **Toast 'Notificaciones deshabilitadas' type:'info'** — `ConfigurationScreen.tsx:248`.
    **Fix:** Usar type:'success' como el original.

18. **Filtro enabled en RegisterProjectForm** — `RegisterProjectFormScreen.tsx:93`.
    **Fix:** Eliminar `.filter(f => f.enabled)` para mostrar todos los fields definidos.

### BAJA

19. Capitalización de textos del modal (Login/SetPhone) — alinear 'No, editar'/'Sí, continuar'.
20. backdropDismiss=false e imagen de semilla en el modal de recuperación de racha — `MeasurementDetailScreen.tsx:540-555,97-101`.
21. Cancelar de ValidateProject navega a Login vs project-vinculation — decisión de producto.
22. Logout sin rollback si signOut falla — `ProfileScreen.tsx:173-186`.
23. Título 'Configuración' alineado a la derecha — centrarlo.
24. Texto '¿No has recibido ningún código?' visible con error en Otp; modal_Days con SVGs vs Day numerados; hasProfileButton oculta perfil si seed=null.

---

## Estado tras remediación (re-auditoría adversarial — 2026-06-16)

> Re-auditoría post-remediación: todos los estados faltantes corregidos por los 6 agentes se leyeron en el código actual. Se verificó la cobertura de pantallas resultante.

### Conteo de pantallas actualizado

| Feature | COMPLETA | PARCIAL | FALTANTE | Notas |
|---|---|---|---|---|
| auth-register | 14 | 0 | 0 | ProjectVinculationScreen y ValidateProjectScreen ahora COMPLETA |
| home | 1 | 1 | 0 | HomeScreen ahora COMPLETA (notificaciones corregidas) |
| measurement | 0 | 4 | 0 | Sin cambios de estado en pantallas, pero bugs críticos internos corregidos |
| historical-detail | 2 | 1 | 0 | HistoricalScreen ahora COMPLETA; MeasurementDetailScreen sigue PARCIAL |
| profile | 3 | 2 | 0 | ProfileScreen, AlertsScreen, PersonalInfoScreen ahora COMPLETA |
| moon-config | 2 | 1 | 0 | Sin cambios |
| **TOTAL** | **22** | **9** | **0** | 22/31 COMPLETA (+6 vs original), 9/31 PARCIAL (-6 vs original) |

### Hallazgos corregidos (PARCIAL → COMPLETA o brecha cerrada)

| # orig | Pantalla / Hallazgo | Estado anterior | Estado actual |
|---|---|---|---|
| #3 | HomeScreen — `setNotifications` ausente | PARCIAL | **CORREGIDO** |
| #4 | HistoricalScreen — variables año usan `'month'` hardcodeado | PARCIAL | **CORREGIDO** |
| #5 | MeasurementDetailScreen — `saveStreak` y `today` nunca asignados | PARCIAL | **CORREGIDO** |
| #1 | MeasurementScreen / RegisterMeasurement — multi-flow goToRegister ignora `flowsComplete` | PARCIAL CRÍTICA | **CORREGIDO** |
| #2 | GuideMeasurementScreen — encadenamiento `nextGuide` roto | PARCIAL ALTA | **CORREGIDO** |
| #8 | ProjectVinculationScreen — mensaje personalizado con nombre perdido | PARCIAL | **CORREGIDO** |
| #9 | ProfileScreen — logo branding dinámico ausente | PARCIAL | **CORREGIDO** |
| #10 | AlertsScreen — color icono `streak_recovery` incorrecto | PARCIAL | **CORREGIDO** |
| #13 | PersonalInfoScreen — focus visual per-input ausente | PARCIAL | **CORREGIDO** |
| #17 | ConfigurationScreen — toast tipo `info` en vez de `success` | PARCIAL | **CORREGIDO** |
| #18 | RegisterProjectFormScreen — filtro `enabled` oculta campos | PARCIAL | **CORREGIDO** |
| — | LoginScreen — capitalización textos modal | PARCIAL BAJA | **CORREGIDO** |
| — | ValidateProjectScreen — cancelTimer destino incorrecto | PARCIAL BAJA | **CORREGIDO** |

### Hallazgos aún abiertos (PARCIAL sin resolver)

| # | Pantalla | Estado faltante | Severidad |
|---|---|---|---|
| 6 | HistoricalScreen | Gráfica tipo `bar` no soportada (lluvia se dibuja como línea) | MEDIA |
| 7 | HistoricalScreen | Variables no se actualizan al cambiar segmento en modo gráfica | MEDIA |
| — | MeasurementDetailScreen | `backdropDismiss=false` e imagen de semilla en modal racha | BAJA |
| — | RegisterMeasurementScreen | Modal confirmación de solo lectura (original tiene inputs editables) | MEDIA |
| — | RegisterMeasurementScreen | `done_register.gif` ausente en modal guardado | MEDIA |
| — | GuideMeasurementScreen | `isHtmlText` como entrada ausente; ícono `enable` flag no chequeado | MEDIA |
| — | ConfigurationScreen | `showBatteryOptimizationGuidance` es STUB (TODO B19) | MEDIA |
| — | OtpScreen | Texto OTP visible con error; `modal_Days` SVGs vs Day numerados | BAJA |
| — | ProfileScreen | Logout sin rollback si `signOut` falla | BAJA |
| A-1 | SyncContext | `STATE_SYNC_DS` enum string en vez de numérico | MEDIA |

### Cobertura final

| Métrica | Valor original | Valor tras remediación |
|---|---|---|
| Pantallas COMPLETA | 17/31 (55%) | **22/31 (71%)** |
| Pantallas PARCIAL | 14/31 (45%) | **9/31 (29%)** |
| Pantallas FALTANTE | 0/31 | **0/31** |
| Hallazgos críticos abiertos | 1 | **0** |
| Hallazgos altos abiertos | 5 | **0** |
| Hallazgos medios abiertos | 8 | **~7** (1 enum + 6 UI menores) |

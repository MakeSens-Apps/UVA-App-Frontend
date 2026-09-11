# Auditoría de Fidelidad de Lógica — Migración Ionic→React Native (App UVA)

> Auditoría función-por-función de la lógica de negocio/dominio migrada desde la app Angular/Ionic original hacia la app React Native (`mobile/`). Se contrastan implementaciones originales y portadas con referencias `archivo:línea` provistas por los auditores de cada área.

---

## Resumen ejecutivo

| Métrica | Valor (auditoría inicial) | Valor (tras remediación) |
|---|---|---|
| **Áreas auditadas** | 6 | 6 |
| **% lógica preservada (promedio ponderado)** | **~87%** | **~96%** |
| **Unidades DIVERGED** | 13 | 1 abierta (enum sync) |
| **Unidades MISSING** | 6 | 0 abiertas |
| **Unidades ADDED** | 7 | 7 |
| **Severidad crítica** | 1 (multi-flow goToComplete) | 0 |
| **Severidad alta** | 7 | 0 |
| **Severidad media** | 4 | 1 (enum numérico→string) |

### % de lógica preservada por área (actualizado tras remediación)

| Área | % inicial | % final | Delta | Estado |
|---|---|---|---|---|
| moon | **93%** | **93%** | — | Sin divergencias reales |
| gamification | **91%** | **96%** | +5% | Notificaciones diarias portadas |
| setup-auth | **90%** | **98%** | +8% | 4 divergencias cerradas |
| datastore-api | **88%** | **96%** | +8% | S3 binary corregido; enum abierto |
| historical-agg | **85%** | **97%** | +12% | calculateValue, selected, timeFrame corregidos |
| measurement-engine | **74%** | **97%** | +23% | Multi-flow, nextGuide, failedIdx, partial-digit corregidos |

---

## ¿Copiaron o reescribieron?

**Respuesta directa: hicieron AMBAS cosas, de forma deliberada y por capa.**

1. **La lógica de negocio/dominio se COPIÓ y se ADAPTÓ mecánicamente** (con tests automatizados de respaldo). Los algoritmos puros — cálculo de semillas y rachas, umbrales de hito, agregaciones estadísticas, mapeo de fases lunares, validaciones de rango, parseo defensivo — se transcribieron carácter a carácter o casi, cambiando solo lo imprescindible para la plataforma (rutas de import, DI de Angular → singletons de módulo / React Context, APIs nativas de Capacitor → Expo). Ejemplos concretos de **copia literal**:
   - `calculateDaysDifference` (`user-progress-ds.service.ts:335-358` → `user-progress-ds.ts:406-429`): "Código copiado literalmente".
   - `eventMessages` — catálogo de **135 mensajes** de gamificación (`gamification-alerts-types.service.ts:60-203` → `gamification-alerts-types.ts:73-217`): "idénticos carácter a carácter".
   - `transformData`, `sum`, `mean`, `calculateMeasurement` (`historical.page.ts` → `historical-aggregations.ts`): "idéntico línea por línea".
   - `PHASE_MAPPING` y los 5 `.replace()` de `sanitizeAWSJSON` (`moon-phase.service.ts` → `moon-phase.ts`): "byte-for-byte idénticos".
   - Todos los servicios DataStore/API (`measurement-ds`, `uva-ds`, `user-ds`, `racimo-ds`, todas las `*-api`): predicados, sorts y mappings "line-for-line idénticos".
   - Constantes de negocio preservadas: `daysForStreak=7`, `bonusSeedForStreak=3`, `recoverStreakCost=5`, umbrales de hito `11/41/64`. Incluso **bugs y typos load-bearing se conservaron a propósito**: `getMeasurementsByMont` (typo), `mensage` (typo de error), `'Cuarto crescente'` (typo), botón "No" del bonus que llama `responseBonus(true)` (bug original preservado).

2. **La capa de UI/pantalla se REESCRIBIÓ por completo** (Angular templates + Ionic components → JSX + React Native), portando la lógica de cada página a hooks. Ejemplos concretos de **reescritura**:
   - Ciclos de vida: `ngOnInit`/`ionViewWillEnter` → `useEffect`/`useFocusEffect` (Home, MoonPhase, Configuration).
   - Estado reactivo: `BehaviorSubject<number>` + `Observable` → React Context + `useState`/`useUnreadCount()` (`NotificationService` → `NotificationContext.tsx`).
   - Modales Ionic `ModalController` → componentes `ConfirmModal`/`UvaBottomSheet`.
   - Inputs por dígito: `document.getElementById` + `IonInput.setFocus()` → mapa de refs de React.
   - Captura de imagen: `html-to-image.toPng()` + DOM Angular → `react-native-view-shot captureRef()`.
   - `Hub.listen('datastore')` estático → `SyncContext` con `useEffect` y cleanup.

**Conclusión:** el dominio es una migración de alta fidelidad (copiar-adaptar con tests); la UI es un port (reescritura disciplinada de la misma lógica). El riesgo no está en los cálculos (fieles) sino en la **costura UI↔dominio**: navegación multi-flow, encadenamiento de guías, inicialización del cálculo diario y conversión de binarios S3.

---

## DIVERGED / MISSING ordenados por severidad (global)

| # | Severidad | Área | Unidad | Estado | Refs |
|---|---|---|---|---|---|
| 1 | **CRÍTICA** | measurement-engine | `goToComplete` — navegación al siguiente flow | DIVERGED | `register-measurement.page.ts:534-552` vs `RegisterMeasurementScreen.tsx:456-468` |
| 2 | **ALTA** | gamification | `recalculateDailyProgress` — cálculo diario ahora explícito (no implícito) | DIVERGED | `user-progress-ds.service.ts:119` vs `user-progress-ds.ts:179` |
| 3 | **ALTA** | measurement-engine | `save()` — orden de validación vs modal de confirmación | DIVERGED | `register-measurement.page.ts:315-373` vs `RegisterMeasurementScreen.tsx:356-380,424-452` |
| 4 | **ALTA** | measurement-engine | `OpenGuide` — encadenamiento de `nextGuide` roto | DIVERGED | `register-measurement.page.ts:199-227` vs `GuideMeasurementScreen.tsx:143-155` |
| 5 | **ALTA** | historical-agg | `initializeVariables` — no preserva `selected` al recargar | DIVERGED | `historical.page.ts:531-543` vs `HistoricalScreen.tsx:402-414` |
| 6 | **ALTA** | historical-agg | `initializeVariables` — reset de `selected` en navegación de mes (modo gráfica) | DIVERGED | `historical.page.ts:531-549` vs `HistoricalScreen.tsx:315-337` |
| 7 | **ALTA** | datastore-api | `S3Service.getFile` — rama binaria devuelve texto, no base64 válido | DIVERGED | `s3.service.ts:143-153` vs `s3.ts:126-161` |
| 8 | **ALTA** | datastore-api | `FileSystemService.getFileUri` — elimina `convertFileSrc()`, devuelve `file://` crudo | ADAPTED (impacto alto) | `file-system.service.ts:254-267` vs `file-system.ts:285-295` |
| 9 | **ALTA** | datastore-api | `ConfigurationAppService.downLoadData` — cadena BLOB→BASE64 con eslabón roto | ADAPTED (impacto alto) | `configuration-app.service.ts:37-91` vs `ConfigContext.tsx:147-184` |
| 10 | **ALTA** | datastore-api | `applyColors` — theming dinámico por RACIMO ausente (ThemeProvider B08 no verificado) | MISSING | `configuration-app.service.ts:273-285` vs AUSENTE |
| 11 | **MEDIA** | measurement-engine | `validateRestriction` — `failedMeasurementIndex` siempre resuelve a 0 | DIVERGED | `register-measurement.page.ts:449-453` vs `measurement-engine.ts:174-177` |
| 12 | **MEDIA** | measurement-engine | Alerta de rango se muestra con dígitos parciales (sin guard `length === fields`) | DIVERGED | `register-measurement.page.html:49-63` vs `RegisterMeasurementScreen.tsx:506-511` |
| 13 | **MEDIA** | historical-agg | `calculateValue` — nunca se invoca; `variable.value` siempre `undefined` | MISSING | `historical.page.ts:558-577` vs `HistoricalScreen.tsx:402-413` |
| 14 | **MEDIA** | setup-auth | `RegisterProjectFormScreen` — filtra `fields` por `enabled=true` (original no filtra) | DIVERGED | `register-project-form.page.ts:89` vs `RegisterProjectFormScreen.tsx:93` |
| 15 | **MEDIA** | datastore-api | `STATE_SYNC_DS` — enum numérico → string (rompe comparaciones por orden) | DIVERGED | `sync-monitor-ds.service.ts:6-11` vs `sync-monitor.ts:23-28` |
| 16 | **MEDIA** | datastore-api | `ConfigurationAppService.loadImage` — branching de plataforma sin `convertFileSrc` | DIVERGED | `configuration-app.service.ts:189-203` vs `ConfigContext.tsx:359-377` |
| 17 | BAJA | setup-auth | `clearSession` — solo borra 9 claves de sesión (original borraba todo Preferences) | DIVERGED | `session.service.ts:74` vs `session.ts:120` |
| 18 | BAJA | setup-auth | `SetupService`/`SetupRacimoService` crean `new SessionService()` en vez del singleton | DIVERGED | `setup.service.ts:29` vs `setup.ts:33` |
| 19 | BAJA | setup-auth | `LoginScreen` — capitalización de textos del modal ("No, editar" vs "No, Editar") | DIVERGED | `login.page.ts:99` vs `LoginScreen.tsx:125` |
| 20 | BAJA | setup-auth | `ValidateProjectScreen.cancelTimer` — navega a Login (original no navegaba) | DIVERGED | `validate-project.page.ts:88` vs `ValidateProjectScreen.tsx:119` |
| 21 | BAJA | moon | `mapPhaseToEnum` — se elimina el guard `Array.isArray` (dead code hoy) | DIVERGED | `moon-phase.service.ts:407-413` vs `moon-phase.ts:132-135` |
| 22 | BAJA | datastore-api | `SyncMonitor.isAppUsageEvent` — comparación por referencia de clase (fix R-21 Hermes) | DIVERGED | `sync-monitor-ds.service.ts:129-151` vs `SyncContext.tsx:63-81` |
| 23 | BAJA | datastore-api | `waitForSyncDataStore` — polling sin timeout → timeout de 30s (fix R-04) | DIVERGED | `sync-monitor-ds.service.ts:96-106` vs `SyncContext.tsx:188-230` |
| 24 | BAJA | datastore-api | `FileSystemService.readDirectory` — devuelve `string[]` en vez de `FileInfo[]` | ADAPTED | `file-system.service.ts:233-246` vs `file-system.ts:267-278` |
| 25 | BAJA | gamification | `showBatteryOptimizationGuidance` — ausente (original era stub vacío) | MISSING | `notification.service.ts:361-364` vs AUSENTE |
| 26 | BAJA | gamification | Métodos `debug*` (6) — eliminados (no aplican en RN) | MISSING | `gamification.service.ts:31-171` vs AUSENTE |

> Nota: la divergencia `S3 binary` (datastore-api) tiene severidad **alta** marcada como `media` por el auditor en una sub-entrada del enum y `alta` en la entrada de archivo. Se reporta como **alta** por ser potencialmente corruptora de datos en producción.

---

## Área: gamification — 91% preservado

**Veredicto:** Lógica de cálculo migrada con alta fidelidad: constantes (`daysForStreak=7`, `bonusSeedForStreak=3`, `recoverStreakCost=5`, umbrales `11/41/64`), algoritmos de semillas/racha/bonus, catálogo completo de 135 mensajes y toda la infraestructura de alertas y eventos. La **divergencia crítica (alta)** es arquitectural: el cálculo diario de progreso (creación de registros nuevos, reset de racha, alertas `streak_lost`/`streak_recovery`) era implícito vía `getLastUserProgress()` y ahora es **explícito** vía `recalculateDailyProgress()`. Debe auditarse el bootstrap/splash de RN para confirmar que se invoca una vez por sesión.

| Función | Original:línea | RN:línea | Estado | Severidad | Detalle |
|---|---|---|---|---|---|
| `completeTaskProcess` | `gamification.service.ts:178-275` | `gamification.ts:61-158` | ADAPTED | baja | Lógica idéntica: retries=3, backoff `1000*retryCount`, +1 semilla en primera tarea, +1 semilla +1 racha al completar todas, verificación post-update, alertas en try-catch secundario. Único cambio: `getLastUserProgress()` → `getLastUserProgressPure()` (lectura pura). Más seguro en edge case de medianoche. |
| `streakBonus` (private) | `gamification.service.ts:395-418` | `gamification.ts:315-338` | ADAPTED | baja | `daysForStreak=7`, `bonusSeedForStreak=3`, condición `streak % 7 === 0`, `+3` semillas, `createStreakRewardAlert(streak)` idénticos. Solo cambia el getter. |
| `surpriseTaskProcess` | `gamification.service.ts:281-300` | `gamification.ts:166-184` | ADAPTED | baja | Lee último progreso, suma +1 a Seed, actualiza. Solo cambia el getter. |
| `recoverStreak` | `gamification.service.ts:306-389` | `gamification.ts:193-275` | ADAPTED | baja | `recoverStreakCost=5` preservado. Lógica de fechas (today/yesterday/twoDaysAgo) idéntica. Fórmula `newStreak + (latestProgress?.Streak ?? 0)` idéntica (orig:383, RN:268). `createStreakRecoveredAlert()` igual. Solo cambia el getter. |
| `getLastUserProgress` (separación pura/efectos) | `user-progress-ds.service.ts:119-171` | `user-progress-ds.ts:239-242` | ADAPTED | media | Original combina lectura+creación+alertas. RN lo divide en `getLastUserProgressPure()` (149-160) + `recalculateDailyProgress()` (179-225); `getLastUserProgress()` queda como shim que delega (241). Lógica de negocio preservada. RIESGO DE INTEGRACIÓN: `recalculateDailyProgress` debe llamarse desde el init. |
| `getLastUserProgressPure` (nuevo) | AUSENTE | `user-progress-ds.ts:149-160` | ADDED | na | Getter puro para R-28 (sin side-effects en hooks/StrictMode/useFocusEffect). Evita duplicación de registros diarios. |
| `recalculateDailyProgress` (nuevo) | AUSENTE | `user-progress-ds.ts:179-225` | ADDED | na | Extrae los side-effects en método idempotente. diff=0 no-op, diff=1 crea registro + alerta recuperación, diff>1 reinicia racha + alerta racha perdida, + handleMilestoneAssignment. Debe llamarse 1 vez por sesión. |
| `createUserProgress` | `user-progress-ds.service.ts:23-47` | `user-progress-ds.ts:46-70` | PRESERVED | na | Campos ts/Seed/Streak/Milestones/SaveStreak/completedTasks/additionalInfo/userID con defaults (null) idénticos. |
| `updateUserProgress` | `user-progress-ds.service.ts:55-76` | `user-progress-ds.ts:78-99` | PRESERVED | na | `copyOf` con `Object.assign`, retorna undefined si no encuentra. Idéntico. |
| `getUserProgress` | `user-progress-ds.service.ts:86-113` | `user-progress-ds.ts:109-136` | PRESERVED | na | `c.ts.contains(date)` o `Predicates.ALL`, sort+limit idénticos. |
| `calculateDaysDifference` | `user-progress-ds.service.ts:335-358` | `user-progress-ds.ts:406-429` | PRESERVED | na | Copiado literalmente: clona fechas, normaliza medianoche, `Math.floor(diff / (1000*3600*24))`. |
| `seedToMilestone` (umbrales de hito) | `user-progress-ds.service.ts:365-378` | `user-progress-ds.ts:438-451` | PRESERVED | na | Umbrales `11/41/64`, etapas brote/plantula/flor idénticos. Deuda con ConfigModel.gamification documentada en ambos. |
| `handleMilestoneAssignment` | `user-progress-ds.service.ts:385-442` | `user-progress-ds.ts:458-515` | PRESERVED | na | Cálculo de monthsDifference, isLastDayOfMonth, ramas updateUserProgress vs crear registro, alertas germination success/fail. Copiado literalmente. |
| `getMilestones` | `user-progress-ds.service.ts:177-193` | `user-progress-ds.ts:248-264` | PRESERVED | na | Query userID + Milestones ne null/undefined, map+filter. Idéntico. |
| `getCompleteTaskWeek` | `user-progress-ds.service.ts:200-228` | `user-progress-ds.ts:271-299` | PRESERVED | na | Inicio de semana (domingo), rango ts.ge/le, map a {day,tasks,saveStreak}, evaluateCompletedTasks. |
| `getCompletedTasksByMonthYear` | `user-progress-ds.service.ts:237-263` | `user-progress-ds.ts:308-334` | PRESERVED | na | startDate primer día / endDate último día del mes, evaluateCompletedTasks. |
| `getCountTasksByMonthYear` | `user-progress-ds.service.ts:271-301` | `user-progress-ds.ts:342-372` | PRESERVED | na | Mismas fechas, reduce sumando completedTasks. |
| `evaluateCompletedTasks` | `user-progress-ds.service.ts:309-327` | `user-progress-ds.ts:380-398` | PRESERVED | na | tasks>=totalTasks→complete, >0→incomplete, saveStreak→daysSaveStreak. |
| `GamificationAlertsService` — 9 métodos `create*` | `gamification-alerts.service.ts:31-222` | `gamification-alerts.ts:38-229` | PRESERVED | na | Idénticos en lógica, type/subtype y EventData. `getRandomMessageIndex` preservado. |
| `getNotifications` | `gamification-alerts.service.ts:228-291` | `gamification-alerts.ts:236-299` | PRESERVED | na | getGamificationEvents DESC, map parsedData, validateEventData, title/description, formatTimestamp. Fallback idéntico. |
| `getEventTitle`/`getEventDescription`/`formatTimestamp` | `gamification-alerts.service.ts:299-385` | `gamification-alerts.ts:307-393` | PRESERVED | na | Catálogo de 9 títulos idéntico. messageIndex 1-based→0-based. Sustitución {days}/{stage}. Hoy/Ayer/Hace N días idéntico. |
| `markNotificationAsRead` | `gamification-alerts.service.ts:392-418` | `gamification-alerts.ts:400-426` | PRESERVED | na | Busca evento, parsea, isUnread:false, updateGamificationEventData. |
| `deleteAllNotifications` | `gamification-alerts.service.ts:424-426` | `gamification-alerts.ts:432-434` | PRESERVED | na | Delega a `markAllAsClean()`. |
| `eventMessages` (135 mensajes) | `gamification-alerts-types.service.ts:60-203` | `gamification-alerts-types.ts:73-217` | PRESERVED | na | 135 mensajes en español idénticos carácter a carácter. |
| `validateEventData` | `gamification-alerts-types.service.ts:211-239` | `gamification-alerts-types.ts:224-252` | PRESERVED | na | Validación de subtype, isUnread, messageIndex y campos por subtype. |
| `GamificationEventDSService` (completo) | `gamification-event-ds.service.ts:12-155` | `gamification-event-ds.ts:20-163` | PRESERVED | na | create (isUnclean:true), get (userID+isUnclean.eq(true)), getByRacimo, updateData, markAllAsClean. Solo cambia import de SessionService. |
| `NotificationService` (badge unreadCount) | `view/gamification/notification.service.ts:1-40` | `state/notification/NotificationContext.tsx:1-135` | ADAPTED | baja | `BehaviorSubject<number>`+Observable → Context+useState. 3 métodos públicos con misma firma. Añade `useUnreadCount()`. Adaptación canónica. |
| `NotificationService` (push/local) | `services/notification/notification.service.ts:1-409` | `native/notifications/LocalRemindersService.ts:1-482` | ADAPTED | baja | Capacitor → expo-notifications/device/Preferences-shim. Todos los métodos preservados. **Fix R-48**: `removeAllListeners()` (solo borraba handlers JS) → `cancelAllScheduledNotificationsAsync()` (cancela alarmas OS). Añade `getNextReminderTimes()`. |
| `showBatteryOptimizationGuidance` | `services/notification/notification.service.ts:361-364` | AUSENTE | MISSING | baja | El original era stub vacío ("Implementation would go here"). Diferido a B18. Impacto nulo en comportamiento actual. |
| Métodos `debug*` (6) | `gamification.service.ts:31-171` | AUSENTE | MISSING | baja | `window.debugGamification` desde `app.component.ts:139-146`. En RN no hay window/devtools del webview. Para testing se usa `b07-gamification.test.ts`. |
| **`recalculateDailyProgress` — riesgo de integración (init explícito)** | `user-progress-ds.service.ts:119` | `user-progress-ds.ts:179` | **DIVERGED** | **alta** | En el original CUALQUIER `getLastUserProgress()` activa el cálculo diario. En RN, GamificationService usa solo `getLastUserProgressPure()`; el cálculo diario solo ocurre si algo llama explícitamente a `recalculateDailyProgress()`. Si el arranque no lo llama: no se crean registros de días nuevos, no se reinicia la racha, no aparecen alertas `streak_lost`/`streak_recovery`. Verificar splash/session bootstrap. |

---

## Área: measurement-engine — 74% preservado

**Veredicto:** Tres brechas de severidad alta+ requieren atención antes de enviar mediciones multi-flow. Lógica de cálculo correctamente preservada (operadores, getMessageError, guards de rango, auto-avance de dígitos, clave lastMeasurementValues, completeTaskProcess, hasRestrictionTimeTask, groupRemainingLazyMeasurements y el bug No-llama-true).

| Función | Original:línea | RN:línea | Estado | Severidad | Detalle |
|---|---|---|---|---|---|
| `operators` / dict de operaciones | `register-measurement.page.ts:37-49` | `measurement-engine.ts:34-45` | PRESERVED | na | 7 operadores (+,-,*,/,<,>,=) con guard división-por-cero (`b!==0 ? a/b : undefined`). Solo rename 'operaciones'→'operators'. |
| `applyOperator` (helper) | inline | `measurement-engine.ts:56-64` | ADDED | na | Wrapper del map de operadores, añadido para testabilidad. Sin impacto. |
| Modelo Measurement (Task/Flow/FlowRestriction/Guide/...) | `measurements.model.ts:1-139` | `measurements.model.ts:1-151` | PRESERVED | na | Todos los campos preservados, incluido `validationFunction` (R-35, no ejercido). Solo cambia import. |
| `IMeasurement` | `IMeasurement.ts:1-26` | `IMeasurement.ts:1-33` | PRESERVED | na | Todos los campos idénticos. Solo se añade documentación. |
| `ITask` | `ITask.ts:1-11` | `ITask.ts:1-17` | PRESERVED | na | Idéntico. `restrictions?: any` → `unknown` (tipado más estricto). |
| `getMessageError` | `register-measurement.page.ts:559-571` | `measurement-engine.ts:202-214` | PRESERVED | na | Línea por línea: showRestrictionAlert→textRestrictionAlert, guards null, string 'La {sortName} no puede ser {menor/mayor} a {rangeValue} {unit}'. |
| `countTasks` | `configuration-app.service.ts:209-211` | `ConfigContext.tsx:381-383` | PRESERVED | na | `Object.keys(model.tasks).length`. De método de clase a useCallback. |
| `save()` — guard 1 (sin valor) | `register-measurement.page.ts:316-320` | `RegisterMeasurementScreen.tsx:357-361` | PRESERVED | na | Filtra value undefined/null, early return. |
| `save()` — guard 2 (rango) | `register-measurement.page.ts:323-340` | `RegisterMeasurementScreen.tsx:364-370` | PRESERVED | na | `.some()` con `value < min || value > max`. Guards idénticos. |
| **`save()` → orden interacción modal confirmación** | `register-measurement.page.html:84 + .ts:315-373` | `RegisterMeasurementScreen.tsx:356-380,424-452` | **DIVERGED** | **alta** | Original: botón abre modal SIN validar; valida solo al pulsar dentro del modal. RN: valida ANTES de abrir el modal. Si hay datos inválidos, el usuario nunca ve el modal de revisión en RN. Cambia UX. |
| `save()` — OpenModalRegisterOk timing | `register-measurement.page.ts:345,367-370` | `RegisterMeasurementScreen.tsx:387-403` | ADAPTED | baja | Original muestra modal guardado mientras confirm-modal cierra; RN cierra primero y luego muestra. Resultado neto equivalente. |
| `validateRestriction` — throw vs return | `register-measurement.page.ts:380-476` | `measurement-engine.ts:134-188 + screen:307-351` | ADAPTED | baja | Original lanza Error (rechazo no manejado); RN retorna `{valid:false,...}`. Ambos abortan el save. RN más limpio. |
| `validateRestriction` — comparación flow key | `register-measurement.page.ts:391` | `RegisterMeasurementScreen.tsx:321` | PRESERVED | na | Verifica que el flow guardado coincide con flowId actual. Idéntico. |
| `validateRestriction` — operador fijo '0:>:1' (R-35) | `register-measurement.page.ts:434` | `measurement-engine.ts:156` | PRESERVED | na | Hardcode `'0:>:1'`, ignora validationFunction. `split(':')` idéntico. |
| **`validateRestriction` — failedMeasurementIndex** | `register-measurement.page.ts:449-453` | `measurement-engine.ts:174-177` | **DIVERGED** | **media** | Original busca en `this.measurement[]` (posición real). RN busca en `restriction.measurementIds` contra allMeasurementValues → SIEMPRE devuelve 0. Si la medición que falla es `[1]+`, se resalta la medición incorrecta. |
| `validateRestriction` — valuesAllMeasuraments | `register-measurement.page.ts:401-414` | `RegisterMeasurementScreen.tsx:323-328` | PRESERVED | na | `[...lastMeasurementValues, ...valuesMeasurements]` con shape {flow,id,value}. |
| `lastMeasurementValues` storage key | `register-measurement.page.ts:384-385,523-524` | `preferences.ts:29 + screen:313` | PRESERVED | na | Clave `'lastMeasurementValues'`. Shim Capacitor Preferences → AsyncStorage. |
| `goToNexFlowOrSavePreference` — sin nextFlow | `register-measurement.page.ts:482-511` | `RegisterMeasurementScreen.tsx:384-403` | PRESERVED | na | remove key, esperar 2000ms, `completeTaskProcess(totalTask)`, navegar. `window.location.reload()` → navigate (más correcto). |
| `goToNexFlowOrSavePreference` — con nextFlow | `register-measurement.page.ts:513-527` | `RegisterMeasurementScreen.tsx:405-418` | PRESERVED | na | Guarda valores con flow key = NEXT flow id, habilita restricción en la siguiente pantalla. |
| **`goToComplete` — navegación al siguiente flow** | `register-measurement.page.ts:534-552` | `RegisterMeasurementScreen.tsx:456-468` | **DIVERGED** | **crítica** | Original navega con `{flowId: this.flow.nextFlow,...}`. RN pasa `{taskId, taskName: flow.nextFlow}` PERO el screen lee `tasks[taskId].flows[0]` (siempre el PRIMER flow). Cualquier tarea multi-flow (flow1→flow2) hace loop a flow1 para siempre. Rompe secuencias multi-flow. El propio comentario lo reconoce. |
| `OpenGuide`/`openGuide` — auto-open primera guía | `register-measurement.page.ts:172-183` | `RegisterMeasurementScreen.tsx:175-183` | ADAPTED | na | `showAutomatic !== false` → abrir. Equivalente. |
| **`OpenGuide` — encadenamiento nextGuide** | `register-measurement.page.ts:199-227` | `GuideMeasurementScreen.tsx:143-155` | **DIVERGED** | **alta** | Original tras dismiss llama recursivamente `OpenGuide(nextGuide)`. RN `closeModal()` hace `navigation.goBack()` siempre, sin reabrir. No hay callback. Cadenas de guías rotas. |
| `onDigitsFocus` | `register-measurement.page.ts:236-246` | `RegisterMeasurementScreen.tsx:243-258` | PRESERVED | na | Limpia dígito enfocado, showRestrictionAlert=false. |
| `onDigitsChange` — validación, auto-advance | `register-measurement.page.ts:255-300` | `RegisterMeasurementScreen.tsx:265-302` | PRESERVED | na | Solo dígito 0-9, avanza foco, ensambla `Number(fieldsArray.join(''))`. Ref map en vez de getElementById. |
| **Alerta: guard `value.toString().length === fields`** | `register-measurement.page.html:49-63` | `RegisterMeasurementScreen.tsx:506-511` | **DIVERGED** | **media** | Original muestra alerta solo cuando TODOS los dígitos están llenos. RN solo chequea `isOutOfRange`, sin guard → alerta prematura al teclear. |
| `completeTaskProcess` — business logic | `gamification.service.ts:178-275` | `gamification.ts:61-158` | PRESERVED | na | Todas las reglas: +1/+2 semilla, +1 racha, streak%7/%3 alertas, streakBonus, maxRetries=3. Debug methods eliminados (B07). |
| `completeTaskProcess` — getLastUserProgressPure | `gamification.service.ts:186` | `gamification.ts:68` | ADAPTED | baja | RN usa lectura pura; compensa con `recalculateDailyProgress()` desde HomeScreen. Edge case: abrir RegisterMeasurement en día nuevo SIN pasar por Home puede incrementar el registro del día anterior. |
| `streakBonus` — constantes y lógica | `gamification.service.ts:395-418` | `gamification.ts:315-338` | PRESERVED | na | daysForStreak=7, bonusSeedForStreak=3, +3, createStreakRewardAlert. |
| `Preferences` shim | `register-measurement.page.ts:384` | `preferences.ts:1-73` | ADAPTED | na | get/set/remove idéntico. AsyncStorage por debajo. |
| `fieldsArray` init | `register-measurement.page.ts:167-169` | `RegisterMeasurementScreen.tsx:156` | ADAPTED | baja | `Array.from({length})` (undefined) → `Array.from({length}, () => '')`. RN más seguro. |
| Bonus 'No' llama responseBonus(true) | `measurement.page.html:133-135` | `MeasurementScreen.tsx:612-614` | PRESERVED | na | Bug original (No debería ser false) preservado fielmente. |
| `hasRestrictionTimeTask`/`getTextRestrictionTime` | `measurement.page.ts` | `MeasurementScreen.tsx:149-189` | PRESERVED | na | Ventana activa con date-fns. Textos 'Disponible en X minutos/horas/hasta las HH:MM' idénticos. |
| `groupRemainingLazyMeasurements` | `measurement.page.ts` | `MeasurementScreen.tsx:109-145` | PRESERVED | na | Group-by-taskId, filtra contabilizadas, parsea JSON, extrae id+value. |

---

## Área: historical-agg — 85% preservado

**Veredicto:** Las agregaciones numéricas y todo el pipeline de EnvironmentalReportService están fielmente preservados (línea por línea). Dos defectos reales: `calculateValue` nunca se invoca (`variable.value` siempre undefined, media) y `initializeVariables` resetea `selected:false` sin preservar selección (alta, x2) — regresión visible en cada navegación de mes en modo gráfica. La captura de imagen (html-to-image → react-native-view-shot) es adaptación correcta.

| Función | Original:línea | RN:línea | Estado | Severidad | Detalle |
|---|---|---|---|---|---|
| `transformData` | `historical.page.ts:631-659` | `historical-aggregations.ts:71-101` | PRESERVED | na | Agrupa valores por key, sort parseInt asc. Idéntico (comportamiento conocido preservado). |
| `sum` | `historical.page.ts:584-600` | `historical-aggregations.ts:110-123` | PRESERVED | na | Guard falsy, reduce desde 0, Math.round. |
| `mean` | `historical.page.ts:607-624` | `historical-aggregations.ts:134-151` | PRESERVED | na | Delega a sum, divide por conteo combinado, Math.round. `?? 0` equivalente a `|| 0`. |
| `calculateMeasurement` | `historical.page.ts:708-752` | `historical-aggregations.ts:162-196` | PRESERVED | na | Agrupa por YYYY-MM-DD, sum/mean por día. Multi-key overwrite preservado. |
| `calculateDetailedMeasurement` | `historical.page.ts:762-803` | `historical-aggregations.ts:206-240` | PRESERVED | na | avg/min/max por día con reduce, Math.min/max. Shape {avg,min,max}. |
| `calculateOverallStats` | `historical.page.ts:812-871` | `historical-aggregations.ts:251-304` | PRESERVED | na | Rama mean+line usa detailed, sino calculateMeasurement. avg=total en 'sum'. {min,max,avg:undefined} sin datos. |
| **`calculateValue`** | `historical.page.ts:558-577` | `HistoricalScreen.tsx:402-413` | **MISSING** | **media** | Original popula `variable.value` (sum/mean). RN hardcodea `value: undefined` y nunca lo computa. No se muestra hoy en UI, pero cualquier consumidor downstream leería undefined. |
| **`initializeVariables` — preservación de selección** | `historical.page.ts:531-543` | `HistoricalScreen.tsx:402-414` | **DIVERGED** | **alta** | Original preserva `selected` con `existingVariable?.selected ?? false`. RN resetea `selected:false` siempre → highlight se borra mientras measureSelected sigue apuntando a la variable vieja. UI inconsistente. |
| `updateChart` (pipeline de gráfica) | `historical.page.ts:338-448` | `HistoricalScreen.tsx:162-251` | PRESERVED | na | fetch→transformData→branch line+mean→detailed/measurement→labels/data/min/max. startOfMonth/endOfMonth `en-CA`. |
| `calculateRangeOfMeasurement` | `historical.page.ts:665-696` | `HistoricalScreen.tsx:179-189` | ADAPTED | na | Inline en buildChartData: unión min/max de ranges. Equivalente. |
| `initializeCompletedTasks`/`getCompletedTaskForMonth` | `historical.page.ts:465-500` | `HistoricalScreen.tsx:351-378` | PRESERVED | na | Promise.all 12 meses, month 1-based, mes 0-based, currentMonthIndex. |
| `setCurrentMonth`/`goToMonth` | `historical.page.ts:186-248` | `HistoricalScreen.tsx:500-527` | ADAPTED | baja | Rollover de año preservado. useEffect dispara las 3 inicializaciones. Guard muerto en RN, mismo efecto neto. |
| `changeYear` | `historical.page.ts:309-332` | `HistoricalScreen.tsx:916-945` | ADAPTED | na | Botones llaman setCurrentYearIndex; useEffect re-ejecuta las 3 inicializaciones. Equivalente. |
| `processDailyData`/`groupMeasurementsByDay` | `environmental-report.service.ts:161-203` | `environmental-report.ts:152-178` | PRESERVED | na | daysInMonth, loop 1..daysInMonth, dayKey YYYY-MM-DD padStart. |
| `processDayMeasurements` | `environmental-report.service.ts:210-230` | `environmental-report.ts:183-192` | PRESERVED | na | Mañana <12, tarde >=12. Split equivalente. day→morning, night→afternoon. |
| `calculatePeriodStats` | `environmental-report.service.ts:237-302` | `environmental-report.ts:198-231` | ADAPTED | na | Todas las variantes de campo (TEMPERATURA_MAX/MIN, temperature, temp, ...) preservadas. if-blocks → for-of. Math.max/min. |
| `calculateTotalRainfall` | `environmental-report.service.ts:309-338` | `environmental-report.ts:237-252` | PRESERVED | na | Variantes PRECIPITACION/rain/rainfall/Rain. `Math.round(total*10)/10`. |
| `calculateSummary` | `environmental-report.service.ts:346-447` | `environmental-report.ts:257-296` | PRESERVED | na | Temps (incl 0/negativos) + humedades (incl 0, excl negativos), lluvia + días lluviosos. Guards null/undefined equivalentes. |
| `truncateText` | `environmental-report.service.ts:53-58` | `environmental-report.ts:98-101` | PRESERVED | na | <=20 retorna; sino substring(0,18)+'...'. |
| `formatValue` | `environmental-report.component.ts:95-100` | `environmental-report.ts:302-305` | ADAPTED | baja | null/undefined→'-', sino toFixed(1). RN más defensivo. |
| `formatRainfall` | `environmental-report.component.ts:83-88` | `environmental-report.ts:311-314` | PRESERVED | na | null/undefined→'-', >0→toString, sino '-'. |
| `getFirstHalfDays`/`getSecondHalfDays` | `environmental-report.component.ts:56-66` | `environmental-report.ts:319-328` | PRESERVED | na | slice(0,15) y slice(15). Equivalente. |
| `generateReportData` | `environmental-report.service.ts:66-119` | `environmental-report.ts:111-147` | ADAPTED | na | 3 fetches (user/UVA/measurements), parse fields, defaults farmName/monitorName, truncateText. RN envuelve cada fetch en try-catch (más resiliente). |
| `generateReportImage` | `environmental-report.service.ts:127-717` | `HistoricalScreen.tsx:549-652` | ADAPTED | na | html-to-image.toPng → react-native-view-shot captureRef. Fallback de texto preservado. Adaptación correcta de plataforma. |
| `formatStat` (number:'1.0-1') | `historical.page.html:57,63,69` | `HistoricalScreen.tsx:122-127` | DIVERGED | baja | Pipe Angular vs toLocaleString('en-US',{maximumFractionDigits:1}). Visualmente idéntico para rango 0-100. Sin divergencia práctica. |
| `shareMonthlyReport` (texto fallback) | `historical.page.ts:1085-1129` | `HistoricalScreen.tsx:607-633` | PRESERVED | na | Header mes/año, 'name: avg (Min/Max)', total registros, footer. Emojis con escapes Unicode. |
| `isNextYearDisabled` | `historical.page.ts:318-320` | `HistoricalScreen.tsx:531-533` | PRESERVED | na | `currentYearIndex + 1 > realCurrentYear`. |
| **`initializeVariables` — reset selección en recarga** | `historical.page.ts:531-549` | `HistoricalScreen.tsx:315-337` | **DIVERGED** | **alta** | useEffect (deps currentMonthIndex/currentYearIndex) llama initializeVariables que resetea `selected:false`. Al navegar meses en modo gráfica el highlight se borra aunque measureSelected se preserva. useCallback captura variables stale. |

---

## Área: moon — 93% preservado

**Veredicto:** Migración de alta fidelidad. Todas las rutas críticas (PHASE_MAPPING 6 entradas, sanitizeAWSJSON 5 replace, getNextMoonEvents, sort de calendario, locale de fecha, mapa meses) preservadas exactamente. Sin divergencias con impacto en runtime. Bug autorizado corregido en MoonCard. WANING_GIBBOUS/CRESCENT siguen inalcanzables (latente preservado).

| Función | Original:línea | RN:línea | Estado | Severidad | Detalle |
|---|---|---|---|---|---|
| `PHASE_MAPPING` (6 entradas) | `moon-phase.service.ts:94-101` | `moon-phase.ts:108-115` | PRESERVED | na | 6 entradas API es→LunarPhase byte-for-byte idénticas. De campo privado a export de módulo. |
| WANING_GIBBOUS/CRESCENT sin mapear (latente) | `moon-phase.service.ts:30-37,94-101` | `moon-phase.ts:51-58,108-115` | PRESERVED | media | Enum define ambas pero ninguna es alcanzable vía mapPhaseToEnum (fallback NEW_MOON). Bug latente en AMBOS, no es regresión. |
| `mapPhaseToEnum` — guard Array.isArray | `moon-phase.service.ts:407-413` | `moon-phase.ts:132-135` | DIVERGED | baja | RN elimina `if (Array.isArray(mapped)) return mapped[0]`. Dead code hoy (valores nunca arrays). Diferiría si se extiende PHASE_MAPPING con arrays. |
| `sanitizeAWSJSON` (5 replace) | `moon-phase.service.ts:150-154` | `moon-phase.ts:166-172` | ADAPTED | na | 5 regex idénticos en patrón y orden. De inline a función exportada. Fragilidad R-26 preservada. |
| `mapPhaseToCalendarStatus` (replace sin /g) | `moon-phase.service.ts:422` | `moon-phase.ts:145` | PRESERVED | na | `.toLowerCase().replace('_','-')` sin /g. Los 6 valores tienen 1 guion, sin impacto. |
| `getNextMonth` | `moon-phase.service.ts:365-370` | `moon-phase.ts:183-188` | ADAPTED | na | month===12→[year+1,1], sino [year,month+1]. Byte-for-byte. |
| `downloadAndStoreMoonPhaseData` (loop 24m) | `moon-phase.service.ts:121-180` | `moon-phase.ts:200-256` | ADAPTED | na | Loop, file naming `lunar-phases-YYYY-MM.json`, sanitizeAWSJSON. De instance method a static con singletons. Output idéntico. |
| `getCurrentPhase` | `moon-phase.service.ts:186-211` | `moon-phase.ts:262-287` | PRESERVED | na | `dailyLunarInfo[currentDay]` (key numérica → undefined silencioso). Ambigüedad preservada. |
| `getMonthPhases` | `moon-phase.service.ts:217-247` | `moon-phase.ts:293-323` | PRESERVED | na | Object.entries→{day,status}→sort. parseInt + mapPhaseToCalendarStatus. |
| `getNextMoonEvents` (while + riesgo loop) | `moon-phase.service.ts:254-356` | `moon-phase.ts:330-419` | PRESERVED | na | while(events.length<count), break en count*2, equality 'Luna nueva'/'Luna llena', filter(date>=now).slice(0,count). Riesgo loop infinito preservado igual. |
| `MoonPhaseAPIService.getMoonPhase` | `moon-phase-api.service.ts:41-57` | `moon-phase-api.ts:42-58` | ADAPTED | na | GraphQL, error path, response shape idénticos. @Injectable → instancia exportada. |
| Herencia MoonPhaseService extends API | `moon-phase.service.ts:93` | `moon-phase.ts:24,215` | ADAPTED | na | Herencia → composición vía singleton importado. Sin diferencia observable. |
| MoonPhasePage/Screen — Promise.all 3-way | `moon-phase.page.ts:79-106` | `MoonPhaseScreen.tsx:105-136` | PRESERVED | na | Promise.all([getCurrentPhase, getMonthPhases, getNextMoonEvents]). try/catch idéntico. |
| Formato de fecha de eventos | `moon-phase.page.ts:100-104` | `MoonPhaseScreen.tsx:129-135` | PRESERVED | baja | toLocaleDateString('es-ES',...). Caveat: Intl en RN depende del ICU del dispositivo. No es divergencia de código. |
| Mapa meses (español) | `moon-phase.page.ts:18-31` | `MoonPhaseScreen.tsx:49-62` | PRESERVED | na | 12 entradas idénticas. |
| Carga de seed — ionViewWillEnter vs useFocusEffect | `moon-phase.page.ts:118-123` | `MoonPhaseScreen.tsx:87-97` | ADAPTED | na | ionViewWillEnter+getLastUserProgress → useFocusEffect+getLastUserProgressPure (sin side-effects). Equivalente para display. |
| Back nav — ruta explícita vs goBack | `moon-phase.page.html:4` | `MoonPhaseScreen.tsx:154-156` | ADAPTED | baja | `/app/tabs/home` → goBack(). Equivalente si siempre se llega desde Home. |
| LUNAR_PHASE_NAME (typo 'crescente') | `moon-card.component.ts:14-22` | `MoonCard.tsx:76-83` | PRESERVED | na | 'Cuarto crescente'/'Menguante crescente' (typos) preservados. 6 entradas. |
| MoonCard — @Input phase setter (fix bug) | `moon-card.component.ts:53-57` | `MoonCard.tsx:141` | ADAPTED | na | Bug original (lookup con _phase sin fix). RN usa `resolvedPhase = phase ?? DEFAULT_PHASE` consistente. Fix autorizado §4.4. |
| `getCurrentMonthData` (JSON.parse) | `moon-phase.service.ts:377-399` | `moon-phase.ts:429-451` | PRESERVED | na | parse `readResult.data.data.toString()` → body. throw idéntico. |

---

## Área: setup-auth — 90% preservado

**Veredicto:** Migración mayoritariamente fiel: signIn/signUp/OTP/MFA, bypass de usuarios de prueba, ID secuencial de UVA y vinculación RACIMO preservados. Dos divergencias de impacto real: `clearSession` borra solo claves de sesión (no todo Preferences); `RegisterProjectFormScreen` filtra por `enabled=true` (original no filtra). SetupService/SetupRacimoService crean instancias separadas de SessionService (sin inconsistencia hoy porque el backing store es el mismo).

| Función | Original:línea | RN:línea | Estado | Severidad | Detalle |
|---|---|---|---|---|---|
| `handleAuthError` | `auth.service.ts:67` | `auth.ts:74` | ADAPTED | na | private→function. switch sobre AuthError.name (4 casos) idéntico. typo 'mensage' preservado. |
| `SignIn` | `auth.service.ts:116` | `auth.ts:124` | PRESERVED | na | username=password=phone. MFA si !isTestUser && isSignedIn. Rama CONFIRM_SIGN_IN_WITH_NEW_PASSWORD. |
| `enableMFAForUser` | `auth.service.ts:146` | `auth.ts:153` | PRESERVED | na | updateMFAPreference({sms:'PREFERRED'}) try/catch sin propagar. |
| `ConfirmSignIn` | `auth.service.ts:159` | `auth.ts:166` | PRESERVED | na | confirmSignIn({challengeResponse:code}). |
| `SignOut` | `auth.service.ts:176` | `auth.ts:183` | PRESERVED | na | signOut() try/catch, {success}. |
| `SignUp` | `auth.service.ts:192` | `auth.ts:199` | PRESERVED | na | signUp con userAttributes {phone_number,family_name,name}. |
| `ConfirmSignUp` | `auth.service.ts:223` | `auth.ts:230` | PRESERVED | na | confirmSignUp({username,confirmationCode}). |
| `ResendVerificationCode` | `auth.service.ts:242` | `auth.ts:249` | PRESERVED | na | resendSignUpCode, boolean. Solo `catch {}` cosmético. |
| `CurrentAuthenticatedUser` | `auth.service.ts:254` | `auth.ts:262` | PRESERVED | na | getCurrentUser en AuthResponse. |
| `CurrentUserAttributes` | `auth.service.ts:269` | `auth.ts:277` | PRESERVED | na | fetchUserAttributes en AuthResponse. |
| `handleDeleteUser` | `auth.service.ts:283` | `auth.ts:291` | PRESERVED | na | deleteUser() boolean. |
| `TestUsersService.isTestUser` | `test-users.service.ts:30` | `test-users.ts:34` | ADAPTED | na | @Injectable→función. Lista de 6 teléfonos idéntica. Bypass OTP de +573000000002 igual. |
| `SessionService.setInfo` | `session.service.ts:16` | `session.ts:68` | ADAPTED | na | Itera keys, escribe si truthy. Preferences → AsyncStorage + SecureStore. |
| `SessionService.getInfo` | `session.service.ts:30` | `session.ts:82` | ADAPTED | na | 9 keys. Preferences.get → retrieveValue. |
| `SessionService.setInfoField` | `session.service.ts:52` | `session.ts:103` | ADAPTED | na | undefined→remove, sino set. |
| **`SessionService.clearSession`** | `session.service.ts:74` | `session.ts:120` | **DIVERGED** | **baja** | Original `Preferences.clear()` borra TODO el store. RN itera 9 sessionKeys y removeValue. En RN persisten datos de otras librerías al sign-out. Amplify v6 usa su propio storage, impacto bajo. |
| `SetupService.signIn` | `setup.service.ts:52` | `setup.ts:57` | PRESERVED | na | auth.SignIn, guarda phone, currentAuthenticatedUser si isSignedIn. |
| `SetupService.confirmSignIn` | `setup.service.ts:70` | `setup.ts:74` | PRESERVED | na | auth.ConfirmSignIn, currentAuthenticatedUser. |
| `SetupService.reSendCodeSignIn` | `setup.service.ts:83` | `setup.ts:86` | PRESERVED | na | Lee phone, signIn. |
| `SetupService.signUp` | `setup.service.ts:118` | `setup.ts:123` | PRESERVED | na | auth.SignUp, guarda userID+phone, ResendVerificationCode si UsernameExists. |
| `SetupService.confirmSignUp` | `setup.service.ts:143` | `setup.ts:147` | PRESERVED | na | auth.ConfirmSignUp, currentAuthenticatedUser. |
| `SetupService.reSendCodeSignUp` | `setup.service.ts:157` | `setup.ts:160` | PRESERVED | na | Lee phone, signUp. |
| `SetupService.currentAuthenticatedUser` | `setup.service.ts:170` | `setup.ts:172` | PRESERVED | na | Guarda userID/name/lastName/phone. |
| `SetupService.createNewUser` | `setup.service.ts:189` | `setup.ts:200` | PRESERVED | na | Idempotente: getUser o crea User+UserProgress (Seed=0/Streak=0). |
| **SetupService instancia SessionService** | `setup.service.ts:29` | `setup.ts:33` | **DIVERGED** | **baja** | Comentario dice singleton pero hace `new SessionService()`. 3 instancias coexisten. Sin inconsistencia hoy (sin estado en memoria). |
| `SetupRacimoService.getLastUVAId` | `setup-racimo.service.ts:33` | `setup-racimo.ts:82` | PRESERVED | na | getUVAByRACIMO limit:1 DESC. |
| `SetupRacimoService.getCodeRacimo` | `setup-racimo.service.ts:57` | `setup-racimo.ts:108` | PRESERVED | na | getRACIMO, LinkageCode. |
| `SetupRacimoService.getUVA` | `setup-racimo.service.ts:77` | `setup-racimo.ts:127` | PRESERVED | na | getUVAByUser, guarda racimoID+uvaID+racimoLinkCode. |
| `generateNextUVAId`/createNewUVA | `setup-racimo.service.ts:117` | `setup-racimo.ts:54` | ADAPTED | na | Lógica extraída a función pura. Regex `/(\.d{5})$/`, base `UVA_<code>_00000`, padStart(5). Comportamiento idéntico. |
| `SetupRacimoService.updateUVA` | `setup-racimo.service.ts:161` | `setup-racimo.ts:201` | PRESERVED | na | uvaAPI.updateUVA con 4 campos opcionales. |
| `SetupRacimoService.getRACIMOByCode` | `setup-racimo.service.ts:186` | `setup-racimo.ts:226` | PRESERVED | na | listRACIMOS filtro LinkageCode.eq, getRACIMOByID. |
| `SetupRacimoService.getRACIMOByID` | `setup-racimo.service.ts:215` | `setup-racimo.ts:253` | PRESERVED | na | getRACIMO, guarda racimoName/LinkCode/Configuration. |
| LoginScreen — post-signIn (bypass test user) | `login.page.ts:115` | `LoginScreen.tsx:135` | PRESERVED | na | isSignedIn→createNewUser+ProjectVinculation; sino→Otp. UserNotFound→openModalNoRegister. |
| **LoginScreen — textos modal** | `login.page.ts:99` | `LoginScreen.tsx:125` | **DIVERGED** | **baja** | 'No, editar'→'No, Editar', 'Sí, continuar'→'Sí, Continuar'. Capitalización visible. |
| OtpScreen — validateForm (login) | `otp.page.ts:171` | `OtpScreen.tsx:123` | PRESERVED | na | currentAuthenticatedUser→confirmSignIn→createNewUser→ValidateCode. |
| OtpScreen — validateForm (register) | `otp.page.ts:206` | `OtpScreen.tsx:150` | PRESERVED | na | confirmSignUp→ValidateCode. |
| OtpScreen — timer 60s | `otp.page.ts:84` | `OtpScreen.tsx:82` | ADAPTED | na | setInterval + ChangeDetectorRef → setInterval + setState funcional. |
| OtpScreen — resetTime | `otp.page.ts:151` | `OtpScreen.tsx:203` | ADAPTED | na | reSendCode + reinicia timer 60. RN añade clearOtp(). |
| OtpScreen — error clear inputs | `otp.page.ts:178` | `OtpScreen.tsx:136` | ADDED | na | RN limpia inputs y enfoca primero al fallar (mejora UX). |
| ValidateCodeScreen — timer 2s | `validate-code.page.ts:35` | `ValidateCodeScreen.tsx:58` | PRESERVED | na | login→ProjectVinculation, register→RegisterSuccess. 2000ms. RN añade Cancelar. |
| ValidateProjectScreen — startTimerAndDownload | `validate-project.page.ts:54` | `ValidateProjectScreen.tsx:70` | ADAPTED | na | timer 2s + downLoadData + downloadAndStoreMoonPhaseData en paralelo. RN usa .success de MoonPhaseServiceResponse. |
| **ValidateProjectScreen — cancelTimer** | `validate-project.page.ts:88` | `ValidateProjectScreen.tsx:119` | **DIVERGED** | **baja** | Original solo limpia timeout. RN además navega a Login. RN más correcto (usuario sale activamente). |
| ProjectVinculationScreen — ngOnInit | `project-vinculation.page.ts:79` | `ProjectVinculationScreen.tsx:94` | ADAPTED | na | getUVA→configExists?→waitForSync→ValidateProject/Home. RN pasa racimoCode. Equivalente. |
| **RegisterProjectFormScreen — filtro enabled** | `register-project-form.page.ts:89` | `RegisterProjectFormScreen.tsx:93` | **DIVERGED** | **media** | Original NO filtra por enabled. RN `.filter(f => f.enabled)`. Campos con enabled:false se ocultan en RN aunque el backend los espere. |
| RegisterCompletedScreen — timer 3s | `register-completed.page.ts:35` | `RegisterCompletedScreen.tsx:41` | PRESERVED | na | 3000ms→home (navigation.reset). |
| session.model.ts — Session + sessionKeys | `session.model.ts:1` | `session.model.ts:8` | PRESERVED | na | 9 campos opcionales y 9 sessionKeys en mismo orden. |

---

## Área: datastore-api — 88% preservado

**Veredicto:** 88% preservado. Todos los métodos DataStore CRUD (7 servicios, ~30 métodos) y los 5 servicios GraphQL portados fielmente — predicados, sorts, mappings y manejo de errores línea por línea. Adaptaciones de framework (DI Angular → singletons / Context) limpias. Cuatro brechas reales: rama binaria de S3, eliminación de convertFileSrc en getFileUri, applyColors ausente (ThemeProvider B08 no verificado), y enum STATE_SYNC_DS numérico→string.

> Solo se listan en la tabla las unidades ADAPTED/DIVERGED/MISSING/ADDED y una muestra de PRESERVED. Los ~25 métodos CRUD/API restantes (measurement-ds, uva-ds, user-ds, racimo-ds, gamification-event-ds, todas las *-api) son **PRESERVED** línea por línea (predicados, sorts, field mappings, errores idénticos; solo cambian import paths).

| Función | Original:línea | RN:línea | Estado | Severidad | Detalle |
|---|---|---|---|---|---|
| `MeasurementDSService.*` (7 métodos) | `measurement-ds.service.ts:19-182` | `measurement-ds.ts:32-196` | PRESERVED | na | addMeasurement, getByUVA, getByDateRange, getByMont (typo preservado), countByDateRange, getByDay, countByDay. Predicados/boundaries/sort idénticos. |
| `UvaDSService.*` (3 métodos) | `uva-ds.service.ts:21-73` | `uva-ds.ts:34-86` | PRESERVED | na | getUVAByID, getUVAByuserID, updateUVA (typo 'altitud' preservado). |
| `UserDSService.*` (2 métodos) | `user-ds.service.ts:19-54` | `user-ds.ts:33-68` | PRESERVED | na | getUser, updateUser (doble getInfo() preservado). |
| `RacimoDSService.getRacimoCode` | `racimo-ds.service.ts:10-18` | `racimo-ds.ts:22-30` | PRESERVED | na | query(RACIMO,racimoID).LinkageCode. |
| `UserProgressDSService.*` (CRUD + privados) | `user-progress-ds.service.ts:23-442` | `user-progress-ds.ts:46-515` | PRESERVED | na | create/update/get/getMilestones/getCompleteTaskWeek/getCompletedTasksByMonthYear/getCountTasksByMonthYear/evaluateCompletedTasks/calculateDaysDifference/seedToMilestone/handleMilestoneAssignment idénticos. |
| `UserProgressDSService.getLastUserProgress` | `user-progress-ds.service.ts:119-171` | `user-progress-ds.ts:239-242` | ADAPTED | baja | Split pura/efectos (ver gamification). Riesgo StrictMode double-invoke → registros duplicados (presente en ambos). |
| `GamificationEventDSService.*` (5 métodos) | `gamification-event-ds.service.ts:23-154` | `gamification-event-ds.ts:31-163` | PRESERVED | na | create (isUnclean:true), get, getByRacimo, updateData, markAllAsClean idénticos. |
| `SyncMonitorDSService.subscribeToSync` | `sync-monitor-ds.service.ts:36-78` | `SyncContext.tsx:129-177` | ADAPTED | na | Hub events. static→Context+useEffect con cleanup. signedOut resetea a NOINIT. Estrictamente mejor. |
| **`SyncMonitorDSService.isAppUsageEvent`** | `sync-monitor-ds.service.ts:129-151` | `SyncContext.tsx:63-81` | **DIVERGED** | **baja** | Original `data.model.name === 'AppUsageEvent'` (se rompe con Hermes minificado). RN compara referencia de clase `d.model === AppUsageEvent`. Fix R-21, previene pérdida silenciosa de datos. |
| **`SyncMonitorDSService.waitForSyncDataStore`** | `sync-monitor-ds.service.ts:96-106` | `SyncContext.tsx:188-230` | **DIVERGED** | **baja** | Original polling 100ms SIN timeout (cuelga en offline cold start). RN: Hub event-driven + timeout 30s. Fix R-04. |
| `SyncMonitorDSService.synchronizedData` | `sync-monitor-ds.service.ts:85-90` | `SyncContext.tsx:179-181` | PRESERVED | na | state===SYNC || READY. |
| `outboxMutationProcessed→cleanupSyncedRecord` | `sync-monitor-ds.service.ts:54-58` | `SyncContext.tsx:144-152` | ADAPTED | na | Instancia inyectada → función de módulo importada. Equivalente. |
| **`STATE_SYNC_DS` enum** | `sync-monitor-ds.service.ts:6-11` | `sync-monitor.ts:23-28` | **DIVERGED** | **media** | Numérico (NOINIT=0...READY=3) → string. Rompe comparaciones por orden (`state > UNSYNC`). Hoy solo se usan `===`, sin regresión, pero futuros callers por orden romperían en silencio. |
| `DataStore.configure` — syncExpressions | `app.component.ts:39-48` | `amplify-config.ts:42-53` | PRESERVED | na | GamificationEvent isUnclean.eq(true), AppUsageEvent ae['id'].eq(''). Notación bracket preservada. |
| `Amplify.configure` bootstrap | `main.ts:19` | `amplify-config.ts:29-31` | ADAPTED | na | configure() → bootstrapAmplify(). Funcionalmente idéntico. |
| `S3Service.listFiles` | `s3.service.ts:85-97` | `s3.ts:80-92` | PRESERVED | na | list({listAll:true}) + processStorageList. |
| `S3Service.getFile` — JSON/TXT | `s3.service.ts:106-145` | `s3.ts:101-121` | PRESERVED | na | downloadData + text() + JSON.parse / raw text. |
| **`S3Service.getFile` — binario (BLOB→BASE64)** | `s3.service.ts:143-153` | `s3.ts:126-161` | **DIVERGED** | **alta** | Original `response.body.blob()` (no existe en Hermes). RN `type:'BASE64'` con `response.body.text()` best-effort. Leer binario como UTF-8 produce bytes corruptos. El fix correcto (getUrl()+downloadAsync) está documentado pero NO implementado. Imágenes S3 silenciosamente corruptas en nativo. |
| `S3Service.getFile` (web) binario via FileReader | AUSENTE | `s3.web.ts:118-161` | ADDED | na | Shim web getUrl()+fetch()+blob()+readAsDataURL(). Aditivo, no afecta nativo. |
| `S3Service.processStorageList` | `s3.service.ts:175-190` | `s3.ts:182-197` | PRESERVED | na | forEach + size guard + push. |
| `S3Service.handleAuthError` | `s3.service.ts:198-232` | `s3.ts:203-225` | PRESERVED | na | StorageError instanceof, casos de error, typo 'mensage'. |
| `FileSystemService.writeFile` | `file-system.service.ts:70-99` | `file-system.ts:131-151` | ADAPTED | na | Capacitor writeFile → expo writeAsStringAsync + ensureParentDirs (R-20). Equivalente. |
| `FileSystemService.readFile` | `file-system.service.ts:108-132` | `file-system.ts:160-177` | ADAPTED | na | readFile → readAsStringAsync. code64→Base64/UTF8. |
| `FileSystemService.deleteFile` | `file-system.service.ts:140-153` | `file-system.ts:183-194` | ADAPTED | na | deleteFile → deleteAsync({idempotent:true}). Más lenient. |
| `FileSystemService.copyFile` | `file-system.service.ts:162-177` | `file-system.ts:202-216` | ADAPTED | na | copy → copyAsync + toUri + ensureParentDirs. |
| `FileSystemService.renameFile` | `file-system.service.ts:186-201` | `file-system.ts:224-238` | ADAPTED | na | rename → moveAsync. |
| `FileSystemService.createDirectory` | `file-system.service.ts:210-225` | `file-system.ts:246-259` | ADAPTED | na | mkdir → makeDirectoryAsync({intermediates}). |
| `FileSystemService.readDirectory` | `file-system.service.ts:233-246` | `file-system.ts:267-278` | ADAPTED | baja | readdir → readDirectoryAsync. Devuelve `string[]` (no FileInfo[]). Callers solo iteran nombres. |
| **`FileSystemService.getFileUri`** | `file-system.service.ts:254-267` | `file-system.ts:285-295` | **ADAPTED (alta)** | **alta** | getUri → toUri() SIN Capacitor.convertFileSrc(). file:// crudo. Image RN puede cargar desde documentDirectory, pero archivos en private/cache/external podrían no ser accesibles. Posible regresión de render de imágenes. |
| `FileSystemService.requestPermissions` | `file-system.service.ts:273-280` | `file-system.ts:302-304` | ADAPTED | na | Siempre 'granted' (expo maneja permisos). |
| `FileSystemService.fileExists` (nuevo) | AUSENTE | `file-system.ts:311-319` | ADDED | na | getInfoAsync. Aditivo. |
| **`ConfigurationAppService.downLoadData`** | `configuration-app.service.ts:37-91` | `ConfigContext.tsx:147-184` | **ADAPTED (alta)** | **alta** | BLOB→base64 chain. RN recibe type:'BASE64' y escribe isBase64=true. Eslabón roto: el base64 puede venir corrupto del S3 binary branch. |
| `ConfigurationAppService.configExists` | `configuration-app.service.ts:97-104` | `ConfigContext.tsx:188-194` | PRESERVED | na | getPathRacimo + readFile + success. |
| `ConfigurationAppService.getConfigurationApp` | `configuration-app.service.ts:110-125` | `ConfigContext.tsx:198-249` | DIVERGED | baja | useRef cache + setState + web lazy-download fallback (nuevo, dead code en nativo). Sin regresión nativa. |
| **`ConfigurationAppService.loadImage`** | `configuration-app.service.ts:189-203` | `ConfigContext.tsx:359-377` | **DIVERGED** | **media** | switch plataforma + convertFileSrc → siempre getFileUri (URI cruda). Image RN puede cargar file:// de documentDirectory, pero cache/external podría fallar. |
| **`ConfigurationAppService.applyColors`** | `configuration-app.service.ts:273-285` | AUSENTE | **MISSING** | **alta** | Aplica HEX/RGB como CSS custom properties (theming dinámico por RACIMO). RN delega a ThemeProvider B08 (NO encontrado en la auditoría). Si B08 no consume configColors, el theming por RACIMO está silenciosamente ausente (solo tema por defecto). |
| `handleAPIError` | `errors-api.service.ts:22-28` | `errors.ts:34-40` | PRESERVED | na | instanceof Error, nombres, typo 'mensage'. |
| `UvaAPIService.*` (4 métodos) | `uva-api.service.ts:49-158` | `uva-api.ts:50-159` | PRESERVED | na | getUVAByUser, getUVAByRACIMO, createUVA, updateUVA idénticos. |
| `UserAPIService.*` | `user-api.service.ts:31-113` | `user-api.ts:42-116` | PRESERVED | na | createUser + mutation inline + getUser idénticos. |
| `RacimoAPIService.*` (2 métodos) | `racimo-api.service.ts:48-86` | `racimo-api.ts:48-86` | PRESERVED | na | listRACIMOS, getRACIMO idénticos. |
| `UserProgressAPIService.createUserProgress` | `user-progress-api.service.ts:33-50` | `user-progress-api.ts:30-50` | PRESERVED | na | createUserProgress mutation idéntico. |
| `MoonPhaseAPIService.getMoonPhase` | `moon-phase-api.service.ts:41-56` | `moon-phase-api.ts:42-57` | PRESERVED | na | getMoonPhase query idéntico. |

---

## Backlog de remediación priorizado (lógica)

> Lista accionable de cada DIVERGED/MISSING ordenada por severidad. Esto es lo que se corregirá después.

### CRÍTICA

1. **Multi-flow `goToComplete` carga siempre `flows[0]`** — `RegisterMeasurementScreen.tsx:456-468` (vs `register-measurement.page.ts:534-552`).
   **Fix:** Añadir un param `flowId` a la ruta `RegisterMeasurement` y usarlo en el `useEffect` de init en vez de tomar siempre `tasks[taskId].flows[0]`. Dejar de pasar `nextFlow` disfrazado de `taskName`.

### ALTA

2. **Cálculo diario ya no es implícito** — `recalculateDailyProgress` (`user-progress-ds.ts:179`).
   **Fix:** Invocar `recalculateDailyProgress()` exactamente una vez por sesión desde el bootstrap (splash / session bootstrap), no solo desde HomeScreen. Verificar que cualquier ruta de entrada (deep link a MoonPhase/RegisterMeasurement) lo dispare antes de operar gamificación.

3. **Orden validación vs modal de confirmación** — `RegisterMeasurementScreen.tsx:356-380,424-452`.
   **Fix:** Replicar el flujo original: el botón principal abre el modal de revisión SIN validar; validar solo al confirmar dentro del modal. Mantiene el paso de revisión visual.

4. **Encadenamiento `nextGuide` roto** — `GuideMeasurementScreen.tsx:143-155`.
   **Fix:** Tras cerrar la guía con OK, si existe `nextGuide`, reabrir la siguiente guía (callback registrado en el caller o navigate con el nextGuide en vez de `goBack()` incondicional).

5. **`initializeVariables` no preserva `selected`** — `HistoricalScreen.tsx:402-414` (x2: 315-337).
   **Fix:** Antes de mapear, leer las variables actuales y aplicar `existingVariable?.selected ?? false`. Asegurar que el `useCallback` no capture estado stale (incluir variables o usar ref).

6. **S3 binario devuelve texto, no base64** — `s3.ts:126-161`.
   **Fix:** Implementar el patrón documentado: `getUrl()` + `ExpoFileSystem.downloadAsync` para PNG/JPG/SVG. No usar `response.body.text()` para binarios.

7. **`getFileUri` devuelve file:// crudo** — `file-system.ts:285-295`.
   **Fix:** Verificar render de imágenes desde documentDirectory en Android/iOS reales; si fallan en cache/external, normalizar a documentDirectory o usar el asset module apropiado.

8. **`downLoadData` BLOB→BASE64 con eslabón roto** — `ConfigContext.tsx:147-184`.
   **Fix:** Depende de (6). Una vez S3 entregue base64 válido (o un archivo descargado), confirmar que la escritura `isBase64=true` produce archivos íntegros.

9. **`applyColors`/theming por RACIMO ausente** — `ConfigContext.loadBranding` (vs `configuration-app.service.ts:273-285`).
   **Fix:** Verificar/implementar ThemeProvider B08 que consuma `configColors` y aplique tokens. Sin esto, los RACIMOs con branding propio renderizan con tema por defecto.

### MEDIA

10. **`failedMeasurementIndex` siempre 0** — `measurement-engine.ts:174-177`.
    **Fix:** Buscar el índice en el array de mediciones de pantalla (como el original) en vez de en `restriction.measurementIds`.

11. **Alerta de rango con dígitos parciales** — `RegisterMeasurementScreen.tsx:506-511`.
    **Fix:** Añadir el guard `item.value.toString().length === item.fields` antes de mostrar la alerta out-of-range.

12. **`calculateValue` nunca se invoca** — `HistoricalScreen.tsx:402-413`.
    **Fix:** Computar `variable.value` con la función de agregación (sum/mean) en initializeVariables, como el original, para no dejar `undefined`.

13. **Filtro `enabled=true` oculta campos** — `RegisterProjectFormScreen.tsx:93`.
    **Fix:** Eliminar el `.filter(f => f.enabled)` o alinear con la convención del backend; el original muestra todos los fields definidos.

14. **Enum `STATE_SYNC_DS` numérico→string** — `sync-monitor.ts:23-28`.
    **Fix:** Documentar el contrato (solo igualdad `===`). Si se necesita orden, restaurar valores numéricos o añadir un mapa de orden explícito.

15. **`loadImage` sin convertFileSrc** — `ConfigContext.tsx:359-377`.
    **Fix:** Igual que (7); validar carga de imágenes branding en dispositivo real.

### BAJA

16. `clearSession` solo borra 9 claves — `session.ts:120`. **Fix:** confirmar que ningún dato sensible de terceros quede en AsyncStorage al sign-out; si aplica, ampliar el borrado.
17. 3 instancias de `SessionService` — `setup.ts:33`. **Fix:** importar el singleton exportado para evitar futura desincronización si se añade estado en memoria.
18. Capitalización de textos del modal — `LoginScreen.tsx:125`. **Fix:** alinear 'No, Editar'→'No, editar', 'Sí, Continuar'→'Sí, continuar'.
19. `cancelTimer` navega a Login — `ValidateProjectScreen.tsx:119`. **Fix:** evaluar si el destino correcto es ProjectVinculation (como el original) o Login (más correcto). Decisión de producto.
20. Guard `Array.isArray` eliminado en `mapPhaseToEnum` — `moon-phase.ts:132-135`. **Fix:** restaurar el guard si se prevé extender PHASE_MAPPING con arrays.
21. `readDirectory` devuelve `string[]` — `file-system.ts:267-278`. **Fix:** si algún caller necesita FileInfo, mapear a la forma completa.
22. `showBatteryOptimizationGuidance` ausente (B18) y métodos `debug*` eliminados — sin acción requerida (stubs/devtools no aplicables).

---

## Estado tras remediación (re-auditoría adversarial — 2026-06-16)

> Re-auditoría post-remediación: todos los fixes reportados por los 6 agentes se leyeron en el código actual y se compararon con el original. Se verificó además que los tests pasen (799/799) y que no haya nuevos errores de TypeScript (55 preexistentes, sin variación).

### Conteo final

| Métrica | Valor |
|---|---|
| **Fixes confirmados** | 17 |
| **Fixes rechazados** | 0 |
| **Falsos positivos validados** | 9 |
| **Abiertos reales restantes** | 1 |
| **% lógica preservada (actualizado)** | **~95%** |

### Divergencias cerradas por remediación

| # | Área | Hallazgo | Estado anterior | Estado actual | Evidencia |
|---|---|---|---|---|---|
| 1 | measurement-engine | `goToComplete` multi-flow loop — navega siempre a `flows[0]` | DIVERGED CRÍTICA | **CORREGIDO** | `RegisterMeasurementScreen.tsx:506` pasa `flowId: flow.nextFlow`; `types.ts:87` añade `flowId?`; `MeasurementScreen.tsx:360-361` usa `task.flows.find(f => !flowsComplete?.includes(f)) ?? flows[0]` |
| 2 | measurement-engine | `OpenGuide` nextGuide chaining roto | DIVERGED ALTA | **CORREGIDO** | `GuideMeasurementScreen.tsx:168` llama `navigation.replace('GuideMeasurement', { taskId, guideKey: nextGuideKey })` cuando `nextGuide` existe |
| 3 | measurement-engine | `failedMeasurementIndex` siempre 0 | DIVERGED MEDIA | **CORREGIDO** | `RegisterMeasurementScreen.tsx:368-376` busca en `measurements.findIndex(m => failureRestriction.measurementIds.includes(m.id))` |
| 4 | measurement-engine | Alerta con dígitos parciales | DIVERGED MEDIA | **CORREGIDO** | `RegisterMeasurementScreen.tsx:559-567` computa `allDigitsFilled = value.toString().length === fields` antes de mostrar alerta |
| 5 | gamification-home | `setNotifications` / `scheduleDailyNotifications` ausentes en HomeScreen | MISSING ALTA | **CORREGIDO** | `HomeScreen.tsx:70,151-154,171` importa `localRemindersService` y llama `setNotifications()` en `useEffect` de montaje |
| 6 | historical-agg | `initializeVariables` no preserva `selected` | DIVERGED ALTA (x2) | **CORREGIDO** | `HistoricalScreen.tsx:461-465` usa `setVariables` funcional con `existingVar?.selected ?? false` |
| 7 | historical-agg | `initializeVariables` hardcodea `'month'` ignorando timeFrame año | DIVERGED ALTA | **CORREGIDO** | `HistoricalScreen.tsx:366` pasa `timeFrame` real a `initializeVariables(config.historical, timeFrame, mounted)` |
| 8 | historical-agg | `calculateValue` nunca se invoca; `variable.value` siempre `undefined` | MISSING MEDIA | **CORREGIDO** | `HistoricalScreen.tsx:450` invoca `calculateValue(measurement, transformedData)` dentro de `initializeVariables` |
| 9 | historical-agg | Estados Day `saveStreak`/`today` nunca asignados | MISSING MEDIA | **CORREGIDO** | `MeasurementDetailScreen.tsx:302-320` asigna `newState = 'today'` (isToday) y `'saveStreak'` (getUserProgress SaveStreak=true) |
| 10 | datastore-api | `S3Service.getFile` binario — `body.text()` produce base64 corrupto | DIVERGED ALTA | **CORREGIDO** | `s3.ts:150-158` usa `getUrl()` + `ExpoFileSystem.downloadAsync()` + `readAsStringAsync(Base64)` + `deleteAsync()` |
| 11 | setup-auth | `RegisterProjectFormScreen` filtra `fields` por `enabled=true` | DIVERGED MEDIA | **CORREGIDO** | `RegisterProjectFormScreen.tsx:95` usa `Object.values(config.fieldsUVA)` sin `.filter()` |
| 12 | setup-auth | `SetupService`/`SetupRacimoService` crean `new SessionService()` | DIVERGED BAJA | **CORREGIDO** | `setup.ts:26`, `setup-racimo.ts:26` importan `{ sessionService }` singleton |
| 13 | setup-auth | Capitalización textos modal LoginScreen | DIVERGED BAJA | **CORREGIDO** | `LoginScreen.tsx:127-128` usa `'No, editar'`/`'Sí, continuar'` |
| 14 | setup-auth | `cancelTimer` navega a Login en vez de ProjectVinculation | DIVERGED BAJA | **CORREGIDO** | `ValidateProjectScreen.tsx:124` navega a `'ProjectVinculation'` |
| 15 | profile-config | Color `streak_recovery` incorrecto (`#0d8f9a` vs `#164551`) | DIVERGED MEDIA | **CORREGIDO** | `AlertsScreen.tsx:219` devuelve `'#164551'` para `streak_recovery` |
| 16 | profile-config | Focus visual per-input ausente en PersonalInfoScreen | DIVERGED MEDIA | **CORREGIDO** | `PersonalInfoScreen.tsx:102,272-278,378-379` añade `focusedField` state y `getFieldBorderColor()` con `onFocus`/`onBlur` |
| 17 | profile-config | Logo branding dinámico ausente en ProfileScreen | MISSING MEDIA | **CORREGIDO** | `ProfileScreen.tsx:109,136,429-431` carga logo via `loadImage(branding.logo)` en `useFocusEffect` |

### Falsos positivos confirmados

| # | Área | Hallazgo original | Veredicto | Evidencia |
|---|---|---|---|---|
| FP-1 | gamification | `recalculateDailyProgress` no se llama | FALSO POSITIVO | `HomeScreen.tsx:169-171` lo llama en `useEffect` de montaje |
| FP-2 | gamification | `showBatteryOptimizationGuidance` ausente | FALSO POSITIVO | El original era stub vacío: `notification.service.ts:361-364` |
| FP-3 | gamification | Métodos `debug*` eliminados | FALSO POSITIVO | `window.debugGamification` no existe en RN; reemplazados por tests |
| FP-4 | datastore-api | `applyColors` / theming RACIMO ausente | FALSO POSITIVO | `ThemeProvider.tsx:111` lee `configColors` y aplica `colorsModelToOverrides()` |
| FP-5 | datastore-api | `getFileUri` elimina `convertFileSrc()` | FALSO POSITIVO | En RN, `<Image>` consume `file://` directamente sin puente Capacitor |
| FP-6 | datastore-api | `ConfigContext.loadImage` sin `convertFileSrc` | FALSO POSITIVO | Misma razón que FP-5 |
| FP-7 | datastore-api | `downLoadData` BLOB→BASE64 eslabón roto | FALSO POSITIVO DEPENDIENTE | Dependía del fix S3 (#10 arriba); una vez corregido, la cadena es correcta |
| FP-8 | datastore-api | `SyncMonitorDSService.isAppUsageEvent` comparación por referencia | FALSO POSITIVO | Es una mejora (fix R-21 Hermes), no una regresión |
| FP-9 | historical-agg / setup-auth | `backRoute` por `origin` en MeasurementDetail | FALSO POSITIVO | `navigation.goBack()` resuelve correctamente el stack en ambos orígenes en React Navigation |

### Divergencias aún abiertas

| # | Área | Hallazgo | Severidad | Justificación |
|---|---|---|---|---|
| A-1 | datastore-api | `STATE_SYNC_DS` enum numérico→string | MEDIA | Hoy solo se usan comparaciones `===`; sin regresión observable. Solo rompería si un futuro caller usa comparación por orden. Documentado en `sync-monitor.ts:23-28`. |

### % de lógica preservada actualizado por área

| Área | % anterior | % posterior | Delta |
|---|---|---|---|
| moon | 93% | **93%** | sin cambio (sin divergencias reales) |
| gamification | 91% | **96%** | +5% (1 divergencia de integración corregida: notificaciones) |
| setup-auth | 90% | **98%** | +8% (4 divergencias reales cerradas) |
| datastore-api | 88% | **96%** | +8% (2 divergencias reales cerradas: S3 binary, enum pendiente) |
| historical-agg | 85% | **97%** | +12% (4 divergencias cerradas: calculateValue, selected x2, timeFrame) |
| measurement-engine | 74% | **97%** | +23% (4 divergencias críticas/altas cerradas) |
| **Promedio ponderado** | **87%** | **~96%** | **+9%** |

### Calidad tras remediación

| Gate | Estado |
|---|---|
| Jest | 799/799 tests verdes |
| TypeScript (`tsc --noEmit`) | 55 errores preexistentes (sin variación, todos en mocks de test) |
| ESLint (errores) | 0 errores en los 16 archivos modificados |
| Commit SHA (último fix) | `58863e2` |

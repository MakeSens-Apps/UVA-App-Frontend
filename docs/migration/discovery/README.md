# Descubrimiento de Migración — UVA App (Ionic/Angular → React Native)

**Fase 1: Descubrimiento — Resumen ejecutivo e índice**

Este directorio contiene los 10 documentos de dominio generados durante la Fase 1 (Descubrimiento) de la migración de la app UVA desde **Angular 18 + Ionic 8 + Capacitor 6** hacia **React Native con Expo + Development Builds (Android-only)**. Cada documento es un inventario exhaustivo de una vertical del código actual, con rutas de archivo y números de línea, pensado para alimentar las fases posteriores de diseño y ejecución.

El registro consolidado y deduplicado de riesgos vive en [`risk-register.md`](./risk-register.md).

---

## Tabla de contenidos

| # | Documento | Descripción |
|---|-----------|-------------|
| 1 | [architecture.md](./architecture.md) | Arquitectura y arranque: `Amplify.configure` pre-bootstrap, splash gate offline-first, ruteo por tabs, ausencia de guards y dependencia de `zone.js`/APIs web. |
| 2 | [screens.md](./screens.md) | Inventario exhaustivo de las **31 vistas** (27 páginas navegables + shell + 3 sub-vistas): rutas, parámetros, servicios, estados de UI, formularios con validaciones exactas, modales/toasts y lifecycle de Ionic. Identifica 3 rutas huérfanas. |
| 3 | [components.md](./components.md) | Los **9 componentes reutilizables** + `explore-container` + `SafeHtmlPipe`: acoplamiento a primitivas Ionic, Chart.js, generación headless del reporte ambiental y render de HTML enriquecido. |
| 4 | [business-logic.md](./business-logic.md) | Lógica de negocio: capa Amplify portable, servicios DataStore con métodos `static`, gamificación pura, fase lunar, sesión y los acoplamientos web a reescribir (reporte ambiental, safe-html, share, notificaciones). |
| 5 | [native-plugins.md](./native-plugins.md) | Los **13 plugins Capacitor declarados** (solo 8 usados): notificaciones con exact-alarms, filesystem, minimizar app, share, y mapeo a equivalentes Expo. Documenta un bug existente en `cancelAllNotifications`. |
| 6 | [ionic-ui-usage.md](./ionic-ui-usage.md) | Censo de superficie UI Ionic: **35 componentes `ion-*` distintos**, 4 controladores imperativos, estrategia de iconos mixta, modales bottom-sheet y lifecycle. SweetAlert2 es dependencia muerta (0 call sites). |
| 7 | [amplify-datastore.md](./amplify-datastore.md) | Amplify v6 + DataStore v5 offline-first: Cognito passwordless con MFA SMS, 7 modelos owner-auth con selective sync, GraphQL directo, S3 solo-lectura y sync por Hub. Requiere libs nativas RN. |
| 8 | [build-system.md](./build-system.md) | Build system Android-only: Angular webpack builder, 6 scripts shell macOS, 2 pipelines GitHub Actions, keystore versionado en git, testing casi inactivo (1 de 57 specs) y referencias rotas. |
| 9 | [styling-theme.md](./styling-theme.md) | Sistema visual: dos sistemas de color no unificados, Montserrat variable font, estilado vía shadow DOM de Ionic, efectos sin equivalente RN y theming multi-tenant por RACIMO vía DOM API. |
| 10 | [web-only-risks.md](./web-only-risks.md) | Síntesis transversal de riesgos web/DOM: imagen de reporte con html-to-image, Chart.js sobre canvas, render de HTML S3 vía innerHTML, theming CSS-var, Blob y `window.location.reload`. |

---

## Resumen ejecutivo

**UVA** es una app móvil **offline-first** de recolección y monitoreo de datos ambientales comunitarios (temperatura, humedad, lluvia). Los usuarios son colaboradores de campo que registran mediciones desde el celular; cada usuario pertenece a una **UVA** (Unidad de Vigilancia Ambiental) que a su vez pertenece a un **RACIMO** (proyecto raíz). La app funciona sin conexión y sincroniza en segundo plano cuando hay red.

### Arquitectura actual (origen)

- **Arranque offline-first**: `Amplify.configure()` se ejecuta antes del bootstrap (`main.ts:15-19`); una página `SplashAnimationPage` custom decide la ruta inicial (`/login`, `register/validate-project` o `app/tabs/home`) según el estado de auth, UVA y RACIMO, esperando a `waitForSyncDataStore` del DataStore.
- **Navegación**: 100% Angular Router imperativo (45 call sites), **sin guards `CanActivate`**; el gating de sesión vive en el splash y en `ngOnInit`. La navegación principal es por 3 tabs (home/medición/histórico) más `moon-phase` como ruta hija oculta.
- **Persistencia**: Amplify v6 + DataStore v5 (offline-first, 7 modelos owner-auth con selective sync), Cognito passwordless con MFA SMS, GraphQL directo vía `generateClient`, S3 solo-lectura y `@capacitor/preferences` para la sesión. La sincronización se monitorea por el **Hub de Amplify** (no por `@capacitor/network`).
- **Estado global**: disperso en 4 mecanismos sin store unificado — `SessionService` (Preferences), campos `static` de `SyncMonitorDSService` mutados por el Hub, un único `BehaviorSubject` de notificaciones no leídas y caches en memoria de la config del RACIMO.
- **Medición data-driven**: un JSON descargado de S3 (`measurementsRegistration.json`) define guías HTML y formularios por dígitos; las lecturas se guardan en DataStore y disparan gamificación (semillas, rachas, logros, alertas).
- **Capa web/DOM acoplada**: el reporte ambiental se genera renderizando un componente Angular headless en `document.body` + `html-to-image`; las gráficas usan Chart.js sobre `<canvas>`; el HTML enriquecido se renderiza con `[innerHTML]` + `SafeHtmlPipe` (DOMPurify); el theming por RACIMO escribe CSS vars en `document.documentElement`; varias pantallas usan `window.location.reload()` y `document.createElement`.

### Implicaciones para la migración

La **capa de datos y lógica de negocio es altamente portable** (servicios Amplify, DataStore con métodos `static`, gamificación, fase lunar y agregaciones son JS/TS puro), pero **toda la capa de presentación, theming y generación de reportes está atada a la web/DOM y a Ionic**, y debe rediseñarse. Los focos críticos son: generación de imagen del reporte, gráficas Chart.js, render de HTML enriquecido, theming por CSS vars, lifecycle de Ionic (`ionViewWillEnter`), modales con dos paradigmas, notificaciones con exact-alarms y la migración del keystore de firma a EAS sin perder identidad en Play Store.

---

## Números clave

| Métrica | Valor | Fuente |
|---|---|---|
| **Pantallas / vistas** | 31 totales — 27 páginas navegables + `TabsPage` (shell) + 3 sub-vistas (`TimeFrame`, `GuideMeasurement`, `SyncAction`) | screens.md |
| **Rutas** | 25 en `app.routes.ts` + 5 hijos en `tabs.routes.ts` | screens.md |
| **Rutas huérfanas** | 3 — `register-measurement` (duplicada), `home` (carga `MeasurementPage` y nadie navega), `alerts/creation` (pantalla QA) | screens.md |
| **Componentes reutilizables** | 9 (`alert`, `areachart`, `calendar`+`day`, `environmental-report`, `header`, `moon-card`, `progress-bar`, `explore-container`) + 1 pipe (`SafeHtmlPipe`) | components.md |
| **Componentes `ion-*` distintos** | 35 en plantillas (top: `ion-icon`=95, `ion-button`=59, `ion-label`=28, `ion-input`=14, `ion-img`/`ion-content`=13, `ion-modal`=12) | ionic-ui-usage.md |
| **Controladores Ionic imperativos** | 4 con call sites (`ModalController`, `AlertController`, `ToastController`, `LoadingController`) + `AnimationController` y `Platform` | ionic-ui-usage.md |
| **Plugins Capacitor declarados** | 13 (solo **8 usados** en JS/TS: app, clipboard, core, device, filesystem, local-notifications, preferences, share) | native-plugins.md |
| **Plugins Capacitor sin uso** | 5 (haptics, keyboard, network, splash-screen, status-bar) | native-plugins.md |
| **Permisos Android** | 6 (SYSTEM_ALERT_WINDOW, INTERNET, POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM, USE_EXACT_ALARM, WAKE_LOCK, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS) | native-plugins.md / build-system.md |
| **Modelos DataStore** | 7 (owner-auth `cognito:username`, selective sync `isUnclean`, `AppUsageEvent` outbox-only) | amplify-datastore.md |
| **Tests** | 57 specs `.spec.ts` pero solo **1 se ejecuta** (karma restringido); cobertura casi nula | build-system.md / business-logic.md |
| **Iconos `ion-icon`** | ~77 por `src=` (SVG/PNG locales) + ~16 por `name=` (Ionicons) | ionic-ui-usage.md |
| **Assets visuales** | 58 SVG, 22 PNG, 3 GIF, 2 TTF (Montserrat) | styling-theme.md |
| **App ID / versión** | `com.makesens.uvaapp`, versionCode 8 / versionName 2.1.7 | build-system.md |

### Servicios por categoría de portabilidad

| Categoría | Servicios / áreas | Estrategia |
|---|---|---|
| **Portable casi sin cambios** | Capa Amplify (`auth.service.ts`, servicios `api/*`, `s3.service.ts`), los 7 servicios DataStore (métodos `static`, sin `@Injectable`), `graphql/`, `API.ts`, `models/schema.js` (regenerados por Codegen) | Reutilizar; regenerar lo generado |
| **Lógica pura reutilizable (extraer del componente)** | Gamificación (`gamification.service.ts`), fase lunar (`moon-phase.service.ts` cálculo), agregaciones de `HistoricalPage` (1322 líneas), `processDayMeasurements`/`calculateSummary` del reporte | Extraer a hooks/servicios y portar specs a Jest |
| **Acoplado a web/DOM — reescribir capa** | `environmental-report.service.ts` (html-to-image), `areachart.component.ts` (Chart.js), `safe-html.pipe.ts` (DOMPurify), `configuration-app.service.ts` (CSS vars / `convertFileSrc`) | Rediseñar con libs RN |
| **Acoplado a Capacitor — mapear a Expo** | `session.service.ts` (Preferences), `file-system.service.ts`, `share.service.ts`, `services/notification/notification.service.ts` (local-notifications), `app-minimize.service.ts` | Mapear a expo-* equivalentes |

---

## Decisiones ya tomadas

- **Stack destino**: **Expo + Development Builds** (no Expo Go), para soportar módulos nativos como Amplify DataStore y notificaciones.
- **Plataforma**: **Android-only** (igual que el origen; `minSdk 22 / targetSdk 35`).
- **Lógica TypeScript se preserva al máximo**: la capa de datos, gamificación, fase lunar y agregaciones se portan tal cual; solo se reescribe la capa de presentación/IO atada a la web.
- **Firma**: migrar el **mismo** keystore (`android/keys/keystore.jks`) a EAS Managed Credentials — nunca generar uno nuevo — y purgarlo de la historia de git.
- **Librerías equivalentes permitidas** (mapeo de referencia):
  | Origen (web/Ionic/Capacitor) | Destino (RN/Expo) |
  |---|---|
  | Chart.js + `<canvas>` | `victory-native` / `react-native-svg` |
  | `html-to-image` + `document.body` | `react-native-view-shot` (+ `expo-print` para PDF si aplica) |
  | `[innerHTML]` + `SafeHtmlPipe` (DOMPurify) | `react-native-render-html` |
  | CSS vars en `document.documentElement` | `ThemeProvider` + Context en JS |
  | `@capacitor/preferences` | `@react-native-async-storage/async-storage` / `expo-secure-store` (tokens) |
  | `@capacitor/filesystem` | `expo-file-system` (URIs absolutas, `makeDirectoryAsync`) |
  | `@capacitor/share` | `react-native-share` / `expo-sharing` |
  | `@capacitor/local-notifications` | `expo-notifications` |
  | `@capacitor/clipboard` | `expo-clipboard` |
  | `@capacitor/device` | `expo-device` / `Platform.Version` |
  | Hub `networkStatus` de Amplify | `@react-native-community/netinfo` |
  | SVG por `src=` | `react-native-svg` + transformer; GIF → `expo-image` |
  | `AnimationController` (splash) | `react-native-reanimated` |
  | `backdrop-filter: blur` | `expo-blur` (`BlurView`) |
  | `linear-gradient` | `expo-linear-gradient` |
  | Lifecycle `ionViewWillEnter` | `useFocusEffect` / `useIsFocused` (React Navigation) |
  | Angular Router | React Navigation (navegadores condicionados por auth state) |
  | `aws-amplify` (web) | `aws-amplify` + `@aws-amplify/react-native` + `get-random-values` |

---

## Huecos de descubrimiento

Inconsistencias, ambigüedades y deuda detectadas durante la síntesis (a resolver antes o durante el diseño):

1. **Dos `NotificationService` distintos y homónimos** — uno de contador de no leídas (RxJS, `core/services/view/gamification/notification.service.ts`) y otro de notificaciones locales programadas (`services/notification/notification.service.ts`). Riesgo de confusión al migrar; deben renombrarse/separarse claramente.
2. **Bug existente en `cancelAllNotifications`** (`notification.service.ts:195-199`): solo quita listeners y borra una Preference, **no cancela** las notificaciones programadas. Debe corregirse en la migración (`cancelAllScheduledNotificationsAsync`), no portarse literal.
3. **`validationFunction` del modelo ignorada**: `FlowRestriction.validationFunction` existe en `measurements.model.ts:49` pero `register-measurement.page.ts:434` usa una función fija hardcodeada que solo soporta 2 variables. Decidir si se implementa el motor parametrizable o se preserva el comportamiento actual (documentar para evitar regresión silenciosa).
4. **`getLastUserProgress` mezcla lectura y efectos secundarios**: se invoca como getter desde 6 pantallas pero crea progreso, recalcula/pierde rachas y genera alertas. En React (StrictMode, re-fetch en focus) puede duplicar progreso/alertas. Requiere separar el recálculo diario en un efecto idempotente único.
5. **Contradicción sobre SweetAlert2**: `ionic-ui-usage.md` lo marca declarado en `package.json` pero con 0 call sites (dependencia muerta a eliminar), mientras `components.md` confirma 0 coincidencias. **No es una contradicción real**: ambos coinciden en que NO se usa; el matiz es que `build-system.md` lo cuenta dentro del budget de 7 MB. Conclusión: eliminarlo, no requiere migración.
6. **Inconsistencia de versión de Gradle wrapper en CI** (8.5 en `build-android.yml` vs 8.2.1 en `build-android-bundle.yml`) y `gradle-wrapper.jar` ausente regenerado por CI. Irrelevante tras migrar a EAS, pero confirma que la infra de build actual es frágil.
7. **Scripts y docs rotos**: `package.json:21-22` invoca `amplify/scripts/*.js` inexistentes; `README-PIPELINE.md` y `release-workflow.md` referencian scripts/docs inexistentes; Husky declarado sin `.husky/` ni `prepare` (sin hooks activos); `google-services.json` ausente (push Firebase no funciona hoy). No asumir que estos comandos/integraciones funcionan.
8. **Resumen del doc `business-logic.md` mal etiquetado**: su `summary` dice "Bisection test summary for schema validation" — texto residual no representativo del contenido (que sí describe la capa de lógica de negocio). Anotado por trazabilidad; el contenido del doc es válido.
9. **`backButtonSubscription` muerto y suscripciones RxJS sin teardown**: varias páginas declaran `backButtonSubscription` que nunca se asigna (login/otp/project-vinculation/register-completed) y `ProfilePage` se suscribe a `unreadCount$` en cada `ionViewWillEnter` sin desuscribir. Limpiar al migrar a hooks.
10. **Redirecciones por `setTimeout` sin `clearTimeout`** en pantallas de transición (`ValidateCodePage`, `ValidateProjectPage`, `ProjectVinculationDonePage`, `RegisterCompletedPage`): pueden producir navegaciones fantasma en RN si el componente se desmonta antes del disparo.

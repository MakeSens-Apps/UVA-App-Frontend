# Evidencia visual — Shell y Transversales de la App

> Fase 2 de la migración Ionic/Angular 18 → React Native (Expo + Dev Builds).
> Capturas de referencia para equivalencia visual. Viewport: Samsung Galaxy S8 (360×740).

---

## Condiciones de captura

- **Usuario de prueba:** `3000000002` (Cognito auto-confirmado, sin OTP real).
- **Fecha de captura:** 2026-06-12.
- **Dev server:** `http://localhost:4200` (Angular 18 + Ionic 8).
- **Workaround web:** tras confirmar el teléfono, el flujo queda colgado en "Vinculando al proyecto" (DataStore no puede obtener tokens Cognito en el browser). Se usa `goto` directo a `/app/tabs/home` para continuar.
- **DataStore sync:** en web el IndexedDB no siempre sincroniza (depende de timing de auth tokens). En algunos estados de las capturas el contador de semillas y registros puede aparecer en 0.

---

## Flujo recorrido paso a paso

1. Se cerró la sesión de playwright previa (`playwright-cli close`).
2. Se abrió la app en `/` y se capturó el estado post-splash (splash redirige inmediatamente porque la sesión ya estaba activa).
3. Se intentó capturar la animación de splash en 3 frames consecutivos — todos muestran la pantalla de login porque el componente `SplashAnimationPage` redirige antes de que playwright pueda hacer screenshot (ver "Variantes no capturadas").
4. Se hizo login con el usuario de prueba (`3000000002`) y se capturó el `AlertComponent` de confirmación de teléfono.
5. Se confirmó el teléfono y se usó `goto` para navegar directamente a `/app/tabs/home`.
6. Se navegó por cada uno de los 3 tabs y se capturó cada uno con su tab activo (Inicio, Registrar, Historial).
7. Se capturó el `HeaderComponent` en todas sus variantes: con back+profile, con back+settings, con back+no-profile, sin back+profile, sin back+centrado.
8. Se navegó a `/register/validate-project` para capturar el estado de carga (loader GIF + "Vinculando al proyecto").
9. Se navegó a las páginas de configuración y se intentó capturar el `IonLoadingController` al sincronizar.
10. Se navegó a `/register-measurement-new` con diferentes `backButtom` para capturar variantes del header.
11. Se capturó el `GuideMeasurementComponent` que se abre como modal automáticamente.
12. Se navegó a la página QA `alerts/creation`.
13. Se capturó el share modal desde la página de perfil.
14. Se cerró la sesión de playwright.

---

## Tabla de capturas

| # | Archivo | Componente/Estado | Descripción |
|---|---------|-------------------|-------------|
| 01 | `screen-01-login-state.png` | LoginPage | Estado inicial al abrir el app en `/`. La sesión activa redirigió al login antes que el splash. Vista de referencia base de la pantalla de login. |
| 02 | `screen-02-splash-frame1.png` | LoginPage (post-splash) | Primer intento de capturar el splash — redirigió al login inmediatamente. Ver "Variantes no capturadas". |
| 03 | `screen-03-splash-frame2.png` | LoginPage (post-splash) | Segundo frame — mismo resultado (redirige en <100ms). |
| 04 | `screen-04-splash-frame3.png` | LoginPage (post-splash) | Tercer frame — confirma que la animación de splash no es capturabale en web sin timing preciso. |
| 05 | `screen-05-alert-component-confirm-phone.png` | **AlertComponent** | Modal de confirmación de teléfono durante el login. Muestra el `AlertComponent` con: contenido HTML con número en `<strong>`, botón "No, Editar" (outline `bordersInCancelBtn=true`) y "Sí, Continuar" (filled). Color `uva_blue-500`. `backdropDismiss:false`. |
| 06 | `screen-06-home-tab-active.png` | TabsPage + HomePage | Home inmediatamente después del login (DataStore sin sincronizar — seeds sin cargar). |
| 07 | `screen-07-tab-bar-home-active.png` | TabsPage — tab "Inicio" activo | Tab bar completo con "Inicio" seleccionado. Misma captura que screen-06 (redundante, conservada por completitud). |
| 08 | `screen-08-tab-register-active.png` | TabsPage — tab "Registrar" activo | Tab bar con "Registrar" seleccionado (DataStore sin cargar — sin tareas listadas aún). |
| 09 | `screen-09-tab-history-active.png` | TabsPage — tab "Historial" activo | Tab bar con "Historial" seleccionado. Página histórico de Junio 2026 (sin datos). |
| 10 | `screen-10-header-no-back-with-profile.png` | **HeaderComponent** — variante A | Título "Inicio" izquierda-alineado + chip derecho (semillas + icono semilla + avatar). Sin botón back. `hasBackButton=false`, `hasProfileButton=true`. |
| 11 | `screen-11-header-with-back-button.png` | Header personalizado (Profile) | Flecha back izquierda + título "Perfil" centrado + botón campana derecho. **Header propio de `profile.page.html`**, no usa `HeaderComponent`. |
| 12 | `screen-12-header-back-with-settings.png` | Header personalizado (Alerts) | Flecha back izquierda + título "Notificaciones" centrado + icono engranaje derecho. **Header propio de `alerts.page.html`**. |
| 13 | `screen-13-header-with-seeds-count.png` | **HeaderComponent** — variante B | Flecha back izquierda + título "Calendario lunar" + chip semillas+avatar derecha. `hasBackButton=true`, `hasProfileButton=true`. |
| 14 | `screen-14-header-back-no-profile.png` | Header vacío | Captura fallida (pantalla en blanco con solo el color del header). Ver screen-26 y screen-27 para la variante correcta. |
| 15 | `screen-15-validate-project-loader.png` | **ValidateProjectPage** — estado de carga | Fondo degradado teal. Tarjeta centrada con logo UVA, texto "Vinculando al proyecto", punto azul animado (loader.gif), botón "Cancelar". Patrón de carga transversal para procesos async largos. |
| 16 | `screen-16-validate-code-loader.png` | **ValidateCodePage** — estado de carga | Fondo degradado teal. Tarjeta centrada con logo UVA, texto "Validando código", punto azul animado. Loader intermedio de 2s antes de redirigir. |
| 17 | `screen-17-splash-reload-attempt.png` | HomePage (post-reload) | Recarga completa del browser — el app redirigió a home porque la sesión está activa. Muestra home cargado con datos. |
| 18 | `screen-18-tab-inicio-selected.png` | **Tab "Inicio" — estado completo** | Home con semillas "0", racha "0 Días", calendario semanal, barra de progreso, moon-card. Tab "Inicio" con pill azul-200 activo. **Captura de referencia principal del tab bar.** |
| 19 | `screen-19-tab-registrar-selected.png` | **Tab "Registrar" — con datos** | Lista de tareas de medición con restricciones de tiempo ("Disponible en 5h 37min"). Tab "Registrar" con pill activo. Barra de progreso "0 de 3". |
| 20 | `screen-20-tab-historial-selected.png` | **Tab "Historial" — estado vacío** | Historical de Junio 2026 con calendario (sin datos). Tab "Historial" con pill activo. Segmento Mes/Año visible. |
| 21 | `screen-21-configuration-page.png` | ConfigurationPage | Configuración con toggle notificaciones, estado sistema, botón sync. Header sin profile chip (custom header). |
| 22 | `screen-22-loading-overlay.png` | ConfigurationPage (post-sync) | La pantalla de configuración después de intentar sincronizar. El `IonLoadingController` no fue capturado (duración demasiado corta en web). |
| 23 | `screen-23-configuration-after-sync.png` | ConfigurationPage | Configuración con el panel de notificaciones colapsado y secciones de sync/actualizaciones. |
| 24 | `screen-24-measurement-detail-incomplete.png` | MeasurementDetailPage | Detalle del día 11 de mayo 2026 con registros completados e incompletos. Header con back button, sin profile. |
| 25 | `screen-25-loading-overlay.png` | ConfigurationPage | Segunda captura post-sync desde el botón "Sincronizacion con la nube". `IonLoadingController` no capturado. |
| 26 | `screen-26-header-back-no-profile.png` | GuideMeasurementComponent | Guide modal automático sobre register-measurement. Muestra: header `hasBackButton=true, hasProfileButton=false` + modal sheet con imagen de termómetro + instrucciones + botón "Entendido". |
| 27 | `screen-27-register-measurement-header.png` | **HeaderComponent** — variante C + RegisterMeasurementPage | Header con flecha back izquierda + título "Registro máximos" centrado (con `hasCenterTitle=true`) + sin profile chip. Página de captura con inputs de dígitos, campo temperatura/humedad, botón "Guardar registro". |
| 28 | `screen-28-guide-measurement-modal.png` | **GuideMeasurementComponent** | Guide modal abierto manualmente desde el info-icon. Captura idéntica al auto-open: image + instructivos + checkbox "Mostrar automaticamente" + botón "Entendido". |
| 29 | `screen-29-header-centered-no-back-no-profile.png` | **HeaderComponent** — variante D | Título "Registro minimos" perfectamente centrado sin back ni profile. `hasCenterTitle=true`, `hasBackButton=false`, `hasProfileButton=false`. Usado en flujos multi-paso de medición (segundo flow en adelante). |
| 30 | `screen-30-qa-alerts-creation-page.png` | CreationPage (ruta huérfana QA) | Página de desarrollo `alerts/creation`. Botones para disparar cada tipo de alerta de gamificación. Sin header, sin tab bar. **Excluir de la migración a RN.** |
| 31 | `screen-31-profile-share-modal.png` | **Bottom Sheet de compartir** | Modal de compartir de la ProfilePage. Bottom sheet nativo con opciones WhatsApp, Notion, Facebook, Copiar enlace, Más. Fondo semitransparente sobre el perfil. |
| 32 | `screen-32-header-no-back-with-profile-history.png` | **HeaderComponent** — variante A en Historical | Header de Historial: título "Historial de registros" + chip semillas+avatar derecha. Sin back. `hasBackButton=false`, `hasProfileButton=true`. |

---

## Variantes no capturadas

| Variante | Razón |
|----------|-------|
| **Splash animation (frames intermedios)** | La animación dura ~2.5s (3 fases: leaf slideDown 1s, "Powered By" fadeIn 1s, logo fadeIn 1s + 500ms delay). El componente `SplashAnimationPage` ejecuta `checkUserAuthentication()` en `ngOnInit` en paralelo con `playAnimations()` en `ionViewDidEnter`. Cuando la sesión es válida, la autenticación resuelve rápido y `waitForAnimationToEnd()` hace que la redirección espere el fin de la animación. En el browser con playwright, el goto a `/` navega al componente pero la combinación de tiempos hace que el snapshot siempre muestre la login (la vista ya redirigió antes del screenshot). Requeriría un hook de `Playwright.waitForSelector('.splash-screen')` con timeout muy corto y la sesión limpiada. |
| **IonLoadingController overlay** | El overlay "Cargando..." de Ionic (usado en ConfigurationPage `updateConfiguration`, HistoricalPage para `generateReportImage`) dura muy pocos ms en web antes de completarse. No fue posible capturarlo con `playwright-cli screenshot` después del click (el playwright serializa la acción antes del screenshot). En RN se implementará con `ActivityIndicator` de React Native o `react-native-progress`. |
| **IonToast notifications** | Los toasts (éxito/error/warning en ConfigurationPage y HistoricalPage) duran 2-4 segundos. No se capturaron porque requieren acciones que en web devuelven error (sincronización sin red real, compartir imagen). |
| **AlertComponent con `reverseButton=true`** | Variante usada en `MeasurementDetailPage` ("Recuperar tu racha pagando 5 semillas"). No capturable de forma segura porque requiere un día `isYesterday` con estado `incomplete` — la lógica de `isYesterday` se verifica con la fecha real del dispositivo vs. la fecha del registro, y el query param `date` en la URL no sobreescribe esa comparación interna. |
| **Comportamiento de teclado virtual** | Ionic en web muestra el teclado nativo del OS en inputs. En Playwright/Chrome desktop no existe teclado virtual on-screen. En RN, el teclado nativo sube y empuja el contenido — se deberá usar `KeyboardAvoidingView` o similar. |
| **Transiciones de navegación animadas** | Las transiciones entre pantallas (slide horizontal) no se pueden capturar como frame intermedio en playwright-cli (cada `goto` muestra el estado final estable). En RN se implementan con React Navigation `screenOptions.animation`. |
| **Modal de confirmación guardado (con blur)** | El `modal_modal_confirmation` de `RegisterMeasurementPage` aplica `blur` al fondo cuando se abre. No fue posible activarlo porque requiere llenar los inputs de medición (spinbuttons de dígitos). Capturado en el feature `measurement` (screen-20). |
| **SyncActionComponent con estado `isInfoPending=false`** | El estado "Sin información pendiente" (botón deshabilitado) aparece en `screen-23`. Pero el estado activo (botón habilitado con pending) aparece en el feature `profile` (`screen-16-sync-in-progress.png`). |

---

## Notas visuales para implementacion en React Native

### Header (`HeaderComponent`)

El `HeaderComponent` tiene 4 variantes según sus `@Input`:

| Configuración | Uso | Pantallas |
|---|---|---|
| `hasBackButton=false`, `hasProfileButton=true` | Tab screens y sub-páginas sin navegación padre | Home, Historial, Medición (tab) |
| `hasBackButton=true`, `hasProfileButton=true` | Sub-páginas que mantienen acceso al perfil | Calendario lunar |
| `hasBackButton=true`, `hasProfileButton=false` | Flujos de medición con back pero sin distracciones | RegisterMeasurementPage (flow 1+) |
| `hasBackButton=false`, `hasProfileButton=false`, `hasCenterTitle=true` | Flujos de medición sin retorno (flow 2+) | RegisterMeasurementPage (flujos encadenados) |

**Diseño del Header:**
- Fondo: `--Colors-Blue-500` (#10BCCA)
- Padding: `16px 10px`
- Altura total: 74px (incluye safe area)
- Título: `Montserrat 18px 600`, color `--Colors-Gray-50` (#FAFAFA)
- Flecha back: `ion-icon arrow-back-outline`, color blanco
- Chip de semillas: fondo `--Colors-Blue-100` (#D1FBFC), texto y ícono `--Colors-Blue-700` (#14788A), `Montserrat 16px 700`; border-radius 18px; height 40px; padding left 10px, right 7px
- Avatar: círculo 40×40px (SVG user-circle.svg), margin inline 0

**Variantes de header custom (no usan `HeaderComponent`):**
- `ProfilePage`: back + título centrado + campana de notificaciones (badge rojo si hay no-leídas)
- `AlertsPage`: back + título centrado + engranaje de configuración
- `ConfigurationPage`: solo back + título centrado (sin acciones derecha)
- `PersonalInfoPage`, `AchievementPage`: solo back + título centrado

En RN, crear un componente `AppHeader` que reciba `{title, hasBack, rightElement}` y use `SafeAreaView` para el padding superior.

### Tab Bar (`ion-tab-bar`)

- Posición: fija en el bottom, altura 82px
- Fondo: `--Colors-Blue-500` (#10BCCA)
- Padding inline: 10px
- 3 tabs: Inicio (`home.svg`), Registrar (`clipboard-check.svg`), Historial (`calendar.svg`)
- **Tab activo:** pill con `border-radius: 14px`, fondo `--Colors-Blue-200` (#A9F5F8), altura 56px centrada en el tab bar
- **Color activo:** `--Colors-Blue-700` (#14788A) para ícono y texto
- **Color inactivo:** `--Colors-Gray-50` (#FAFAFA, hereda del `--color` del tab-bar)
- Fuente labels: `Montserrat 14px 500`
- Iconos: SVGs locales, 20×20px
- En RN: usar `@react-navigation/bottom-tabs` con `tabBarStyle` personalizado; renderizar el indicador activo con `tabBarItemStyle` condicional.

### AlertComponent (modal genérico de confirmación)

- Implementado como `ion-modal` encima de la pantalla actual
- `--width: 90%`, `--border-radius: 16px`, `--height: auto`
- Contenido HTML libre (`[innerHTML]`) — soporta texto plano y HTML con `<strong>`
- Botón cancel: `fill="outline"` (outline con borde), color `uva_blue-500` o `uva_blue-600`
- Botón OK: `fill="solid"` (relleno), mismo color
- `reverseButton: true` invierte el orden (cancel derecha, OK izquierda)
- `backdropDismiss: false` en login/registro
- Padding: 20px en la tarjeta interna; gap 10px entre botones
- En RN: implementar como `Modal` de React Native o `react-native-modal`; usar `Animated` para la entrada slide-up.

### GuideMeasurementComponent (modal de guía)

- Modal hoja (`modal-sheet`) que se desliza desde abajo
- Contiene: imagen de referencia (jpg desde S3), título del flow con flecha (next guide si existe), lista numerada de instrucciones (HTML renderizado), checkbox "Mostrar automaticamente" (sin binding funcional actual), botón "Siguiente" o "Entendido"
- Se auto-abre si `showAutomatic: true` en la config de la guía
- En RN: usar un `BottomSheet` (react-native-bottom-sheet o @gorhom/bottom-sheet)

### Splash Screen

**Elementos visuales (no capturable en web):**
- Fondo: `background.svg` con `backdrop-filter: blur(25px)`
- Logo UVA (leaf SVG) con animación `translateY(-100%) → translateY(0)` en 1s, `ease-in-out`
- "Powered By" texto: blanco, `Montserrat 20px 600`, fadeIn en 1s con delay 1s
- Logo MakeSens (SVG 150px wide): fadeIn en 1s con delay 1s
- Secuencia total: ~2.5s antes de redirigir
- En RN: usar `react-native-reanimated` o `react-native-animated-splash-screen`; el fondo degradado/blur con `expo-blur` o `ImageBackground`

### Loader GIF pattern (ValidateProjectPage, ValidateCodePage)

- Fondo degradado teal igual que las pantallas de auth
- Tarjeta centrada con logo de la app
- Punto/dot azul animado (loader.gif) — en RN usar `ActivityIndicator` de React Native
- Botón "Cancelar" siempre visible en ValidateProject; sin botón en ValidateCode
- Estas pantallas son transitorias (2-3s) y redirigen automáticamente con `setTimeout`

### Profile Share Modal (bottom sheet nativo)

- El `ShareService` usa `@capacitor/share` → en web abre el browser native share sheet
- La hoja muestra: thumbnail de la app, descripción, grid de apps (WhatsApp, Notion, Facebook), "Copiar enlace", "Más"
- En RN: `Share.share()` de React Native expone el mismo sheet nativo de iOS/Android

### Design tokens de color resumidos

| Token | Hex | Uso principal |
|---|---|---|
| `--Colors-Blue-500` | #10BCCA | Fondo de header, fondo de tab bar |
| `--Colors-Blue-700` | #14788A | Tab activo, botón enabled, chip semillas texto |
| `--Colors-Blue-200` | #A9F5F8 | Fondo tab activo pill, chip semillas fondo |
| `--Colors-Blue-100` | #D1FBFC | Chip semillas en header |
| `--Colors-Gray-50` | #FAFAFA | Texto del header, tab inactivo |
| `--Colors-Gray-500` | #737373 | Texto secundario (progress text) |
| `--Colors-Green-500` | #69AB3C | Fill de la progress bar |
| `--Colors-Green-200` | #C8E6B0 | Track/fondo de la progress bar |
| `--Colors-Danger` | #E5245E | Errores inline, badge de notificaciones |
| `--Colors-Blue-900` | #164551 | Texto de encabezados en contenido |

### Fuente global

- **Montserrat** (variable weight 100-900, cargada vía `@font-face` desde `assets/fonts/Montserrat/`)
- En RN: usar `expo-font` con `useFonts({ montserrat: require('./assets/fonts/Montserrat-VariableFont_wght.ttf') })`

### Ciclo de vida de vistas (crítico para RN)

- Ionic usa `ionViewWillEnter` / `ionViewDidEnter` / `ionViewWillLeave` para recarga de datos al re-entrar en pantallas.
- React Navigation no tiene equivalente directo — usar `useFocusEffect` de `@react-navigation/native` para emular `ionViewWillEnter`.
- `ionViewWillLeave` equivale a `useEffect(() => () => cleanup(), [])` con el focus effect.

### Modales con flag booleano vs. ModalController

- Ionic usa dos paradigmas: flags booleanos con `*ngIf` (Home: `modal_Days`, `modal_token`) y `ModalController.create()` (AlertComponent, GuideMeasurementComponent).
- En RN: unificar ambos en el patrón de `Modal` de React Native o una librería como `react-native-modal`. El flag booleano se mapea a `visible={showModal}`.

### Overlays y z-index

- `ion-modal` aparece sobre toda la UI con un backdrop semitransparente
- `ion-loading` aparece sobre todo (incluyendo modales) con fondo oscuro y spinner centrado
- `ion-toast` aparece en el bottom (o top) con duración configurable
- En RN: `Modal` para modals, `ActivityIndicator` embebido o `react-native-loading-spinner-overlay` para loading, `react-native-toast-message` o `Snackbar` para toasts

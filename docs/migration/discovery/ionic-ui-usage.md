# Censo exhaustivo de uso de UI de Ionic — UVA App

**Fase 1 — Descubrimiento para migración Ionic → React Native (Expo + Development Builds)**

Este documento inventaria de forma exhaustiva toda la superficie de UI de Ionic presente en
`src/`: componentes `ion-*` en plantillas, símbolos `IonX` importados en componentes standalone,
controladores/servicios de UI Ionic invocados desde TypeScript, Ionicons, animaciones, gestos,
directivas/utilidades de layout y el uso (declarado) de SweetAlert2.

Metodología: conteo de **etiquetas de apertura** `<ion-*` sobre `src/**/*.html` (verificado con
`grep`/PCRE excluyendo cierres `</ion-*` y prefijos como `ion-card` vs `ion-card-title`), cruzado
con los imports `IonX` en los `.ts` standalone. Todas las afirmaciones llevan referencia
`archivo:línea`. Universo analizado: **40 archivos HTML** y **150 archivos TS** bajo `src/`.

---

## 1. Resumen ejecutivo de cifras

- **35 componentes `ion-*` distintos** usados en plantillas (más 3 importados pero no usados: ver §2.1).
- Los 5 más frecuentes concentran la mayor parte del trabajo de migración:
  `ion-icon` (95), `ion-button` (59), `ion-label` (28), `ion-input` (14), `ion-img`/`ion-content` (13 c/u).
- **4 controladores Ionic** usados desde TS: `ModalController`, `AlertController`, `ToastController`,
  `LoadingController`. **Más** `AnimationController` (splash), `Platform` (share/minimize/app shell),
  e `IonRouterOutlet`/`IonApp` (shell y registro).
- **`NavController` NO se usa**: la navegación es 100% Angular Router (45 call sites de
  `router.navigate`/`routerLink`).
- **Ionicons font casi no se usa**: solo se registran 3 iconos (`triangle`, `ellipse`, `square`) que
  además quedan huérfanos; el 99% de los iconos son **SVG/PNG custom** servidos vía `ion-icon src="..."`.
- **SweetAlert2 está declarado en `package.json` pero tiene CERO call sites** en el código fuente
  (ver §6). Es dependencia muerta a efectos de migración.
- **9 hooks de ciclo de vida Ionic** (`ionViewWillEnter` x9, `ionViewDidEnter` x2, `ionViewWillLeave` x1).

---

## 2. Tabla principal — componentes `ion-*` (orden descendente por frecuencia)

Conteo = etiquetas de apertura en plantillas HTML. "Equivalente RN" es propuesta inicial.

| # | Componente | Usos | Archivos donde aparece | Equivalente RN propuesto |
|---|---|---:|---|---|
| 1 | `ion-icon` | 95 | `components/moon-card`, `components/header`, `components/alert`*, `pages/home`, `pages/measurement` (+guide), `pages/historical`, `pages/profile` (+configuration, +sync-action, +achievement, +alerts, +personal-info), `pages/tabs` | `react-native-svg` (SvgUri/SvgXml) o `expo-image` para los `src="*.svg/.png"`; `@expo/vector-icons` solo si se mantienen iconos con nombre |
| 2 | `ion-button` | 59 | 24 archivos: `components/alert`, `components/header`, `pages/home`, `pages/measurement` (+guide, +register), `pages/auth/otp`, `pages/auth/register/*` (register, register-success, set-phone, register-project-form, project-vinculation, pre-register, validate-project), `pages/auth/login`, `pages/alerts/creation`, `pages/historical` (+detail), `pages/profile` (+configuration, +sync-action, +achievement, +alerts, +personal-info) | `Pressable`/`TouchableOpacity` con componente `Button` propio (variantes `expand="block"`, `fill="clear|outline|solid"`, `color`, `shape="round"`, `size`) |
| 3 | `ion-label` | 28 | `components/header`, `pages/tabs` (3), `pages/auth/register` (+set-phone, +register-project-form, +project-vinculation), `pages/auth/login`, `pages/historical/time-frame`, `pages/profile` (6) (+configuration, +sync-action (3), +personal-info (5)) | `Text` (con estilos de tipografía del tema) |
| 4 | `ion-input` | 14 | `pages/measurement/register-measurement` (2), `pages/auth/otp`, `pages/auth/register` (2), `pages/auth/register/set-phone-register`, `pages/auth/register/register-project-form`, `pages/auth/register/project-vinculation`, `pages/auth/login`, `pages/profile/personal-info` (5) | `TextInput` (mapear `type=tel/number`, `maxlength`, `placeholder`, `mode="numeric"`, eventos `ionInput/ionFocus/ionBlur`) |
| 5 | `ion-img` | 13 | `explore-container`, `components/moon-card` (2), `pages/home` (2), `pages/measurement` (+guide, +register), `pages/auth/otp/validate-code`, `pages/auth/register` (register-completed, project-vinculation-done, validate-project), `pages/profile/achievement` | `expo-image` (`Image`) — soporta lazy/placeholder como `ion-img` |
| 6 | `ion-content` | 13 | `pages/home`, `pages/splash-animation`, `pages/measurement` (+register), `pages/moon-phase`, `pages/alerts/creation`, `pages/historical` (+detail), `pages/profile` (+configuration, +achievement, +alerts, +personal-info) | `ScrollView` o `SafeAreaView`+`ScrollView`; envolver con `react-native-safe-area-context` |
| 7 | `ion-modal` | 12 | `pages/home` (4: l.67,116,170,235), `pages/measurement` (l.100), `pages/measurement/register-measurement` (2: l.94,122), `pages/profile` (l.100), `pages/profile/achievement` (2: l.28,93), `pages/profile/personal-info` (2: l.137,181) | `Modal` de RN o `@gorhom/bottom-sheet` (la mayoría son bottom-sheets con `[breakpoints]`) + modales por controlador (§4.1) |
| 8 | `ion-item` | 11 | `pages/profile/profile.page.html` (6), `pages/profile/configuration` (1), `pages/profile/personal-info` (4) | `View`/`Pressable` con layout flex (listas de ajustes) |
| 9 | `ion-buttons` | 8 | `components/header`, `pages/profile` (2), `pages/profile/configuration`, `pages/profile/achievement`, `pages/profile/alerts` (2), `pages/profile/personal-info` | `View` con `flexDirection: row` dentro del header |
| 10 | `ion-toolbar` | 7 | `components/header`, `pages/alerts/creation`, `pages/profile` (+configuration, +achievement, +alerts, +personal-info) | Header propio / `@react-navigation` header o `View` |
| 11 | `ion-header` | 7 | mismos 7 archivos que `ion-toolbar` | Cabecera nativa de React Navigation o `View` con safe-area top |
| 12 | `ion-checkbox` | 6 | `pages/measurement` (l.51,70), `pages/measurement/guide-measurement` (l.40), `pages/auth/register/pre-register` (l.7), `pages/historical/measurement-detail` (l.26,61) | `expo-checkbox` o `@react-native-community/checkbox` |
| 13 | `ion-list` | 5 | `pages/profile`, `pages/profile/configuration`, `pages/profile/configuration/sync-action` (l.36 wrapper), `pages/profile/personal-info` (2) | `View` o `FlatList` si la lista crece |
| 14 | `ion-row` | 4 | `pages/alerts/creation`, `pages/historical`, `pages/profile` | `View` con `flexDirection: row` |
| 15 | `ion-col` | 4 | `pages/alerts/creation`, `pages/historical` | `View` con `flex` |
| 16 | `ion-grid` | 3 | `pages/alerts/creation`, `pages/historical`, `pages/profile` | `View` flex container |
| 17 | `ion-tab-button` | 3 | `pages/tabs/tabs.page.html` (l.3,11,19) | `@react-navigation/bottom-tabs` `Tab.Screen` |
| 18 | `ion-card-header` | 3 | `pages/home`, `pages/measurement` | `View` (cabecera de tarjeta) |
| 19 | `ion-card-content` | 3 | `components/calendar`, `pages/home`, `pages/measurement` | `View` (cuerpo de tarjeta) |
| 20 | `ion-card-title` | 3 | `pages/home`, `pages/measurement` | `Text` con estilo de título |
| 21 | `ion-segment-button` | 2 | `pages/historical/time-frame` (l.3,11) | Botones de un segmented control propio o `@react-native-segmented-control/segmented-control` |
| 22 | `ion-chip` | 2 | `components/header` (l.15), `pages/profile/configuration` (l.51) | `View` con borde redondeado + `Text` |
| 23 | `ion-segment` | 1 | `pages/historical/time-frame` (l.2) | `SegmentedControl` (ver fila 21) |
| 24 | `ion-toggle` | 1 | `pages/profile/configuration` (l.27) | `Switch` de RN |
| 25 | `ion-progress-bar` | 1 | `components/progress-bar` (l.5) | `react-native-progress` o `Animated` propio |
| 26 | `ion-badge` | 1 | `pages/profile/profile.page.html` (l.15) | `View`+`Text` (badge propio) |
| 27 | `ion-avatar` | 1 | `components/header` (l.18) | `expo-image` circular |
| 28 | `ion-thumbnail` | 1 | `explore-container` (l.7) | `View` con `Image` |
| 29 | `ion-text` | 1 | `pages/profile/configuration` (l.56) | `Text` |
| 30 | `ion-title` | 1 | `pages/alerts/creation` | `Text` (título del header) |
| 31 | `ion-footer` | 1 | `pages/profile/personal-info` (l.~) | `View` anclado abajo / safe-area bottom |
| 32 | `ion-card` | 1 | `components/alert` (l.~) | `View` con sombra/borde |
| 33 | `ion-tabs` | 1 | `pages/tabs/tabs.page.html` (l.1) | `Tab.Navigator` (@react-navigation/bottom-tabs) |
| 34 | `ion-tab-bar` | 1 | `pages/tabs/tabs.page.html` (l.2, `slot="bottom"`) | Configuración `tabBar` del Tab.Navigator |
| 35 | `ion-router-outlet` | 1 | `app.component.html` | `NavigationContainer` + Stack/Tab navigator de React Navigation |
| 36 | `ion-app` | 1 | `app.component.html` | `App` raíz (`SafeAreaProvider` + `GestureHandlerRootView`) |

> Nota: en la columna "Archivos" de `ion-icon`, `components/alert` no contiene `ion-icon` (el `*` es
> recordatorio de que `ion-icon` aparece en 16 archivos distintos; los nombres listados son los
> principales). Conteo total verificado = 95 etiquetas de apertura.

### 2.1 Componentes importados en TS pero NO usados en plantillas (imports muertos)

Verificado: no aparecen en ningún `.html`.

| Símbolo importado | Archivo del import | Estado |
|---|---|---|
| `IonNote` | `src/app/pages/profile/configuration/configuration.page.ts:29,73` | Importado, sin uso en HTML |
| `IonSpinner` | `src/app/pages/profile/configuration/configuration.page.ts:21,66` | Importado, sin uso en HTML (el spinner del loading se pasa por config del `LoadingController`) |
| `IonItemDivider` | `src/app/pages/profile/profile.page.ts:26,55` | Importado, sin uso en HTML |

### 2.2 Componentes Ionic explícitamente verificados como AUSENTES

Buscados y **no usados** (0 ocurrencias) — relevante porque la misión los menciona:
`ion-refresher` / `ion-refresher-content`, `ion-infinite-scroll`, `ion-datetime`, `ion-select`,
`ion-fab`, `ion-searchbar`, `ion-skeleton-text`, `ion-back-button`, `ion-menu`, `ion-popover`,
`ion-accordion`, `ion-reorder`, `ion-range`, `ion-radio`, `ion-item-sliding`, `ion-nav`,
`ion-breadcrumb`, `ion-picker`, `ion-spinner` (como tag).

**Implicación para RN**: no hay que portar pull-to-refresh (`RefreshControl`), scroll infinito
(`FlatList onEndReached`) ni date pickers nativos de Ionic. El selector de rango temporal del
histórico se implementa con un **calendario propio** (`components/calendar/`) + `ion-segment`, no
con `ion-datetime`.

---

## 3. Imports `IonX` en componentes standalone (.ts)

Como la app usa standalone components, cada página/componente importa los `IonX` que usa. Conteo de
ocurrencias del símbolo (incluye línea de `import {}` y línea del array `imports:`), por lo que el
número difiere del conteo de etiquetas HTML.

| Símbolo | Ocurrencias en TS |
|---|---:|
| `IonButton` | 35 |
| `IonLabel` | 28 |
| `IonInput` | 20 |
| `IonIcon` | 18 |
| `IonContent` | 16 |
| `IonToolbar` | 10 |
| `IonImg` | 10 |
| `IonHeader` | 10 |
| `IonTitle` | 8 |
| `IonModal` | 8 |
| `IonList`, `IonChip`, `IonCheckbox`, `IonCard`, `IonButtons` | 6 c/u |
| `IonInputCustomEvent` (tipo) | 5 |
| `IonRow`, `IonRouterOutlet`, `IonItem`, `IonGrid`, `IonCol`, `IonBadge`, `IonAvatar` | 4 c/u |
| `IonToggle`, `IonText`, `IonTabs`, `IonTabButton`, `IonTabBar`, `IonSpinner`, `IonSegmentButton`, `IonSegment`, `IonProgressBar`, `IonNote`, `IonItemDivider`, `IonFooter`, `IonCardTitle`, `IonCardHeader`, `IonCardContent`, `IonApp` | 2 c/u |
| `IonInputElement` (tipo) | 1 |

Además, varias páginas importan **`IonicModule`** completo (modo no-tree-shakeable) en vez de los
símbolos individuales: `explore-container.component.ts:3`, `home.page.ts:5/40`,
`measurement.page.ts:5/88`, `validate-project.page.ts:5/13`, `moon-phase.page.ts:5/47`,
`alerts/creation.page.ts:3/21`, `achievement.page.ts:8/22`, `alerts.page.ts:5/15`,
`personal-info.page.ts:14/104`, `components/calendar/*`, `components/moon-card/moon-card.component.ts:2/33`.
**Implicación**: la migración debe revisar cada plantilla de estas páginas, no basta con seguir la
lista de imports porque `IonicModule` expone todos los componentes.

---

## 4. Controladores y servicios de UI Ionic usados desde TypeScript

### 4.1 `ModalController` (modales por código)

Inyectado en 6 archivos; patrón `create({ component, componentProps, cssClass, backdropDismiss })`
+ `present()`/`onDidDismiss()` y `dismiss(data)`.

| Archivo:línea | Operación | Detalle |
|---|---|---|
| `src/app/components/alert/alert.component.ts:33` (inyección), `:42` | `modalCtrl.dismiss({ action })` | Componente `AlertComponent` es el contenido de los modales de confirmación |
| `src/app/pages/measurement/guide-measurement/guide-measurement.component.ts:65`, `:98`, `:100` | `dismiss({ nextGuide })` / `dismiss()` | Guía paso a paso presentada como modal |
| `src/app/pages/auth/register/set-phone-register/set-phone-register.page.ts:50`, `:91` | `create({...})` | Modal de confirmación |
| `src/app/pages/auth/login/login.page.ts:54`, `:99`, `:150` | `create({ component: AlertComponent, componentProps:{content,textCancelButton,textOkButton}, cssClass:'custom-modal', backdropDismiss:false })` | 2 modales de confirmación; respuesta vía `onDidDismiss().then(data => data.data.action === 'OK')` |
| `src/app/pages/historical/measurement-detail/measurement-detail.page.ts:82`, `:349` | `create({...})` | Modal de detalle |

**RN**: reemplazar por estado local + `Modal`/bottom-sheet y promesa/callback de resultado, o por
una librería de diálogos. El contenido HTML embebido (`content: '<p>...<strong>...'`) requiere
renderizar texto/markup en RN (ver §7, `safe-html.pipe`).

### 4.2 `AlertController` (alertas nativas tipo OK/Cancel con inputs)

Inyectado en 2 archivos.

| Archivo:línea | Detalle |
|---|---|
| `src/app/pages/auth/otp/otp.page.ts:66` (inyección) | Alertas de error/validación en flujo OTP |
| `src/app/pages/profile/personal-info/personal-info.page.ts:136` (inyección), `:259`, `:345` | `alertController.create({...})` x2 (confirmaciones/inputs de edición de perfil) |

**RN**: `Alert.alert()` de React Native para casos simples; diálogo custom para alerts con inputs.

### 4.3 `ToastController` (toasts)

Inyectado en 2 archivos; 8 call sites de `toastController.create(...)`.

| Archivo:línea de call sites |
|---|
| `src/app/pages/historical/historical.page.ts:955, 1027, 1069, 1118, 1194, 1212` (6) |
| `src/app/pages/profile/configuration/configuration.page.ts:305, 319` (2) |

**RN**: `react-native-toast-message` o `Snackbar` de `react-native-paper`.

### 4.4 `LoadingController` (overlay de carga con spinner)

Inyectado en 2 archivos; 2 call sites.

| Archivo:línea | Config |
|---|---|
| `src/app/pages/historical/historical.page.ts:899` | `create({...})` con timeout de respaldo (l.907 `LoadingController timeout`, l.915 fallback) — ver Riesgo |
| `src/app/pages/profile/configuration/configuration.page.ts:266` | `create({ message:'Cargando...', spinner:'circles', backdropDismiss:false })` + `present()`/`dismiss()` en `finally` |

**RN**: overlay propio (`Modal` transparente con `ActivityIndicator`) o `react-native-loading-spinner-overlay`.

### 4.5 `AnimationController` (animaciones de la splash)

Solo en `src/app/pages/splash-animation/splash-animation.page.ts:49` (inyección). Crea 3 animaciones
con la API fluida de Ionic:
- `leafIconAnimation` (`:248-253`): `duration(1000)`, `fromTo('transform','translateY(-100%)','translateY(0)')`
- `poweredByAnimation` (`:256-261`): `duration(1000)`, `fromTo('opacity','0','1')`
- `makeSensLogoAnimation` (`:265-270`): `duration(1000)`, `fromTo('opacity','0','1')`
- Disparo en `ionViewDidEnter` (`:233`) con `.play()` (`:283-285`).

**RN**: `Animated`/`react-native-reanimated` (`withTiming`, `translateY`, `opacity`).
No se usa `GestureController` ni `createGesture` en ningún archivo (verificado: 0 ocurrencias).

### 4.6 `Platform` (servicio de plataforma de Ionic)

Inyectado en 3 archivos. **Importante**: distinguir de `Capacitor.getPlatform()` (que también se usa
en `configuration-app.service.ts:191` y `notification.service.ts:46,240`, y NO es Ionic).

| Archivo:línea | Uso |
|---|---|
| `src/app/app.component.ts:6,32` | Inyección del `Platform` de `@ionic/angular/standalone` en el shell |
| `src/app/core/services/view/share.service.ts:24`, `:34,47,119,131,150,206,232` | `platform.is('capacitor')`, `platform.is('android')` para ramas de compartir/exportar |
| `src/app/core/services/minimize/app-minimize.service.ts:30`, `:63` | `platform.backButton.subscribeWithPriority(10, ...)` — manejo del botón atrás de Android |

**RN**: `Platform.OS` de RN para `is('android')`; el botón físico atrás se maneja con
`BackHandler` (Android). `platform.is('capacitor')` ya no aplica (siempre nativo en RN).

### 4.7 `IonRouterOutlet` / `IonApp` (shell y registro de animaciones de página)

- `src/app/app.component.ts:6,18`: `IonApp`, `IonRouterOutlet` en el shell.
- `src/app/pages/auth/register/register.page.ts:15,27`: importa `IonRouterOutlet` (sub-outlet del
  flujo de registro anidado).

**RN**: `NavigationContainer` + navegadores Stack/Tab de React Navigation reemplazan el outlet y las
transiciones de página de Ionic.

### 4.8 Controladores NO usados (verificado)

No hay imports ni call sites de: `ActionSheetController`, `PickerController`, `PopoverController`,
`MenuController`, `NavController`, `GestureController`. La navegación es **exclusivamente Angular
Router** (45 call sites de `router.navigate`/`routerLink`), no Ionic Nav.

---

## 5. Ionicons, iconos y assets gráficos

### 5.1 Registro de Ionicons (font de iconos con nombre)

- `src/app/pages/tabs/tabs.page.ts:9-10,27`: `addIcons({ triangle, ellipse, square })` desde
  `ionicons` / `ionicons/icons`. **Sin embargo**, las pestañas reales usan SVG custom
  (`tabs.page.html:6,14,22` → `home.svg`, `clipboard-check.svg`, `calendar.svg`), por lo que estos 3
  iconos registrados quedan **huérfanos** (dead code).
- `src/index.html:30,34`: carga el bundle de Ionicons desde **CDN unpkg** (`ionicons@7.1.0`). En RN
  no existe index.html; se elimina por completo.

### 5.2 Iconos con `name="..."` (catálogo Ionicons real en uso)

Verificado solo sobre tags `ion-icon` (excluyendo `<meta name>`):

| `name=` | Usos |
|---|---:|
| `arrow-back-outline` | 6 |
| `close` | 4 |
| `arrow-forward-outline` | 2 |
| `arrow-forward` | 2 |
| `arrow-back` | 2 |
| `trash-outline` | 1 |
| `share-outline` | 1 |
| `settings-outline` | 1 |
| `notifications-off-outline` | 1 |

Iconos por `name` **dinámico** (`[name]="..."`):
- `src/app/pages/profile/profile.page.html:14` → `[name]="notificationIcon"`
- `src/app/pages/profile/configuration/configuration.page.html:60` → `chevron-up`/`chevron-down`
- `src/app/pages/profile/alerts/alerts.page.html:41` → `getNotificationIcon(notification)`

**RN**: estos ~16 usos con `name` (incluyendo dinámicos) mapean a `@expo/vector-icons` (Ionicons set)
o a SVGs propios. Hay que resolver los valores dinámicos en runtime.

### 5.3 Iconos por `src="*.svg/.png"` (mayoría del catálogo — assets custom)

La inmensa mayoría de `ion-icon` se renderizan con SVG/PNG locales vía `src=`. Inventario de assets
referenciados en plantillas (conteo de ocurrencias del literal `src="..."`):

- `assets/images/icons/semilla.svg` (22), `arrow-right.svg` (6), `information-circle.svg` (3),
  `exclamation.svg` (3), `user-circle.png` (2), `platula.svg` (2), `flor.svg` (2),
  `date_incomplete_to_done.svg` (2), `date_incomplete.svg` (2), `brote.svg` (2), y muchos `1x`:
  `switch-horizontal.svg`, `home.svg`, `clipboard-check.svg`, `calendar.svg`, `fire.svg`,
  `vault.svg`, `user-circle.svg`, `profile/{trash,share-social,pencil,logout,arrow-forward,Options,Open,Medal}.svg`,
  `logop.svg`, `date_current.svg`, `date_check.svg`, `refresh.svg`, `cloud.svg`,
  `checkmark-circle.svg`, `calendar_example.svg`, `Moon/eclipses_card_home .svg` (nótese espacio en
  el nombre), `logo.svg`, `logo_Makesens.svg`, etc.
- Bindings dinámicos `[src]="..."` (16 sitios en §HTML): `phaseIcon` (moon-card), `guide.icon.imagePath`,
  `item.icon.imagePath`, `option.icon`, `achievement.icon`, GIFs (`done_register.gif`, `confety.gif`),
  `loader`, etc. Ver `explore-container.component.html:5,8`, `moon-card.component.html:3`,
  `guide-measurement.component.html:8,15`, `register-measurement.page.html:26,104,145`,
  `otp/validate-code.page.html:2`, `register-completed.page.html:8`, `project-vinculation-done.page.html:7`,
  `validate-project.page.html:2`, `profile.page.html:14,36,97,131`, `configuration.page.html:60`,
  `achievement.page.html:20`, `alerts.page.html:41`, `personal-info.page.html:29`.

**RN**: los SVG por `src` pasan a `react-native-svg` (`SvgUri`/`SvgXml`) o a un mapa estático
`require(...)` + `expo-image`. Los GIFs requieren `expo-image` (soporta GIF). Atención: en RN los
assets se resuelven con `require()`/import estático, no por ruta string relativa como en web.

---

## 6. SweetAlert2 — verificación de uso

**Hallazgo crítico para la migración**: SweetAlert2 está declarado como dependencia pero **NO se usa
en el código fuente**.

- `package.json`: `"sweetalert2": "^11.14.1"` y `"@sweetalert2/ngx-sweetalert2": "^12.4.0"`.
- Búsqueda exhaustiva en `src/**/*.ts`, `*.html`, `*.scss`: **0 imports** (`from 'sweetalert2'`,
  `@sweetalert2/ngx-sweetalert2`, `SweetAlert2Module`), **0 call sites** `Swal.fire(...)`/`Swal.`,
  **0 referencias** `[swal]` en plantillas. (Las coincidencias de `swal` en `grep` correspondían a
  contenido base64 dentro de SVGs en `assets/`, no a código.)

**Conclusión**: la capa de "alertas amigables" que en otras apps cubre SweetAlert2 aquí la cubren
`ModalController` (+`AlertComponent`), `AlertController` y `ToastController` (§4). SweetAlert2 puede
eliminarse del `package.json` sin migrar nada; no aporta superficie de UI a portar.

---

## 7. Directivas, utilidades de layout, slots y props

### 7.1 Slots (`slot="..."`)

| Valor | Usos | Equivalente RN |
|---|---:|---|
| `slot="start"` | 22 | Posicionamiento a la izquierda con flex (`flexDirection: row`) |
| `slot="end"` | 21 | Posicionamiento a la derecha |
| `slot="icon-only"` | 7 | Botón con solo icono (sin texto) |
| `slot="bottom"` | 1 | `ion-tab-bar slot="bottom"` → tabBar inferior de React Navigation |

En RN no existen slots; se reemplazan por composición explícita y `flexDirection`/`justifyContent`.

### 7.2 Props de presentación más usadas

| Prop="valor" | Usos | Nota de migración |
|---|---:|---|
| `expand="block"` (ion-button) | 34 | Botón a ancho completo → `width:'100%'` |
| `fill="clear"` | 18 | Botón transparente |
| `fill="outline"` | 5 | Botón con borde |
| `fill="solid"` | 3 | Botón sólido |
| `shape="round"` | 2 | `borderRadius` alto |
| `size="small|large|medium|4|6|12"` | varios | `size="4/6/12"` son tamaños de `ion-col` (grid 12) → flex |
| `mode="numeric"` | 3 | teclado numérico → `keyboardType="numeric"` en `TextInput` |
| `mode="ios"` | 1 | forzar estilo iOS → no aplica en RN |
| `layout="icon-hide"` (segment-button) | 2 | comportamiento del segmented control |

### 7.3 Colores del tema (CSS variables Ionic custom)

Definidos en `src/theme/variables.scss` (p.ej. `--ion-color-uva_green-500:#69AB3C` (l.10),
`uva_green-700:#14788A` (l.18), `uva_blue-500:#10BCCA` (l.28), `uva_blue-600:#1097AA` (l.36), etc.,
cada uno con `-rgb/-contrast/-shade/-tint`). Usados en plantillas como `color="uva_blue-600"` (23),
`uva_blue-500` (13), `uva_green-700` (9), `uva_orange-500`, `uva_blue-700`, `uva_green-500`, y
colores semánticos `primary`, `danger`, `orange`.

**RN**: estos tokens deben extraerse a un objeto de tema JS/TS y aplicarse vía `StyleSheet`. No hay
sistema de `color="..."` declarativo; cada componente debe resolver el color del tema manualmente.

### 7.4 Clases utilitarias Ionic en plantillas

`ion-text-capitalize` (2), `ion-margin-top` (2), `ion-margin-bottom` (2), `ion-align-self-start` (1),
`ion-text` (1). Son utilidades CSS de Ionic que en RN se convierten en estilos explícitos.

### 7.5 Eventos específicos de Ionic en plantillas

| Evento `(ion*)` | Usos | Equivalente RN |
|---|---:|---|
| `(ionModalDidDismiss)` | 11 | callback `onRequestClose`/`onDismiss` del Modal/bottom-sheet |
| `(ionInput)` | 7 | `onChangeText` de `TextInput` |
| `(ionFocus)` | 7 | `onFocus` |
| `(ionBlur)` | 4 | `onBlur` |
| `(ionChange)` | 2 | `onValueChange` (toggle/segment/checkbox) |

### 7.6 Ciclo de vida Ionic (page lifecycle)

`ionViewWillEnter` (9), `ionViewDidEnter` (2), `ionViewWillLeave` (1). Archivos: `home.page.ts:155`,
`splash-animation.page.ts:233`, `measurement.page.ts:145,362`, `moon-phase.page.ts:118`,
`historical.page.ts:131`, `profile.page.ts:156`, `configuration.page.ts:131,165`,
`achievement.page.ts:46`, `alerts.page.ts:34`, `personal-info.page.ts:153`.

**RN**: no hay `ionViewWillEnter`. Se reemplaza por `useFocusEffect`/`navigation.addListener('focus')`
de React Navigation, que tiene semántica de "al entrar/salir de la pantalla" similar pero **no
idéntica** (timing distinto a `WillEnter`/`DidEnter`).

### 7.7 Modales inline (`<ion-modal>` con `[isOpen]`/`[breakpoints]`)

Patrón dominante (distinto de los modales por `ModalController` de §4.1): bottom-sheets declarados en
plantilla y controlados por estado.
- `[isOpen]=` (11), `[initialBreakpoint]=` (10), `[breakpoints]=` (10), `trigger=` (1).
- Ejemplo `home.page.html:67-74`: `[isOpen]="modals['modal_Days']"`, `[initialBreakpoint]="1"`,
  `[breakpoints]="[0, 1]"`, `(ionModalDidDismiss)="onModalDismiss('modal_Days')"`, con `<ng-template>`
  como contenido diferido.

**RN**: `@gorhom/bottom-sheet` (snap points = breakpoints) o `Modal` con animación. El patrón de
estado `modals['key']` se mantiene como estado de componente. `<ng-template>` (render diferido) no
tiene equivalente directo: en RN el contenido se monta condicionalmente.

---

## 8. Mapa de equivalencias consolidado (Ionic → React Native)

| Categoría Ionic | En esta app | Reemplazo RN propuesto |
|---|---|---|
| `ion-content`/`ion-header`/`ion-toolbar` | layout de cada página | `SafeAreaView`+`ScrollView` + header de React Navigation |
| `ion-button` (+fill/expand/shape) | 59 botones | Componente `Button` propio sobre `Pressable` |
| `ion-input` (+ionInput/Focus/Blur) | formularios auth y perfil | `TextInput` + `react-hook-form` (sustituye Reactive Forms) |
| `ion-icon src` (SVG/PNG) | ~77 iconos custom | `react-native-svg` / `expo-image` |
| `ion-icon name` (Ionicons) | ~16 iconos con nombre | `@expo/vector-icons` |
| `ion-img` | 13 imágenes | `expo-image` |
| `ion-modal` (inline, breakpoints) | bottom-sheets | `@gorhom/bottom-sheet` |
| `ModalController` (component modal) | confirmaciones | `Modal` + promesa de resultado |
| `AlertController` | alertas con input | `Alert.alert` / diálogo custom |
| `ToastController` | 8 toasts | `react-native-toast-message` |
| `LoadingController` | 2 overlays | overlay `ActivityIndicator` propio |
| `AnimationController` | splash | `react-native-reanimated` |
| `ion-tabs`/`ion-tab-bar`/`ion-tab-button` | nav inferior (3 tabs) | `@react-navigation/bottom-tabs` |
| `ion-router-outlet` + Angular Router | navegación (45 sitios) | `@react-navigation/native` (Stack/Tab) |
| `Platform.is/backButton` | share + back Android | `Platform.OS` + `BackHandler` |
| `ionViewWillEnter` (x9) | recarga al entrar | `useFocusEffect` |
| `ion-segment`/`ion-segment-button` | filtro histórico | segmented control propio |
| `ion-checkbox` (x6) | formularios medición | `expo-checkbox` |
| `ion-toggle` (x1) | config | `Switch` |
| `ion-progress-bar` (x1) | gamificación | `react-native-progress` |
| Colores `color="uva_*"` + `variables.scss` | tema | objeto de tema JS + `StyleSheet` |
| SweetAlert2 | **sin uso** | eliminar dependencia |

---

## 9. Alcance y limitaciones declaradas

- Conteos = **etiquetas de apertura** en `src/**/*.html`. Los componentes que abren y cierran en
  línea distinta (atributos en líneas siguientes) fueron contabilizados con PCRE multilínea y
  verificados contra el total `grep "<ion-[a-z-]+"`.
- No se inspeccionaron archivos `*.spec.ts` para imports productivos (sí se confirmó que `IonicModule.forRoot()`
  aparece en specs, pero eso es solo configuración de test, no UI de producción).
- No se cuantificó cada atributo de cada `ion-button`/`ion-input` uno a uno; §7.2 reporta los valores
  de props agregados por frecuencia. Si la fase de implementación necesita el mapeo prop-por-prop de
  un componente concreto, debe leerse su plantilla específica.
- `android/`, `amplify/`, `scripts/` no se modificaron ni se inventariaron (fuera de alcance de UI).
- No se modificó ningún archivo de código fuente (solo se creó este documento).
</content>

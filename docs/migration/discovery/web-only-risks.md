# Riesgos de código web/DOM-only — Migración Ionic → React Native (Expo)

> Fase 1 — Descubrimiento. Documento de **solo lectura** sobre `src/`.
> Objetivo: cazar TODO el código que depende de APIs web/DOM que **no existen en React Native** y proponer reemplazo + severidad.
> Fecha de análisis: 2026-06-11. Rama: `feature/ionic-to-react-native`.

## Resumen ejecutivo

La app es offline-first (Angular 18 + Ionic 8 + Capacitor 6). La **lógica de negocio TS** (DataStore, gamificación, fase lunar, cálculos de reportes, modelos) es portable. El riesgo concreto se concentra en **UI y plataforma**:

1. **Generación de imagen del reporte ambiental**: `html-to-image` + montaje manual de un componente Angular en `document.body` + `document.fonts.ready` + `getBoundingClientRect`. Es el bloque DOM más grande y crítico (renderiza un componente HTML/SCSS a PNG para compartir). No tiene equivalente directo en RN.
2. **Gráficas con Chart.js sobre `<canvas>` 2D** (`areachart`), con adapter `date-fns`, gradientes de canvas, escala temporal y tooltips por callbacks. Requiere reescritura a una librería de charts nativa.
3. **HTML dinámico desde backend (S3) renderizado con `[innerHTML]` + `DOMPurify` + `safe-html.pipe`**: los textos de mediciones/guías/flujos (`name`, `sortName`, `text`) vienen de archivos de configuración por RACIMO descargados de S3 y contienen marcado HTML. En RN no hay `innerHTML`; se necesita `react-native-render-html`.
4. **Manipulación directa de DOM** para loaders, backdrops, focos de inputs, animaciones de splash y CSS vars de theming (`document.documentElement.style.setProperty`).
5. **APIs de browser puras**: `window.open`, `window.location`, `window.history.back`, `navigator.share/clipboard`, `URL.createObjectURL`, `Blob`, `alert()`, y artefactos PWA/CDN (`manifest.webmanifest` huérfano, ionicons cargado desde `unpkg.com`).
6. **CSS difícil/imposible en RN**: `backdrop-filter: blur()`, `filter: blur()/drop-shadow()`, gradientes lineales, `position: fixed`, unidades `vh/vw`, `@keyframes`.

**Nota importante**: `sweetalert2` y `@sweetalert2/ngx-sweetalert2` están en `package.json` pero **NO se usan en `src/`** (0 referencias a `Swal`/`sweetalert`). Las alertas/modales reales usan los controllers de Ionic (`AlertController`, `ToastController`, `LoadingController`, `ModalController`) y un componente `<app-alert>` propio. Ver sección 4.

---

## 1. APIs web/DOM directas (`document`, `window`, `navigator`, `Blob`, `URL`)

### 1.1 `document.*` (manipulación directa del DOM)

| Ubicación | Uso | Implicación RN | Reemplazo propuesto | Severidad |
|---|---|---|---|---|
| `src/app/core/services/storage/configuration-app.service.ts:279,282` | `document.documentElement.style.setProperty('--<key>', ...)` — aplica colores de marca (theming dinámico por RACIMO) como variables CSS globales. | No existen CSS vars globales ni `documentElement` en RN. El theming dinámico es la base visual de cada RACIMO. | Mover colores a un `ThemeContext`/store (Zustand/Context) + `StyleSheet`/styled tokens; consumir colores desde el estado, no desde CSS vars. | **Crítico** |
| `src/app/core/services/view/environmental-report.service.ts:495,510,524,537` | `document.createElement('div')` (backdrop), `document.body.appendChild(hostElement)` (monta el componente del reporte fuera de pantalla), `document.fonts.ready` (espera fuentes). | Montaje DOM imperativo + API de fuentes inexistentes en RN. Núcleo de la generación de imagen del reporte. | Renderizar un componente RN real y capturarlo con `react-native-view-shot` (`captureRef`). Sin backdrop manual ni `document.fonts`. Ver sección 2. | **Crítico** |
| `src/app/core/services/view/share.service.ts:170` | `newWindow.document.write('<html>...')` — fallback web: abre ventana nueva con la imagen para descargar. | Solo aplica a web; no existe en RN. | Eliminar rama web; en RN siempre usar `expo-sharing` / `Share` nativo. | **Bajo** (rama solo-web) |
| `src/app/pages/splash-animation/splash-animation.page.ts:243-245` | `document.querySelector('.leaf-icon' / '.powered-by' / '.make-sens-logo')` para alimentar `AnimationController` de Ionic. | `querySelector` + `AnimationController` de Ionic no existen en RN. | `react-native-reanimated` con refs/`useSharedValue`, o `Animated` API; o `expo-splash-screen` + animación de entrada. | **Medio** |
| `src/app/pages/historical/historical.page.ts:1236-1288` | Loader alternativo construido a mano: `createElement` (overlay/spinner/message/style), `style.cssText`, `appendChild` a `document.head`/`body`, inyecta `@keyframes spin`. | Construcción imperativa de DOM + keyframes inyectados. No existe en RN. | Estado `isLoading` + componente `<Modal>`/overlay RN con `ActivityIndicator`. Eliminar todo el bloque. | **Alto** |
| `src/app/pages/historical/historical.page.ts:1296,1308` | `document.getElementById('alternative-loader-message' / -overlay)` para actualizar/ocultar el loader manual. | Idem anterior. | Manejar vía estado React (no IDs en DOM). | **Alto** |
| `src/app/pages/measurement/register-measurement/register-measurement.page.ts:281` | `document.getElementById('digitsInput_x_y')` → `(... as HTMLIonInputElement).setFocus()`: auto-avance de foco entre cajas de dígitos de la medición. | `getElementById` + `IonInput.setFocus()` no existen. Patrón OTP-like de inputs. | `useRef` por input + `TextInput.focus()`; gestionar avance con `onChangeText`. | **Medio** |
| `src/app/pages/profile/personal-info/personal-info.page.ts:276,320` | `document.querySelector('ion-input:not([readonly]) input')`, `document.querySelectorAll('ion-item')` para foco/limpieza de clases. | Selectores de elementos Ionic + `classList`. | Refs a `TextInput` + estado de foco React; sin selectores. | **Medio** |

### 1.2 `classList` / `.style` / `.focus()` sobre elementos DOM

| Ubicación | Uso | Reemplazo RN | Severidad |
|---|---|---|---|
| `src/app/pages/profile/personal-info/personal-info.page.ts:299,311,321,280` | `parentItem.classList.add/remove('focused')`, `firstEditableInput.focus()` (`closest('ion-item')`). | Estilo condicional por estado (`focused`) en RN; `TextInput.focus()` vía ref. | **Medio** |
| `src/app/pages/auth/register/register.page.ts:84,86` | `($event.target as HTMLInputElement).classList.add/remove('border_error')` — borde de error en input. | Estilo condicional por estado de validación. | **Medio** |
| `src/app/pages/auth/register/register-project-form/register-project-form.page.ts:129,131` | Igual: `classList.add/remove('border_error')`. | Igual. | **Medio** |
| `src/app/core/services/view/environmental-report.service.ts:480-522,554` | `hostElement.style.*` (position/zIndex/opacity/width...), `getBoundingClientRect()`. | Layout RN + captura por ref (ver sección 2). | **Crítico** (parte del flujo de imagen) |

### 1.3 `window.*`

| Ubicación | Uso | Reemplazo RN | Severidad |
|---|---|---|---|
| `src/app/app.component.ts:91` | `window.location.origin + window.location.pathname` como `urlProvider` de tracking de uso (`app-usage.service`). | No hay URL de navegador en RN. Usar nombre de ruta de React Navigation (`navigationRef.getCurrentRoute().name`). | **Medio** |
| `src/app/core/services/view/share.service.ts:168` | `window.open()` (fallback web para mostrar imagen). | Eliminar rama web. | **Bajo** |
| `src/app/core/services/minimize/app-minimize.service.ts:68` | `window.history.back()` cuando no se debe minimizar (botón atrás hardware Android). | React Navigation: `navigation.goBack()`. El `platform.backButton` de Ionic se reemplaza por `BackHandler` (RN) o el manejo de React Navigation. | **Medio** |
| `src/app/pages/profile/profile.page.ts:200,252,261` | `window.open(whatsappUrl / url, '_blank')` — abrir WhatsApp / enlaces externos. | `Linking.openURL(...)` de React Native / Expo. | **Medio** |
| `src/app/pages/measurement/register-measurement/register-measurement.page.ts:503` | `window.location.reload()` — fuerza recarga completa de la página tras registrar medición (junto a `location.go`). | No existe recarga de página en RN. Reemplazar por refetch de estado / re-render / re-navegación. **Riesgo de lógica**: depende de recarga global para refrescar estado. | **Alto** |
| `src/app/pages/historical/historical.page.ts:1163`, `register-measurement.page.ts` (`(window as any).Capacitor`) | Detección de plataforma vía `window.Capacitor`. | `Platform.OS` de RN. | **Bajo** |
| `src/zone-flags.ts:6` | `window.__Zone_disable_customElements` (zone.js). | zone.js desaparece con Angular; no aplica en RN. | **Bajo** (se elimina con Angular) |

### 1.4 `navigator.*`

| Ubicación | Uso | Reemplazo RN | Severidad |
|---|---|---|---|
| `src/app/pages/historical/historical.page.ts:1180,1181` | `navigator.share({...})` (Web Share API, rama no-Capacitor). | `expo-sharing` / `Share` de RN. Rama web se elimina. | **Bajo** |
| `src/app/pages/historical/historical.page.ts:1187` | `navigator.clipboard.writeText(...)` (fallback web). | `expo-clipboard` / `@react-native-clipboard/clipboard`. | **Bajo** |
| `src/app/core/services/view/share.service.ts:214,239,249,241,250` | `'share' in navigator`, `navigator.share`, `'clipboard' in navigator`, `navigator.clipboard.writeText`. Ramas de fallback web. | En RN siempre usar plugin nativo; eliminar detección/ramas web. | **Bajo** |

### 1.5 `Blob` / `URL.createObjectURL` / `atob` / `btoa`

| Ubicación | Uso | Implicación RN | Reemplazo propuesto | Severidad |
|---|---|---|---|---|
| `src/app/core/services/storage/configuration-app.service.ts:247,254,257` | `atob()` → `Uint8Array` → `new Blob([...], {type:'image/png'})` → `URL.createObjectURL(blob)` para mostrar imágenes de marca en **web**. | `Blob` y `createObjectURL` no existen en RN. Solo se usa en la rama `case 'web'` de `loadImage()`. En Android usa `Capacitor.convertFileSrc` (ver línea 223). | En RN cargar imágenes desde el filesystem (`expo-file-system` URI) directamente en `<Image source={{uri}}>`; eliminar rama web/Blob. La rama Android (`convertFileSrc`) también cambia: usar URI `file://` de `expo-file-system`. | **Alto** (theming de imágenes por RACIMO) |
| `src/app/core/services/storage/configuration-app.service.ts:68` | `btoa(...)` al guardar configuración (codificación base64). | `btoa`/`atob` no están en RN por defecto. | Usar `Buffer.from(...).toString('base64')` (polyfill) o `expo-file-system` con encoding base64. | **Medio** |
| `src/app/core/services/storage/s3/s3.service.ts:13,15` | Tipo `dataDownloadBlob { content: Blob }` para descargas de S3 (Amplify Storage). | Amplify Storage en RN devuelve distinto (Blob no nativo). El contenido `Blob` se consume para escribir archivos de config a filesystem. | Revisar el flujo de descarga de S3 en RN; convertir a base64/arraybuffer y escribir con `expo-file-system`. | **Alto** |
| `src/app/core/services/view/share.service.ts:41` | `imageDataUrl.split(',')[1]` para extraer base64 puro del data URL antes de escribir con `Filesystem.writeFile`. | Funciona si la imagen llega como data URL; pero la fuente (html-to-image) cambia. Con `react-native-view-shot` se puede pedir directamente `result: 'base64'`. | `captureRef(ref, { result: 'base64' })` y escribir con `expo-file-system`. | **Medio** |

---

## 2. Generación de imagen del reporte (`html-to-image`) — bloque crítico

**Archivo:** `src/app/core/services/view/environmental-report.service.ts`

- Importa `html-to-image` (`:13`) y lo invoca en cascada de calidad:
  - `htmlToImage.toPng(hostElement, qualitySettings)` (`:609`)
  - `htmlToImage.toPng(...)` medium fallback (`:622`)
  - `htmlToImage.toPng(...)` conservative (`:645`)
  - `htmlToImage.toJpeg(...)` último recurso (`:662`)
- Opciones usadas: `pixelRatio` (5.0 web / 4.0 móvil con fallbacks 3.0/2.0), `quality`, `backgroundColor`, `width/height` fijos (816×1200), `style.fontFamily/transform/margin/padding/boxSizing`, `cacheBust`, `skipAutoScale`, `fetchRequestInit.mode: 'cors'`, `skipFonts`, `includeQueryParams`.
- El componente a capturar (`EnvironmentalReportComponent`) se crea dinámicamente con `createComponent` + `appRef.attachView` + `changeDetectorRef.detectChanges` (`:463-527`), se inyecta en `document.body`, se espera `document.fonts.ready` (`:537`), se esperan imágenes vía `waitForImagesToLoad` (`querySelectorAll('img')`, `img.complete`, `img.onload`) (`:725-740`), y se limpia con `removeChild`/`detachView`/`destroy` (`:696-716`).

**Conecta con `share.service.ts`**: `shareReportImage(imageDataUrl, month)` toma el data URL, extrae base64, escribe a `Directory.Cache` con `@capacitor/filesystem` y comparte con `@capacitor/share` (`:32-198`).

**Implicación RN**: `html-to-image` rasteriza DOM real — **no funciona sin DOM**. El componente del reporte (`environmental-report.component.html/scss`, con gradientes y `box-shadow`) debe reescribirse como componente RN.

**Reemplazo propuesto**:
- Reescribir `EnvironmentalReportComponent` como componente RN.
- Capturar con **`react-native-view-shot`** (`captureRef(viewRef, { format: 'png', quality: 1, result: 'tmpfile' | 'base64' })`). Esto sustituye `toPng/toJpeg`, el `pixelRatio`, el montaje en `body` y la espera de fuentes/imágenes (RN captura la jerarquía nativa ya layouted).
- Compartir con **`expo-sharing`** + **`expo-file-system`** (sustituye `@capacitor/share` y `@capacitor/filesystem`).
- Eliminar: backdrop manual, `document.fonts.ready`, `getBoundingClientRect`, `waitForImagesToLoad`, fallbacks de `pixelRatio`.

**Severidad: Crítico.**

---

## 3. Gráficas Chart.js sobre `<canvas>`

**Archivo:** `src/app/components/areachart/areachart.component.ts` (+ `.html` con `<canvas #chartCanvas>` en `:2`)

- Imports de `chart.js` (`:9-26`): `BarController, BarElement, CategoryScale, Chart, ChartConfiguration, ChartData, ChartOptions, Filler, Legend, LinearScale, LineController, LineElement, PointElement, TimeScale, Title, Tooltip`.
- `import 'chartjs-adapter-date-fns'` (`:27`) — **adapter de fechas** para `TimeScale`.
- `Chart.register(...)` (`:30-43`) con todos los controladores/escalas/plugins anteriores.
- Render: `getContext('2d')` (`:143`), dimensionado manual del canvas a `container.clientWidth/clientHeight` (`:149-150`), `new Chart(ctx, config)` (`:317`).
- **Gradiente de canvas**: `ctx.createLinearGradient(0,0,0,300)` + `addColorStop` (`:161-163`) para el fill del área.
- Opciones usadas (`:220-309`): `responsive`, `interaction {mode:'index', intersect:false, axis:'x'}`, `plugins.legend.display:false`, `plugins.tooltip` (colores, `displayColors:false`, `bodyFont/titleFont`, **callbacks** `title`/`labelTextColor`/`label` con lógica de modo detallado min/max/promedio), `scales.x` (`type:'time'`, `time.unit:'day'`, `displayFormats.day:'dd/MM'`, min/max), `scales.y` (min/max).
- Datasets: modo simple y **modo detallado** con áreas min/max (`fill:'+1'`, `tension`, `pointRadius`) (`:166-214`).
- Tipos de gráfica usados: `'line'` y `'bar'` (`chartType`).

**Consumidores:** `src/app/pages/historical/historical.page.ts` (`updateChart`, `UpdateChart(...)` en `:384,399,421,434`), pasando colores, rangos x/y temporales y modo detallado.

**Implicación RN**: Chart.js requiere `<canvas>` 2D del DOM — **no existe en RN**.

**Reemplazo propuesto**:
- **`victory-native`** (v37+, sobre Skia) o **`react-native-gifted-charts`** para área/línea/barra. `victory-native` soporta gradientes (LinearGradient de Skia), escala temporal y tooltips, lo más cercano a la paridad.
- El **adapter `date-fns`** y `TimeScale` se reemplazan por formateo manual con `date-fns` (ya en deps) al construir datos del eje X.
- Los **gradientes de canvas** → `Gradient`/`LinearGradient` de la librería elegida.
- Las **callbacks de tooltip** (lógica min/max/promedio) se reimplementan como componente de tooltip custom.
- El modo detallado min/max (banda + línea promedio) se modela con áreas apiladas/superpuestas.

**Severidad: Crítico.**

---

## 4. SweetAlert2 — declarado pero NO usado

- `package.json`: `sweetalert2@^11.14.1` y `@sweetalert2/ngx-sweetalert2@^12.4.0`.
- **Búsqueda exhaustiva en `src/`**: 0 referencias a `Swal`, `sweetalert`, `SweetAlert`, `SwalDirective`, `@sweetalert2`. **No hay call sites.**
- Las alertas/modales reales usan controllers de **Ionic** y un componente propio:
  - `AlertController.create(...)`: `src/app/pages/auth/otp/otp.page.ts:192`, `src/app/pages/profile/personal-info/personal-info.page.ts:259,345`.
  - `ToastController.create(...)`: `historical.page.ts:955,1027,1069,1118,1194,1212`; `configuration.page.ts:305,319`.
  - `LoadingController`: `historical.page.ts:31`.
  - `ModalController`: usado en `alert.component.ts`, `guide-measurement.component.ts`, `register-measurement.page.ts`, `set-phone-register.page.ts`, `login.page.ts`, `measurement-detail.page.ts`.
  - Componente propio `<app-alert>` (`src/app/components/alert/alert.component.*`) que renderiza HTML dinámico vía `[innerHTML]="content"` (`alert.component.html:3`).
- **Implicación RN**: todos los controllers de Ionic (`AlertController`/`ToastController`/`LoadingController`/`ModalController`) desaparecen.

**Reemplazo propuesto**:
- `AlertController` → `Alert.alert()` de RN o modal custom.
- `ToastController` → `react-native-toast-message` / `expo` snackbar.
- `LoadingController` → estado + overlay con `ActivityIndicator`.
- `ModalController` → `<Modal>` de RN o `@gorhom/bottom-sheet` / `react-native-modal`.
- Eliminar `sweetalert2` y `ngx-sweetalert2` de dependencias (código muerto).

**Severidad: Medio** (no son DOM-only SweetAlert sino controllers de Ionic; el riesgo es de migración de UI/overlays, amplio pero mecánico). Declaración de SweetAlert2: **Bajo** (solo limpieza de deps).

---

## 5. HTML dinámico desde backend: `dompurify` + `safe-html.pipe` + `[innerHTML]`

**Pipe:** `src/app/core/pipes/safe-html.pipe.ts`
- Importa `DOMPurify` (`:3`), registra hook `uponSanitizeAttribute` que conserva `style` con `var(...)` (`:15-22`), y `DOMPurify.sanitize(value, {ALLOWED_TAGS, ALLOWED_ATTR})` (`:31-61`), luego `sanitizer.bypassSecurityTrustHtml(...)` (`:62`).
- Tags permitidos: `b,i,u,a,p,div,span,h1..h6,img,table,td,th,tr,ul,li,ol,strong,em,br,hr,style`. Attrs: `href,src,alt,title,style`.

**Call sites `[innerHTML]` (HTML dinámico renderizado):**
- `src/app/explore-container/explore-container.component.html:14` → `[innerHTML]="titleHTML"` (input `titleHTML`, `explore-container.component.ts:14`).
- `src/app/components/alert/alert.component.html:3` → `[innerHTML]="content"` (input `content`, "Contenido HTML dinámico del modal", `alert.component.ts:20`).
- `src/app/pages/measurement/measurement.page.html:85` → `[innerHTML]="item.sortName | safeHtml"`.
- `src/app/pages/measurement/guide-measurement/guide-measurement.component.html:24` → `[innerHTML]="text | safeHtml"`.
- `src/app/pages/measurement/register-measurement/register-measurement.page.html:13,22,60,141,176` → `flow.text`, `item.name`, `getMessageError(item)`, `item.name`, `getMessageError(item)` (todos `| safeHtml`).
- `src/app/pages/historical/measurement-detail/measurement-detail.page.html:41` → `[innerHTML]="item.sortName | safeHtml"`.
- `environmental-report.service.ts:509` → `backdrop.innerHTML = '<div>...'` (DOM imperativo, ver sección 1.1).

**Origen del HTML (verificado):** los campos `name`, `sortName`, `text` provienen del **modelo de configuración de mediciones** (`src/models/configuration/measurements.model.ts`: `Task.name`, `Measurement.sortName/name`, `Flow.text`, `Guide.text`). Esa configuración se **descarga desde S3 por RACIMO** y se persiste como `config.json`/`measurements.json` en filesystem (`configuration-app.service.ts`: `S3Service`, `s3.listFiles(this.pathRacimo)` `:41`, `getConfigurationMeasurement()` `:131`, `JSON.parse(...)` `:116`). **Conclusión: el HTML es contenido remoto dinámico**, no estático — por eso se sanitiza con DOMPurify.

**Implicación RN**: no existe `[innerHTML]`/`innerHTML`. El contenido HTML remoto debe renderizarse con un parser nativo.

**Reemplazo propuesto**:
- **`react-native-render-html`** (o `@native-html/...`) para renderizar el HTML remoto de mediciones/guías/flujos. Soporta `b/i/u/a/p/img/table/ul/li/...`.
- **Sanitización**: `dompurify` también es DOM-dependiente (necesita `window`/`DOMParser`). Sustituir por `sanitize-html` (funciona en JS puro/Node) o `dompurify` + `jsdom` no es viable en RN. Conservar la **misma allowlist** de tags/attrs por seguridad antes de pasar a `react-native-render-html`.
- `style="var(--x)"` inline ya no aplica (sin CSS vars): mapear a estilos del tema RN.

**Severidad: Alto** (contenido viene del backend y atraviesa muchas pantallas: mediciones, guías, flujos, alertas, detalle histórico).

---

## 6. CSS imposible o difícil en React Native

> RN no soporta: `backdrop-filter`, `filter`, gradientes nativos sin librería, `position: fixed`, `vh/vw`, `@keyframes`, selectores/pseudo-elementos (`::part`, `::before`). Todo el SCSS se reescribe a `StyleSheet`.

### 6.1 `backdrop-filter` / `filter` (blur, drop-shadow)
| Ubicación | Declaración | Reemplazo RN | Severidad |
|---|---|---|---|
| `src/global.scss:71` | `backdrop-filter: blur(25px)` | `expo-blur` (`<BlurView>`). | **Alto** |
| `src/app/pages/splash-animation/splash-animation.page.scss:21` | `backdrop-filter: blur(25px)` | `expo-blur`. | **Medio** |
| `src/app/pages/measurement/register-measurement/register-measurement.page.scss:140,152` | `backdrop-filter: blur(20px)` (en `::part(backdrop)`/`::part(content)` de `ion-modal`) | `expo-blur` sobre el overlay del modal RN; los `::part()` de Ionic desaparecen. | **Alto** |
| `src/app/pages/measurement/register-measurement/register-measurement.page.scss:145` | `filter: blur(5px)` (clase `.blur`) | `expo-blur` o no soportado; aproximar con overlay. | **Medio** |
| `src/app/components/header/header.component.scss:44` | `filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.1))` | `shadowColor/shadowOffset/shadowRadius` (iOS) + `elevation` (Android). | **Medio** |

### 6.2 Gradientes lineales
| Ubicación | Reemplazo RN | Severidad |
|---|---|---|
| `src/global.scss:101-104` (`&_gradient` → `linear-gradient(180deg, ...)`) | `expo-linear-gradient` (`<LinearGradient>`). | **Medio** |
| `src/app/explore-container/explore-container.component.scss:1` (`.card-content_gradient`) | `expo-linear-gradient`. | **Medio** |
| `src/app/components/environmental-report/environmental-report.component.scss:52,96,178,258,289,348` (6 `linear-gradient`) | `expo-linear-gradient` dentro del componente de reporte RN (afecta sección 2). | **Alto** (forma parte de la imagen del reporte) |

### 6.3 `@keyframes` / `animation`
| Ubicación | Uso | Reemplazo RN | Severidad |
|---|---|---|---|
| `src/app/app.component.scss:21,25` | `animation: slideUp 3s forwards` + `@keyframes slideUp` (splash slide). | `react-native-reanimated` / `Animated`. | **Medio** |
| `src/app/pages/historical/historical.page.ts:1279` | `@keyframes spin` inyectado en JS (loader manual). | Eliminar (usar `ActivityIndicator`). | **Alto** (parte del loader DOM, sección 1.1) |

### 6.4 `position: fixed`
| Ubicación | Reemplazo RN | Severidad |
|---|---|---|
| `src/global.scss:81` | RN usa `position: 'absolute'` (no `fixed`); overlays a pantalla completa con `StyleSheet.absoluteFill` o `<Modal>`. | **Medio** |
| `src/app/pages/profile/achievement/achievement.page.scss:38` | `position: 'absolute'` / componente flotante. | **Bajo** |
| `src/app/pages/profile/alerts/alerts.page.scss:182` | idem. | **Bajo** |
| `src/app/pages/profile/personal-info/personal-info.page.scss:367` | idem. | **Bajo** |

### 6.5 Unidades `vh` / `vw`
| Ubicación | Declaración | Reemplazo RN | Severidad |
|---|---|---|---|
| `src/global.scss:75,76,77` | `height:100vh; width:100vw; padding:5vw` | `Dimensions.get('window')` / `useWindowDimensions()` o `flex:1`. | **Medio** |
| `src/app/components/alert/alert.component.scss:9` | `--max-height: 80vh` | `Dimensions` × 0.8. | **Bajo** |
| `src/app/pages/auth/register/register-completed/register-completed.page.scss:3` | `top: 20vh` | `Dimensions` × 0.2. | **Bajo** |
| `src/app/pages/historical/historical.page.scss:72` | `max-width: 28vw` | `Dimensions` × 0.28. | **Bajo** |

---

## 7. Artefactos PWA / browser / CDN

| Ubicación | Hallazgo | Implicación RN | Severidad |
|---|---|---|---|
| `src/manifest.webmanifest` | Manifest PWA **presente pero huérfano**: no está referenciado en `angular.json` ni en `src/index.html` (verificado con grep). | Artefacto muerto; eliminar en migración. | **Bajo** |
| `src/index.html:28-35` | ionicons cargado por `<script>` desde **`https://unpkg.com/ionicons@7.1.0/...`** (CDN externo, dependencia de red). Además `index.html` tiene **dos `<body>` duplicados** (`:26-40`). | En RN se usan íconos empaquetados (`@expo/vector-icons` / SVGs locales en `src/assets/icons/`). Sin CDN. | **Medio** (íconos) |
| `src/index.html`, `src/main.ts`, `src/polyfills.ts`, `src/zone-flags.ts`, `src/global.d.ts`, `src/test.ts` | Bootstrap web de Angular (zone.js, polyfills, `index.html`, Karma). | Todo el bootstrap se reemplaza por Expo/`App.tsx` + React Navigation. | **Bajo** (se reemplaza wholesale) |
| `alert(...)` global | `historical.page.ts:1188,1225`, `profile.page.ts:211` — `alert()` del navegador como último recurso. | No existe en RN. | `Alert.alert()` de RN. | **Bajo** |

**No encontrado (verificado, ausencia explícita):** `iframe`, `service worker` / `serviceWorker` / `workbox` / `ngsw`, `localStorage`/`sessionStorage` (se usa `@capacitor/preferences`), `XMLHttpRequest`, `fetch()` directo en `src/`, `IntersectionObserver`/`ResizeObserver`/`MutationObserver`/`matchMedia`, `new Notification()` (las notificaciones usan `@capacitor/local-notifications`), `geolocation`.

---

## 8. Plugins Capacitor (contexto — no DOM, pero parte de la migración de plataforma)

Aunque no son DOM-only, todos los `@capacitor/*` se reemplazan en RN (Expo). Importados en `src/`:
`@capacitor/core`, `@capacitor/app`, `@capacitor/preferences`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/device`, `@capacitor/clipboard`, `@capacitor/local-notifications`. (También en `package.json`: haptics, keyboard, network, splash-screen, status-bar.)

Equivalentes Expo: `expo-file-system`, `expo-sharing`/`Share`, `expo-device`, `expo-clipboard`, `expo-notifications`, `AsyncStorage`/`expo-secure-store` (Preferences), `expo-haptics`, `expo-network`, `expo-splash-screen`, `expo-status-bar`, `BackHandler`/`AppState` (`@capacitor/app`).

> Detalle completo de Capacitor queda **fuera del alcance** de este documento (foco: web/DOM-only). Listado aquí solo como inventario.

---

## Acotaciones de alcance (lo que quedó fuera)

- **Inventario completo de Capacitor**: enumerado pero no analizado en profundidad (no es DOM-only). Sección 8.
- **AWS Amplify/DataStore/Cognito/AppSync**: portable como lógica TS; su migración (config de Amplify v6 en RN, DataStore en RN) no es DOM-only y se trata en otro documento de descubrimiento.
- **`box-shadow`** se listó solo donde coincide con secciones relevantes (header, reporte); su mapeo a `shadow*`/`elevation` es mecánico y repetitivo a lo largo de muchos SCSS — no se enumeró cada ocurrencia.
- **Archivos `.spec.ts`** (tests Jasmine/Karma): contienen `HTMLElement`/`querySelector` (`environmental-report.component.spec.ts:46,47`) pero se reemplazan junto con el framework de test (Jest + RN Testing Library); no son código de producción.

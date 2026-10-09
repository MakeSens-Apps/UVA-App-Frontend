# Inventario de componentes y pipes — Discovery (Fase 1)

> Migración Ionic/Angular 18 → React Native (Expo + Development Builds, React Navigation).
> Este documento es la **especificación de re-implementación** de cada componente reutilizable y pipe.
> Todas las afirmaciones llevan referencia `archivo:línea`.

## Alcance cubierto

Componentes en `src/app/components/**`, `src/app/explore-container/`, pipes en `src/app/core/pipes/`, además de "pseudo-componentes" relevantes para la UI: `AlertComponent` presentado vía `ModalController`, `EnvironmentalReportComponent` renderizado en modo headless para generar imágenes, y los `AlertController`/`ToastController`/`LoadingController` de Ionic usados directamente desde páginas.

**SweetAlert2 / `Swal`**: NO existe ninguna referencia a `sweetalert2` ni `Swal` en `src/app` (verificado con grep, 0 coincidencias). El patrón de "alerta como pseudo-componente" en esta app se implementa con `AlertComponent` (modal propio) y con los controladores nativos de Ionic. La mención a SweetAlert2 en `.claude/CLAUDE.md` no se materializa en el código fuente.

**Componentes fuera del alcance estricto pero relevantes**: existen 3 componentes definidos dentro de carpetas de páginas (no en `src/app/components/`) que son "component-like" (selector `app-*`, `@Input`):
- `app-guide-measurement` (`src/app/pages/measurement/guide-measurement/guide-measurement.component.ts:20`)
- `app-time-frame` (`src/app/pages/historical/time-frame/time-frame.component.ts:11`)
- `app-sync-action` (`src/app/pages/profile/configuration/sync-action/sync-action.component.ts:11`)

Se documenta `guide-measurement` por ser consumidor directo de `SafeHtmlPipe` y modal reutilizable; `time-frame` y `sync-action` se listan pero su API completa pertenece al inventario de páginas (no se detalla aquí para no salir del alcance; quedaron fuera deliberadamente).

Inventario verificado de selectores (`grep "selector: 'app-"`): `app-root`, `app-alert`, `app-areachart`, `app-calendar`, `app-day`, `app-environmental-report`, `app-header`, `app-moon-card`, `app-progress-bar`, `app-explore-container`, `app-time-frame`, `app-guide-measurement`, `app-sync-action`.

---

## Tabla resumen

| Componente | Archivo | Inputs | Outputs | Ionic interno | Lógica no trivial | Dependencia DOM/web |
|---|---|---|---|---|---|---|
| AlertComponent | components/alert | 7 | — (usa ModalController) | IonCard, IonContent, IonButton | innerHTML dinámico; rol de botón vía dismiss | `[innerHTML]`, ModalController |
| AreachartComponent | components/areachart | 12 | — (método `UpdateChart`) | ninguno (canvas) | Chart.js (gradiente, tooltips, eje tiempo, detailedMode) | `<canvas>`, `getContext('2d')`, ElementRef |
| CalendarComponent | components/calendar | 11 (+setters) | dayClick | IonicModule, ion-card-content | cálculo mes/semana con date-fns; estados día; iconos luna | ng-content slots (header/footer) |
| DayComponent | components/calendar/day | 7 | — | IonIcon | ngClass por estado; icono condicional | IonIcon con `src` (SVG) |
| EnvironmentalReportComponent | components/environmental-report | 2 | — | ninguno | tabla HTML 2 columnas (días 1-15 / 16-31); format helpers | `<table>`, `<img onerror>`, render headless |
| HeaderComponent | components/header | 6 | — | IonHeader, IonToolbar, IonChip, IonAvatar, IonLabel, IonButtons, IonButton, IonIcon | fallback seed vía DataStore en ngOnInit; navegación Router | Router (Angular) |
| MoonCardComponent | components/moon-card | 5 (1 setter) | — | IonicModule (IonImg, IonIcon) | mapeo fase→icono/nombre vía objeto | IonImg con SVG |
| ProgressBarComponent | components/progress-bar | 2 | — | IonProgressBar | `value = current/total` | — |
| ExploreContainerComponent | explore-container | 6 | — | IonicModule (IonImg, IonThumbnail), ReactiveFormsModule | render condicional title/titleHTML/icon; ng-content | `[innerHTML]` |
| SafeHtmlPipe | core/pipes | (pipe) | — | — | DOMPurify + DomSanitizer; hook style var() | DOMPurify, DomSanitizer (web-only) |
| GuideMeasurementComponent | pages/measurement/guide-measurement | 2 | — (ModalController) | IonImg, IonIcon, IonCheckbox, IonButton | carga imágenes async; texto array/HTML; usa SafeHtmlPipe | ModalController |

---

## 1. AlertComponent (`app-alert`)

**Archivos**: `src/app/components/alert/alert.component.ts`, `.html`, `.scss`.

### API (todos los `@Input`)
Referencia: `alert.component.ts:20-26`
| Input | Tipo | Default | Uso |
|---|---|---|---|
| `content` | `string` | `''` | HTML dinámico inyectado vía `[innerHTML]` (`alert.component.html:3`) |
| `ShowCancelButton` | `boolean` | `true` | Muestra/oculta el botón cancelar (`html:8`) |
| `textCancelButton` | `string` | `''` | Texto del botón cancelar (`html:13`) |
| `textOkButton` | `string` | `''` | Texto del botón aceptar (`html:17`) |
| `reverseButton` | `boolean` | `false` | Invierte `flex-direction` del contenedor de botones (`html:6`) |
| `bordersInCancelBtn` | `boolean` | `true` | `fill='outline'` vs `'clear'` en cancelar (`html:10`) |
| `colorBtn` | `string` | `'uva_blue-500'` | Color de los botones Ionic (`html:11,16`) |

### Salida (no es @Output)
No usa `@Output`. Devuelve resultado vía `ModalController.dismiss({ action: button })` donde `button ∈ {'OK','CANCEL'}` (`alert.component.ts:41-53`, `html:11,16`).

### Componentes Ionic internos
`IonCard`, `IonContent`, `IonButton` (`alert.component.ts:5-9,15`). Nota: `IonContent` se importa pero NO aparece en el template (`html` usa `<ion-card>` + `<div>`); es import muerto.

### DOM/web
- `[innerHTML]="content"` — render de HTML arbitrario (`html:3`). En RN no existe innerHTML; requiere `react-native-render-html` o equivalente, o pasar el contenido como nodos.
- Encapsulación `ViewEncapsulation.None` (`alert.component.ts:17`) → los estilos en `.scss` son globales (afectan `ion-modal`, `.custom-modal_recover-series`, etc.).

### Cómo se usa (consumidores)
Se presenta SIEMPRE como modal vía `ModalController.create({ component: AlertComponent, componentProps: {...}, cssClass: 'custom-modal', backdropDismiss: false })`. Consumidores:
- `src/app/pages/auth/login/login.page.ts:100,151` (confirmar teléfono y "no registrado"; lee `data.data.action === 'OK'` en `onDidDismiss`, `login.page.ts:114,168`).
- `src/app/pages/auth/register/set-phone-register/set-phone-register.page.ts`
- `src/app/pages/historical/measurement-detail/measurement-detail.page.ts`
- `src/app/pages/profile/alerts/alerts.page.ts`

**Migración RN**: re-implementar como un componente Modal controlado (estado abierto/cerrado) que resuelve una Promise con `'OK' | 'CANCEL'`. El `content` HTML debe convertirse a render-html o reestructurarse. Ojo: los `componentProps` pasan HTML embebido con `<p>`, `<strong>`, `<h3>` (ej. `login.page.ts:102-104,153-156`).

---

## 2. AreachartComponent (`app-areachart`)

**Archivos**: `src/app/components/areachart/areachart.component.ts`, `.html`, `.scss`.

### API (`@Input`)
Referencia: `areachart.component.ts:64-122`
| Input | Tipo | Default |
|---|---|---|
| `chartData` | `number[]` | `[]` |
| `chartLabels` | `string[]` | `[]` |
| `background` | `string` (hex) | `'#FBA641'` |
| `borderColor` | `string` (hex) | `'#FBA641'` |
| `chartType` | `ChartConfiguration['type']` | `'line'` |
| `ymax` | `number \| undefined` | `undefined` |
| `ymin` | `number \| undefined` | `undefined` |
| `xmin` | `string \| undefined` | `undefined` |
| `xmax` | `string \| undefined` | `undefined` |
| `detailedMode` | `boolean` | `false` |
| `chartMinData` | `number[]` | `[]` |
| `chartMaxData` | `number[]` | `[]` |

### API imperativa (`UpdateChart`)
`UpdateChart(labels?, data?, background?, borderColor?, newType='line', ymin?, ymax?, xmin?, xmax?, detailedMode?, minData?, maxData?)` (`areachart.component.ts:337-367`). Destruye el chart previo (`this.chart.destroy()`, `:364`) y lo recrea. Los consumidores llaman esto vía `@ViewChild` en vez de re-bindear inputs: `historical.page.ts:384,399,421,434`.

### Lógica no trivial — configuración Chart.js
- **Registro manual de módulos** Chart.js (tree-shaking): `CategoryScale, LinearScale, PointElement, LineElement, BarElement, LineController, BarController, Filler, Title, Tooltip, Legend, TimeScale` (`:30-43`). Usa `chartjs-adapter-date-fns` para el eje de tiempo (`:27`).
- **Dimensionado manual del canvas**: ajusta `canvas.width/height` al `clientWidth/clientHeight` del contenedor padre (`:144-151`). Dependencia directa del DOM.
- **Gradiente**: si `bar` → color sólido `borderColor`; si línea → `ctx.createLinearGradient(0,0,0,300)` con stops `hexToRgba(background,0.8)` → `(…,0.2)` (`:157-164`).
- **detailedMode** (solo `line`): construye 3 datasets — "Rango Máximo" (`fill:'+1'`, bg `hexToRgba(background,0.6)`), "Rango Mínimo" (transparente, sirve de límite de relleno), y "Promedio" (línea con `borderColor`) (`:168-202`). El área se rellena ENTRE max y min.
- **Modo normal**: 1 dataset con `fill:true` y gradiente (`:204-214`).
- **Opciones**: `interaction.mode:'index'`, leyenda oculta, tooltip blanco con callbacks personalizados:
  - `title`: formatea `context[0].parsed.x` como fecha `dd/MM/yyyy` es-ES (`:245-252`).
  - `labelTextColor`: colorea "Promedio:" con `borderColor` en detailedMode (`:253-263`).
  - `label`: en detailedMode muestra `Máximo/Mínimo/Promedio`; si todos iguales solo "Promedio"; en modo normal `Promedio: y` (`:264-288`).
- **Escalas**: `x` tipo `'time'` con `unit:'day'`, `displayFormats.day:'dd/MM'`, `min:xmin/max:xmax`; `y` con `min:ymin/max:ymax` (`:292-308`).
- `hexToRgba(hex, alpha)` helper (`:375-380`).
- `getMonthStartAndEnd(dateString)` helper privado (`:386-424`) — calcula primer/último día del mes; aparenta NO usarse internamente (no hay llamadas en el archivo). Verificar antes de migrar.

### Dependencias DOM/web
- `<canvas #chartCanvas>` + `getContext('2d')` (`html:2`, `ts:143`). Chart.js depende de Canvas 2D del navegador.
- `ngAfterViewInit` → `createChart()` (`:133-135`).

**Migración RN**: Chart.js no funciona en RN sin un WebView. Opciones: `react-native-chart-kit`, `victory-native`, o Chart.js dentro de `react-native-webview`. Toda la lógica de datasets/tooltips/gradiente/detailedMode debe re-mapearse a la librería elegida. El contrato imperativo `UpdateChart` se reemplaza por props reactivas. CSS: contenedor fijo `300px` (`areachart.component.scss:2`).

### Consumidores
`src/app/pages/historical/historical.page.html:92-95` y `historical.page.ts` (binding `background`/`borderColor` desde `variables[0].style`, y llamadas imperativas `UpdateChart`).

---

## 3. CalendarComponent (`app-calendar`)

**Archivos**: `src/app/components/calendar/calendar.component.ts`, `.html`, `.scss`.
Exporta la interfaz `calendar` (`calendar.component.ts:16-36`): `{ date: Date|null, dayOfMonth: number|null, dayOfWeek: number|null, state?: 'today'|'complete'|'incomplete'|'future'|'normal'|'saveStreak'|'none'|undefined, icon?: string|null }`.

### API (`@Input` / setters)
Referencia: `calendar.component.ts:54-132`
| Input | Tipo | Default | Notas |
|---|---|---|---|
| `title` | `string` | `'Enero'` | Título opcional (`html:10`) |
| `typeCalendar` | `string` | `'normal'` | `'normal'` o `'moon'` (`html:13,31`) |
| `calendarView` | `string` | `'month'` | `'month'` o `'week'` (`ts:173-177`) |
| `IsMini` | `boolean` | `false` | Modo compacto (estilos mini) |
| `hasHeader` | `boolean` | `false` | Activa slot `[header]` (`html:2-4`) |
| `hasTitle` | `boolean` | `false` | Muestra `title` (`html:9`) |
| `viewDate` | `Date` | `new Date()` | Mes/semana a renderizar |
| `daysComplete` | `number[]` (setter) | `[]` | Setter dispara `generateCalendars()` (`ts:95-99`) |
| `daysIncomplete` | `number[]` (setter) | `[]` | Setter dispara `generateCalendars()` (`ts:117-121`) |
| `daysSaveStreak` | `number[]` | `[]` | (`ts:131`) |
| `phaseMoonDays` | `{day:number; status:string}[]` (setter) | `[]` | Setter dispara `generateCalendars()` (`ts:143-147`) |

Propiedad pública no-input: `today = new Date().getDate()` (`ts:91`), `calendar: calendar[]` (estado renderizado, `ts:57`), `icon` (ruta SVG por defecto, `ts:157`).

### Outputs
`@Output() dayClick = new EventEmitter<calendar | null>()` (`ts:132`). Emite el objeto `calendar` del día clickeado (`ts:323-325`, `html:27`). Consumido por `home.page` y `historical.page` como `(dayClick)="goToDetail($event)"`.

### Slots (ng-content)
- `<ng-content select="[header]">` (solo si `hasHeader`) — `html:3`.
- `<ng-content select="[footer]">` — `html:52`.
Ejemplo de uso del slot header con `<section header>...</section>` en `home.page.html:13-24`.

### Lógica no trivial (date-fns)
- `generateCalendars()` decide mes vs semana (`ts:172-178`).
- **Mes** (`generateCalendarMonth`, `ts:185-236`): usa `getDaysInMonth`, `getDay(startOfMonth(viewDate))` para celdas vacías iniciales (días antes del 1°), luego `eachDayOfInterval(startOfMonth..+daysInMonth-1)`. Por cada día calcula `state` e `icon` (si `moon`).
- **Semana** (`generateCalendarWeek`, `ts:292-316`): `startOfWeek/endOfWeek` con `weekStartsOn: 0` (domingo). Mapea cada día a `{date, dayOfMonth, dayOfWeek, state}`.
- **getStatus(day)** (`ts:243-254`): prioridad `saveStreak` > `complete` > `incomplete` > `normal`. Estado por número de día (no por fecha completa).
- **state por día** (`ts:225-231`, `:307-313`): `isToday`→`'today'`; si `moon`→`'none'`; `isFuture`→`'future'`; si no `getStatus(day)`.
- **setIconPhase(phase)** (`ts:274-286`): mapea fase lunar→ruta SVG: `new-moon→Moon/new.svg`, `waning-crescent→Moon/Gibosa_crescent.svg`, `first-quarter→Moon/crescent.svg`, `full-moon→Moon/full.svg`, `last-quarter→Moon/declining.svg`, `waning-gibbous→Moon/Gibosa_declining.svg`.
- Cabecera de días hardcodeada en español de 1 letra: `['D','L','M','M','J','V','S']` (`html:18,35`).
- Diseño con CSS Grid `repeat(7,1fr)` (`calendar.component.scss:5-6`). Modo `moon` con fondo azul (`scss:63-76`); modo `mini` (`scss:39-58`).

### DOM/web
- `IonicModule` + `<ion-card-content>` (`html:12`). Sin acceso directo al DOM más allá de los slots.

### Consumidores
- `home.page.html:5-25` (week, hasHeader, slots, dayClick).
- `historical.page.html:80-87` (month, viewDate, dayClick) y `historical.page.html:199-209`.
- `moon-phase.page.html:16-17` (`typeCalendar="moon"`, `phaseMoonDays`).

**Migración RN**: re-implementar grid 7 columnas con `View`/`FlatList`. `date-fns` es reutilizable tal cual (JS puro). Reemplazar slots `ng-content` por props `renderHeader`/`renderFooter` o children. Los SVG de luna deben pasar por `react-native-svg`.

---

## 4. DayComponent (`app-day`)

**Archivos**: `src/app/components/calendar/day/day.component.ts`, `.html`, `.scss`, `.mixin.scss`.

### API (`@Input`)
Referencia: `day.component.ts:22-75`
| Input | Tipo | Default |
|---|---|---|
| `day` | `number` | `0` |
| `isMiniCalendar` | `boolean` | `false` |
| `state` | `'complete'\|'incomplete'\|'future'\|'normal'\|'today'\|'saveStreak'\|'none'\|undefined` | `'normal'` |
| `icon` | `string\|null\|undefined` | `'./../../../../assets/images/icons/checkSaveStreak.svg'` |
| `customIcon` | `boolean` | `false` |
| `iconPosition` | `'top'\|'bottom-left'` | `'bottom-left'` |
| `isMoonCalendar` | `boolean` | `false` |

### Lógica de render
- Día con cero a la izquierda: `day < 10 ? '0'+day : day` (`html:16`).
- Icono mostrado si `state==='complete'` o `'saveStreak'` o `customIcon` (`html:18`). `src` condicional: complete→`check.svg`, saveStreak→`checkSaveStreak.svg`, else `icon` (`html:19-25`).
- `ngClass` por estado mapeando a clases CSS: `complete, current(today), incomplete, future, normal, saveStreak, mini, none, isMoonCalendar` (`html:3-13`).
- Estilos por estado en `day.component.scss` (colores `--Colors-Blue-600/700/900`, círculo `border-radius:50%`, `today` con borde punteado, `incomplete` con borde sólido). Mixin `dayCalendar` define caja 40×40 (`day.mixin.scss:1-11`).

### DOM/web
`<ion-icon [src]="...">` carga SVG (`html:17`). Importa `IonicModule` (`ts:14`).

### Consumidores
- Dentro de `CalendarComponent` (`calendar.component.html:23-28,40-47`).
- `measurement-detail.page.html:12` (`[day]`, `[state]`).

**Migración RN**: celda `View` circular con `Text`; icono via `react-native-svg`/`Image`. `state` → estilos condicionales.

---

## 5. EnvironmentalReportComponent (`app-environmental-report`)

**Archivos**: `src/app/components/environmental-report/environmental-report.component.ts`, `.html`, `.scss` (487 líneas).
Exporta interfaces `DayData` y `ReportData` (`ts:4-39`) — modelos de negocio reutilizables.

### API (`@Input`)
| Input | Tipo | Default | Ref |
|---|---|---|---|
| `reportData` | `ReportData` (required) | — | `ts:49` |
| `forcePrintLayout` | `boolean` | `false` | `ts:50` |

`ReportData` = `{ month, farmName, monitorName, days: DayData[], summary: { totalRainfall, rainyDays, temperature:{max,min,avg}, humidity:{max,min,avg} } }`.
`DayData` = `{ day:{tempMax,tempMin,humMax,humMin}, night:{...}, rainfall }` (todos `number|null`).

### Lógica no trivial — armado de la tabla
- **Dos columnas**: `getFirstHalfDays()` = `days.slice(0,15)` (días 1-15), `getSecondHalfDays()` = `days.slice(15)` (días 16-31) (`ts:56-66`). Render en dos `<table>` lado a lado (`html:52-153`).
- **Doble fila por día**: cada día genera 2 `<tr>` (medición "día/mañana" y "noche/tarde"). El número de día usa `rowspan="2"` y la lluvia también `rowspan="2"` (`html:74-96`). `getDayNumber(index, startDay)` = `startDay+index` (1 o 16) (`ts:74-76`).
- **Cabeceras anidadas**: `Temperatura (°C)` y `Humedad (%)` con `colspan="2"` sobre subcolumnas Max/Min; `Día` y `Lluvia (mm)` con `rowspan="2"` (`html:55-67`).
- **Formateadores**:
  - `formatRainfall(n)`: `null`→`'-'`; `>0`→string; `0`→`'-'` (`ts:83-88`).
  - `formatValue(n)`: `null`→`'-'`; else `toFixed(1)` (`ts:95-100`).
- **Sección resumen** (`html:158-228`): tarjeta de lluvia (total acumulado + días con lluvia) y tabla resumen Temp/Humedad (Máximo/Mínimo/Promedio).
- **Branding**: logos `assets/icon-only.png`, `assets/images/logo_Natura_Isagen.png`, `assets/images/logo_Makesens.svg`, todos con `onerror="this.style.display='none'"` (`html:11-26,236`) — atributo HTML inline NO portable a RN.

### CSS / Layout (web-only)
- Ancho fijo **816px** = 8.5in × 96dpi (`scss:3`), pensado para imagen tamaño carta.
- `&.force-print-layout` fuerza grids con `!important` (`scss:16-39`).
- Grids: tablas `1fr 1fr` (`scss:149-150`), resumen `300px 1fr` (`scss:275-276`), info header `1fr 1fr 1fr` (`scss:115-116`).
- `@media print` (`scss:399`) y `@media (max-width:900px)` que colapsa a 1 columna (`scss:407-443`).

### Render headless para generar imagen (crítico)
Este componente NO se monta en ninguna página. Se instancia dinámicamente desde `EnvironmentalReportService` (`src/app/core/services/view/environmental-report.service.ts`) para producir un PNG:
- `createComponent(EnvironmentalReportComponent, { environmentInjector })` + set `reportData` y `forcePrintLayout=true`, `attachView`, `detectChanges` (`service:463-473`).
- Inserta el host en `document.body` fuera de pantalla (`zIndex:-1000`, `position:fixed`), crea un backdrop "Generando reporte…", fija `width:816px` (`service:476-524`).
- Espera render (`setTimeout 1500ms`), `document.fonts.ready` (timeout 3s), `waitForImagesToLoad` (`service:530-549,725-756`).
- Genera PNG con `html-to-image` (`htmlToImage.toPng`), con settings por plataforma (`pixelRatio` 5.0 web / 4.0 móvil) y cascada de fallbacks hasta JPEG (`service:557-681`). Detecta plataforma vía `(window as any).Capacitor` (`service:557-558`).
- Limpieza en `finally`: remueve backdrop, host y `destroy()` (`service:694-717`).

### Dependencias DOM/web (bloqueantes)
`createComponent`/`ApplicationRef.attachView`, `document.body.appendChild`, `document.fonts.ready`, `html-to-image`, `<table>`, `<img onerror>`, CSS Grid + `@media print`. Todo esto es **web/DOM puro**, inviable en RN.

### Consumidores
Solo `environmental-report.service.ts` (generación de imagen de reporte mensual). Llamado para compartir/descargar el reporte.

**Migración RN**: enfoque completamente distinto. Opciones: (a) renderizar el reporte con `react-native-view-shot` capturando una `View` nativa que reproduzca la tabla; (b) generar PDF/PNG con `expo-print` desde una plantilla HTML (reusable el HTML actual) y `expo-sharing`. La lógica de cálculo en `environmental-report.service.ts` (`processDailyData`, `processDayMeasurements`, `calculatePeriodStats`, `calculateTotalRainfall`, `calculateSummary`, agrupación mañana<12h/tarde≥12h, parsing de `data` con claves `TEMPERATURA_MAX/MIN`, `HUMEDAD_MAX/MIN`, `PRECIPITACION` + variaciones) es JS reutilizable (`service:161-447`).

---

## 6. HeaderComponent (`app-header`)

**Archivos**: `src/app/components/header/header.component.ts`, `.html`, `.scss`.

### API (`@Input`)
Referencia: `header.component.ts:41-70`
| Input | Tipo | Default |
|---|---|---|
| `title` | `string` | `'Inicio'` |
| `seed` | `number\|null\|undefined` | `undefined` |
| `hasBackButton` | `boolean` | `false` |
| `routerBackButton` | `string` | `'/'` |
| `hasProfileButton` | `boolean` | `true` |
| `hasCenterTitle` | `boolean` | `false` |

### Lógica no trivial
- `ngOnInit` async: si `seed` no fue provisto, lo obtiene de `UserProgressDSService.getLastUserProgress()` (DataStore) (`ts:95-102`). **Acoplamiento a la capa de datos** dentro de un componente de UI.
- `goToProfile()` → `router.navigate(['/profile'])` (`ts:85-87`).
- `goBack(url)` → `router.navigate([url])`; contiene un `if (url=='/login')` con comentario "lógica de deslogueo" SIN implementar (`ts:109-114`).
- Chip de perfil muestra `seed` + icono `semilla.svg` + avatar `user-circle.svg` (`html:15-24`).

### Componentes Ionic internos
`IonHeader`, `IonToolbar` (`color="uva_blue-500"`), `IonChip`, `IonAvatar`, `IonLabel`, `IonButtons`, `IonButton`, `IonIcon` (`ts:24-33`, `html:1-28`). Back button usa `ion-icon name="arrow-back-outline"` (`html:7`).

### DOM/web
`Router` de Angular (navegación). `<img>` para avatar. SVGs por `src`.

### Consumidores (8 páginas)
`home`, `measurement`, `register-measurement`, `moon-phase`, `historical`, `measurement-detail` (ver grep). Ejemplos: `home.page.html:1` (`[seed]`), `measurement.page.html:1-4`, `moon-phase.page.html:1-6` (`title`, `hasBackButton`, `routerBackButton`, `seed`).

**Migración RN**: reemplazar por header de React Navigation (`headerTitle`, `headerLeft`) o componente propio. El fallback de `seed` vía DataStore debe extraerse a un hook/contexto (no debería vivir en el header). Navegación `router.navigate` → `navigation.navigate`. El `goBack` con lógica de logout incompleta es deuda técnica a resolver.

---

## 7. MoonCardComponent (`app-moon-card`)

**Archivos**: `src/app/components/moon-card/moon-card.component.ts`, `.html`, `.scss`.
Exporta `LUNAR_PHASE_NAME` (`ts:15-22`). Constante interna `LUNAR_PHASE` mapea fase→ruta SVG (`ts:5-12`).

### API (`@Input`)
Referencia: `moon-card.component.ts:40-75`
| Input | Tipo | Default | Notas |
|---|---|---|---|
| `background` | `'gray'\|'green'` | `'gray'` | `'green'`→fondo azul (`html:2`, `scss:18-20`) |
| `phase` (setter) | `keyof typeof LUNAR_PHASE` (`NEW_MOON\|FIRST_QUARTER\|WANING_GIBBOUS\|FULL_MOON\|WANING_CRESCENT\|LAST_QUARTER`) | — | Setter actualiza `phaseName` y `phaseIcon` (`ts:53-57`); si falsy→`'NEW_MOON'` |
| `phaseName` | `string` | `LUNAR_PHASE_NAME[_phase]` (default FULL_MOON) | Puede override directo |
| `phaseIcon` | `string` | `LUNAR_PHASE[_phase]` | Ruta SVG |
| `hasArrow` | `boolean` | `true` | Flecha `arrow-forward-outline` (`html:14-16`) |

Estado interno `_phase: keyof typeof LUNAR_PHASE = 'FULL_MOON'` (`ts:47`). Posible bug: el setter `phase` asigna `_phase` con fallback `'NEW_MOON'` pero asigna `phaseName/Icon` con `LUNAR_PHASE_NAME[_phase]`/`LUNAR_PHASE[_phase]` usando el parámetro de entrada sin el fallback (`ts:53-57`); si `_phase` es undefined, name/icon quedarían undefined. Documentar para migración.

### Mapeo fase→SVG (`ts:5-12`)
`NEW_MOON→Moon/nueva.svg`, `FIRST_QUARTER→Moon/cuarto_creceiente.svg`, `WANING_GIBBOUS→Moon/gibosa_menguante.svg`, `FULL_MOON→Moon/llena.svg`, `WANING_CRESCENT→Moon/gibosa_creciente.svg`, `LAST_QUARTER→Moon/cuarto_menguante.svg`. Nombres ES en `LUNAR_PHASE_NAME`.

### DOM/web e Ionic
`<ion-img>` para luna y eclipses (`html:3,19-22`), `<ion-icon name="arrow-forward-outline">` (`html:15`). Imagen decorativa `eclipses_card_home .svg` (con espacio en el nombre del archivo — `html:21`). Importa `IonicModule` (`ts:33`).

### Consumidores
`home.page.html:64` (`[phase]`, click→`goToMoonCalendar()`), `moon-phase.page.html:10-14` (`background="green"`, `[phase]`, `[hasArrow]="false"`).

**Migración RN**: `View` con `Image` (SVG via `react-native-svg`). El click es un `onPress` del card completo (no hay @Output; los consumidores usan `(click)` sobre el host). Conservar el mapeo de constantes JS tal cual.

---

## 8. ProgressBarComponent (`app-progress-bar`)

**Archivos**: `src/app/components/progress-bar/progress-bar.component.ts`, `.html`, `.scss`.

### API (`@Input`)
Referencia: `progress-bar.component.ts:16-18`
| Input | Tipo | Default |
|---|---|---|
| `currentProgress` | `number` | `0` |
| `totalProgress` | `number` | `1` |

### Lógica
Texto `Progreso: {current} de {total}` (`html:2-4`). `<ion-progress-bar type="determinate" [value]="currentProgress / totalProgress" color="uva_green-500">` (`html:5-9`). Riesgo de división por cero si `total=0` (default 1 lo evita).

### Ionic / DOM
`IonProgressBar` (`ts:13`). Sin DOM directo. Altura 7px, fondo `--Colors-Green-200` (`scss:22-27`).

### Consumidores
`home.page.html:50-54` (`completedTasks`/`totalTask`), `measurement.page.html:16-20`.

**Migración RN**: `react-native-progress` o `View` con ancho `(current/total)*100%`.

---

## 9. ExploreContainerComponent (`app-explore-container`)

**Archivos**: `src/app/explore-container/explore-container.component.ts`, `.html`, `.scss`.

### API (`@Input`)
Referencia: `explore-container.component.ts:13-18`
| Input | Tipo | Default |
|---|---|---|
| `title` | `string?` | `undefined` |
| `titleHTML` | `string?` | `undefined` |
| `subTitle` | `string?` | `undefined` |
| `message` | `string?` | `undefined` |
| `BgBlue` | `boolean?` | `false` |
| `Icon` | `string?` | `undefined` |

### Lógica de render
- Clase de fondo: `BgBlue ? 'bg_blue' : 'bg_green'` (`html:1`).
- Si `Icon` → `<ion-img [src]="Icon">`; else thumbnail con `icon-only.png` (`html:4-10`).
- Si `title` → `<h1>`; else si `titleHTML` → `<div [innerHTML]="titleHTML">` (`html:11-15`).
- `subTitle` y `message` opcionales (`html:16-21`).
- `<ng-content>` para contenido proyectado (`html:22`). **Este es el wrapper layout base** que envuelve el contenido de muchas pantallas de auth.

### Ionic / DOM
`IonicModule` (IonImg, IonThumbnail), `ReactiveFormsModule` (importado pero el template no usa forms directamente — `ts:9`). `[innerHTML]` para `titleHTML` (`html:14`). Estilos de fondo (`bg_blue`/`bg_green`) NO están en su `.scss` propio (que solo define `.icon` height) — provienen de estilos globales del tema.

### Consumidores (mayoría del flujo de auth — ~13 páginas)
`login`, `otp`, `validate-code`, `register` y todas sus subpáginas (`pre-register`, `set-phone-register`, `project-vinculation`, `project-vinculation-done`, `validate-project`, `register-project-form`, `register-completed`, `register-success`). Es el contenedor estructural del onboarding.

**Migración RN**: componente de layout con `children` (equivalente a `ng-content`). El `titleHTML` requiere render-html. Los fondos `bg_blue/bg_green` provienen de estilos globales (`global.scss`/tema) — verificar tokens.

---

## 10. SafeHtmlPipe (`safeHtml`)

**Archivo**: `src/app/core/pipes/safe-html.pipe.ts`. Pipe standalone (`name:'safeHtml'`, `:5-8`).

### Comportamiento
- Constructor inyecta `DomSanitizer` y registra un hook `DOMPurify.addHook('uponSanitizeAttribute')` que **preserva `style` si contiene `var(...)`** (CSS custom properties) (`:14-23`).
- `transform(value)`: `DOMPurify.sanitize` con whitelist explícita de tags (`b,i,u,a,p,div,span,h1-h6,img,table,td,th,tr,ul,li,ol,strong,em,br,hr,style`) y atributos (`href,src,alt,title,style`), luego `bypassSecurityTrustHtml` (`:30-62`).

### Dependencias web (bloqueantes)
`DOMPurify` (DOM-dependiente, requiere `window`/jsdom), `DomSanitizer`/`SafeHtml` de `@angular/platform-browser`. NO portables a RN.

### Consumidores
`measurement.page`, `guide-measurement.component`, `register-measurement.page`, `measurement-detail.page` (todos via `| safeHtml` en template + binding `[innerHTML]`).

**Migración RN**: no hay `innerHTML`. Reemplazar por `react-native-render-html` (que sanitiza/renderiza) o por parsing a componentes nativos. El contenido HTML proviene de la configuración de guías/mediciones (texto enriquecido), por lo que el render de HTML enriquecido es un requisito funcional real, no cosmético.

---

## 11. GuideMeasurementComponent (`app-guide-measurement`) — fuera de `components/` pero relevante

**Archivo**: `src/app/pages/measurement/guide-measurement/guide-measurement.component.ts` (+ `.html`, `.scss`). Se presenta como **modal** (`ModalController`).

### API (`@Input`)
| Input | Tipo | Default | Ref |
|---|---|---|---|
| `guide` | `Guide \| undefined` | `undefined` | `ts:39` |
| `isHtmlText` | `boolean` | `false` | `ts:46` |

Estado interno: `IsArrayText` (si `guide.text` es array), `img`, `text` (`ts:53-57`).

### Lógica
- `ngOnInit` async: detecta `Array.isArray(guide.text)`; carga imágenes vía `ConfigurationAppService.loadImage(guide.image)` y `guide.icon.imagePath`; si `isHtmlText` asigna `text=guide.text` (`ts:74-89`).
- `closeModal(isButtonOk)`: dismiss con `{ nextGuide: guide?.nextGuide }` si OK (`ts:96-101`).
- Usa `SafeHtmlPipe` en el template (`ts:30`, import del pipe).

### Ionic interno
`IonImg, IonIcon, IonCheckbox, IonButton, ModalController` (`ts:4-10`).

**Migración RN**: modal controlado; carga de imágenes async (mapear `ConfigurationAppService.loadImage`); render de texto HTML con render-html.

---

## 12. Pseudo-componentes de UI vía controladores Ionic

No son componentes Angular, pero presentan UI imperativa que debe re-mapearse a equivalentes RN. Verificado por grep:

| Controlador | Archivos que lo usan | Uso |
|---|---|---|
| `AlertController` | `pages/auth/otp/otp.page.ts:9,66,192-197` (alerta "No createUser", botón "Aceptar"); `pages/profile/personal-info/personal-info.page.ts:14,136,259,345` (alertas de confirmación) | Diálogos nativos |
| `ToastController` | `pages/historical/historical.page.ts:108,955,1027,1069,1118,1194,1212`; `pages/profile/configuration/configuration.page.ts:122,305,319` | Toasts/snackbars |
| `LoadingController` | `pages/historical/historical.page.ts:899`; `pages/profile/configuration/configuration.page.ts:123,266` | Spinners de carga bloqueante |
| `ModalController` | `AlertComponent` y `GuideMeasurementComponent` (ver arriba), `login.page.ts`, etc. | Modales |

**Migración RN**: `AlertController`→`Alert.alert()` de RN o modal propio; `ToastController`→`react-native-toast-message`/snackbar; `LoadingController`→overlay/Modal con `ActivityIndicator`; `ModalController`→`Modal` de RN o `@gorhom/bottom-sheet` según diseño.

---

## Notas transversales para la migración

- **Iconografía**: todos los componentes usan `<ion-icon>`/`<ion-img>` con `src` apuntando a SVGs en `assets/`. En RN requieren `react-native-svg` + `react-native-svg-transformer` o pre-renderizado.
- **CSS variables del tema** (`--Colors-Blue-*`, `--Colors-Gray-*`, `--Colors-Green-*`) provienen de `src/theme/variables.scss` y mixins `text_base`/`dayCalendar`. Deben portarse a un theme/tokens de RN.
- **`ViewEncapsulation.None`** en `AlertComponent` hace que sus estilos sean globales — al migrar hay que aislar.
- **`[innerHTML]`** aparece en `AlertComponent`, `ExploreContainerComponent` y vía `SafeHtmlPipe` en varias páginas → punto único de complejidad: render de HTML enriquecido en RN.
- **Acoplamiento UI↔datos**: `HeaderComponent` consulta DataStore en `ngOnInit`; conviene desacoplar a hooks/context.
- **Cobertura de tests**: existe `.spec.ts` para cada componente (alert, areachart, calendar, day, environmental-report, header, moon-card, progress-bar, explore-container, guide-measurement) — no se auditó su contenido aquí.

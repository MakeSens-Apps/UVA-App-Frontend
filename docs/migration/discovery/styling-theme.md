# Discovery — Sistema Visual y Theming (Ionic → React Native)

> Fase 1 de la migración de la **UVA App** (Angular 18 + Ionic 8 + Capacitor 6) a **React Native (Expo + Development Builds)**.
> Este documento inventaria de forma exhaustiva el sistema de diseño: design tokens, tipografías, assets, patrones SCSS, theming dinámico, y la estrategia de mapeo a React Native.
> **Solo lectura**: no se modificó ningún archivo de código fuente.

---

## 0. Resumen de cómo se carga el theme

Configuración de assets y estilos en `angular.json:27-34` y `angular.json:102-109`:

- `assets`: glob `**/*` desde `src/assets` → output `assets` (todos los assets se copian tal cual).
- `styles`: `["src/global.scss", "src/theme/variables.scss"]` — **solo estos dos archivos son globales**. El resto de `.scss` son estilos encapsulados por componente Angular (ViewEncapsulation por defecto = Emulated).

Hay **43 archivos `.scss`** en total (`src/` raíz: 4 globales/tema; `src/app/`: 39 por componente/página).

Archivos clave del sistema de diseño:
- `src/theme/variables.scss` — tokens de color (CSS custom properties).
- `src/theme/mixins.scss` — mixins SCSS (`align`, `text_base`).
- `src/global.scss` — estilos globales, `@font-face`, clases utilitarias, overrides de componentes Ionic.
- `src/app/components/calendar/day/day.mixin.scss` — mixin local del calendario.

---

## 1. Design Tokens — Colores (`src/theme/variables.scss`)

Todos los tokens de color son **CSS custom properties** declaradas en `:root` (`variables.scss:6-103`). Conviven **dos sistemas de nomenclatura** que NO están unificados:

### 1.1 Variables de color de Ionic (`--ion-color-*`)

Definen colores "temáticos" de Ionic con sus variantes `-rgb`, `-contrast`, `-shade`, `-tint`. Usadas por `color="..."` en componentes Ionic. Cada una tiene su clase utilitaria `.ion-color-*` (`variables.scss:105-153`).

| Token | Hex base | shade | tint | contrast | Definición |
|---|---|---|---|---|---|
| `--ion-color-uva_green-500` | `#69AB3C` | `#5c9635` | `#78b350` | `#ffffff` | `variables.scss:9-15` |
| `--ion-color-uva_green-700` | `#14788A` | `#126a79` | `#2c8696` | `#ffffff` | `variables.scss:17-23` |
| `--ion-color-uva_blue-500` | `#10BCCA` | `#0ea5b2` | `#28c3cf` | `#ffffff` | `variables.scss:27-33` |
| `--ion-color-uva_blue-600` | `#1097AA` | `#0e8596` | `#28a1b3` | `#ffffff` | `variables.scss:35-41` |
| `--ion-color-uva_orange-500` | `#E58B24` | `#ca7a20` | `#e8973a` | `#ffffff` | `variables.scss:43-49` |

> Nota: para `uva_green-500`, `uva_blue-500/600` y `uva_orange-500` el `-contrast-rgb` está mal puesto a `0, 0, 0` (negro) aunque el contrast es blanco (`#ffffff`) — es una inconsistencia heredada (`variables.scss:13,31,39,47`).

### 1.2 Escalas de color "Design System" (`--Colors-*`)

Paletas tipo Tailwind (50–950). Usadas vía `var(--Colors-...)` en SCSS de componentes. Este es el sistema **predominante** en la app.

**Blue** (`variables.scss:53-64`):
| Token | Hex |
|---|---|
| `--Colors-Blue-50` | `#EDFEFE` |
| `--Colors-Blue-100` | `#D1FBFC` |
| `--Colors-Blue-200` | `#A9F5F8` |
| `--Colors-Blue-300` | `#6EEBF2` |
| `--Colors-Blue-400` | `#2CD9E4` |
| `--Colors-Blue-500` | `#10BCCA` |
| `--Colors-Blue-600` | `#1097AA` |
| `--Colors-Blue-700` | `#14788A` |
| `--Colors-Blue-800` | `#1A6270` |
| `--Colors-Blue-900` | `#164551` |
| `--Colors-Blue-950` | `#0B3641` |

**Orange** (`variables.scss:66-75`):
| Token | Hex |
|---|---|
| `--Colors-Orange-50` | `#FDF9EF` |
| `--Colors-Orange-100` | `#FBF0D9` |
| `--Colors-Orange-200` | `#F7DFB1` |
| `--Colors-Orange-300` | `#F1C880` |
| `--Colors-Orange-400` | `#EBA84C` |
| `--Colors-Orange-500` | `#E58B24` |
| `--Colors-Orange-600` | `#D7751F` |
| `--Colors-Orange-700` | `#B25A1C` |
| `--Colors-Orange-800` | `#8E481E` |

**Green** (`variables.scss:77-88`):
| Token | Hex |
|---|---|
| `--Colors-Green-50` | `#F2F9EC` |
| `--Colors-Green-100` | `#E3F2D5` |
| `--Colors-Green-200` | `#C8E6B0` |
| `--Colors-Green-300` | `#A5D581` |
| `--Colors-Green-400` | `#85C259` |
| `--Colors-Green-500` | `#69AB3C` |
| `--Colors-Green-600` | `#4E852B` |
| `--Colors-Green-700` | `#3D6625` |
| `--Colors-Green-800` | `#335222` |
| `--Colors-Green-900` | `#2E4621` |
| `--Colors-Green-950` | `#15260D` |

**Gray** (`variables.scss:89-100`):
| Token | Hex |
|---|---|
| `--Colors-Gray-50` | `#FAFAFA` |
| `--Colors-Gray-100` | `#F5F5F5` |
| `--Colors-Gray-200` | `#E5E5E5` |
| `--Colors-Gray-300` | `#D4D4D4` |
| `--Colors-Gray-400` | `#A3A3A3` |
| `--Colors-Gray-500` | `#737373` |
| `--Colors-Gray-600` | `#525252` |
| `--Colors-Gray-700` | `#404040` |
| `--Colors-Gray-800` | `#262626` |
| `--Colors-Gray-900` | `#171717` |
| `--Colors-Gray-950` | `#0A0A0A` |

**Otros colores sueltos**:
| Token | Hex | Definición |
|---|---|---|
| `--Colors-Danger` | `#E5245E` | `variables.scss:51` |
| `--gray-900` | `#111928` | `variables.scss:101` — **distinto** del `--Colors-Gray-900` (`#171717`); colisión de nombres en minúsculas |

### 1.3 Inconsistencias de paleta detectables (importantes para el theme.ts único)

- **Blue/Green-500 comparten valor**: `--ion-color-uva_blue-500`, `--Colors-Blue-500` = `#10BCCA`; `--ion-color-uva_green-500` = `--Colors-Green-500` = `#69AB3C`. Es decir, `uva_green-500` es realmente verde, pero `uva_green-700` = `#14788A` es **azul** (igual a `--Colors-Blue-700`). La nomenclatura "green" no es fiable: varios "greens" son azules.
- `--gray-900` (`#111928`) ≠ `--Colors-Gray-900` (`#171717`): dos grises oscuros casi idénticos con nombres que solo difieren en mayúsculas/minúsculas (CSS los distingue; un mapeo naive a JS los colapsaría).
- Colores literales hardcodeados fuera de los tokens (ver §4): `#f4f4f4`, `#f5f5f5`, `#fff`, `#14788a`, `#333`, `#fef2f2`, `#e5245e`, etc.

### 1.4 Tokens de espaciado/radio referenciados pero NO definidos

En SCSS aparecen `var(--xl, 10px)`, `var(--2xl)`, `var(--3xl, 14px)`, `var(--4xl, 16px)`, `var(--lg)`, `var(--White, #fff)`, `var(--Linear-white, ...)`, `var(--Gray-300, #d4d4d4)`, `var(--Gray-700, #404040)`. **Ninguno está definido** en el proyecto (verificado: no hay declaración `--xl:`, `--3xl:`, `--White:`, `--Linear-white:`, etc.). Siempre resuelven al **valor de fallback** inline. Ejemplos:
- `--xl` → `10px` (radio): `global.scss:170`, `home.page.scss:73`.
- `--3xl` → `14px` (radio): `global.scss:387`, `progress-bar.component.scss:11`.
- `--4xl` → `16px` (radio/padding): `global.scss:382,429,461`.
- `--White` → `#fff`: `global.scss:211,389,531`, `home.page.scss:74`.
- `--Linear-white` → `linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.8))`: `global.scss:103-106`.

**Implicación para RN**: estos "tokens" de radio (`xl=10`, `3xl=14`, `4xl=16`) deben formalizarse como escala de `radius` en `theme.ts`; hoy viven solo como números mágicos en fallbacks.

### 1.5 Variables Ionic consumidas pero NO redefinidas

Se referencian `var(--ion-color-primary)`, `var(--ion-color-danger)`, `var(--ion-border-color)`, `var(--ion-text-color)`, `var(--ion-text-color-rgb)` (p.ej. en SCSS de componentes), pero **no se redefinen** en `variables.scss` — usan los valores por defecto del tema de Ionic. La única `--ion-font-family` redefinida es `'montserrat', sans-serif` (`variables.scss:7`).

---

## 2. Tipografía

### 2.1 Familia y registro (`src/global.scss:40-57`)

Una sola familia: **Montserrat**, registrada con **dos `@font-face`** usando los archivos **VariableFont**:
- `assets/fonts/Montserrat/Montserrat-VariableFont_wght.ttf` — `font-weight: 100 900`, `font-style: normal` (`global.scss:40-45`).
- `assets/fonts/Montserrat/Montserrat-Italic-VariableFont_wght.ttf` — `font-weight: 100 900`, `font-style: italic` (`global.scss:47-52`).

Aplicada globalmente: `html, body { font-family: 'montserrat', sans-serif }` (`global.scss:54-57`) y `--ion-font-family: 'montserrat', sans-serif` (`variables.scss:7`).

Archivos físicos confirmados (solo TTF variable, **no hay** woff/woff2/otf ni pesos estáticos):
```
src/assets/fonts/Montserrat/Montserrat-VariableFont_wght.ttf
src/assets/fonts/Montserrat/Montserrat-Italic-VariableFont_wght.ttf
```

### 2.2 Mixin tipográfico (`src/theme/mixins.scss:12-20`)

```scss
@mixin text_base($font-size: 16px, $font-weigh: 500) {
  font-size: $font-size;
  margin-top: 10px;   margin-bottom: 10px;
  font-weight: $font-weigh;
  line-height: normal; font-style: normal;
}
```
Es el patrón tipográfico dominante. Se invoca **59 veces** en SCSS, indistintamente como `@include text_base(...)` o `@include text-base(...)` (SCSS normaliza `-`/`_`, así que son el mismo mixin). Incluye márgenes verticales de 10px embebidos en la tipografía — esto significa que el "token de texto" arrastra spacing, algo a separar en RN.

### 2.3 Escala tipográfica observada (tamaño / peso)

Derivada de los usos de `text_base` y reglas sueltas:
- **12px** (xs) — `paragraph .text-xs` (`global.scss:242`).
- **14px** (sm) — labels, subtítulos, refs; peso 500/700 (`global.scss:153-154,234,274`; `header.component.scss:38`).
- **16px** (base) — texto/botones/inputs por defecto; peso 500/700 (`global.scss:127,157,180-189,237`).
- **18px** (lg) — títulos de tarjeta/header; peso 600 (`global.scss:250`; `header.component.scss:13`; `moon-card.component.scss:34`).
- **20px** — `h1/h2`, `.text-xl`; peso 600 (`global.scss:118,261,264`).
- **22px** — `.text-xxl` (`global.scss:268`).
- **24px** — `report-title` (`environmental-report.component.scss:107`).
- **28px** — `.app-name` brand (`environmental-report.component.scss:71`).
- **30px** — `modal_token h1` (`home.page.scss:154`).

Pesos usados: 400, 500 (default), 600, 700, `bold`. `line-height` casi siempre `normal` o `150%` (≈1.5); en el reporte aparece `1.2`.

---

## 3. Inventario de Assets

Resumen por extensión bajo `src/assets`: **58 svg, 22 png, 8 webp, 3 gif, 2 ttf** (+ archivos `.DS_Store` basura que NO deben migrarse).

### 3.1 Íconos de app / PWA (`src/assets/icons/` — 7 archivos WEBP)
`icon-48 / icon-72 / icon-96 / icon-128 / icon-192 / icon-256 / icon-512.webp`. Son íconos de PWA/manifest (no se usan en pantallas; relevantes solo para el `manifest.webmanifest`). En RN/Expo se reemplazan por la config de `app.json` (icon/adaptive-icon).

### 3.2 Íconos nativos / splash sueltos (`src/assets/` raíz e `icon/`)
- `icon-background.png`, `icon-foreground.png`, `icon-only.png`, `icon/favicon.png` — íconos de Capacitor/PWA.
- `splash.png`, `splash 2.png`, `splash-dark.png` (raíz) + `resources/splash.png` (2.4 MB) + `resources/splash.png` — splash de Capacitor/Android. **No migran directo**: Expo usa `expo-splash-screen`.
- `shapes.svg` (raíz) — sin referencia detectada en templates (candidato a asset huérfano).

### 3.3 Íconos UI usados en pantallas (`src/assets/images/icons/` — SVG + algún PNG duplicado)
Referenciados vía `<img src="...">` / `<ion-img [src]>` (rutas relativas frágiles). Inventario:

SVG (uso en pantallas):
`arrow-right.svg`, `brote.svg`, `calendar.svg`, `check.svg`, `checkSaveStreak.svg`, `checkmark-circle.svg`, `clipboard-check.svg`, `cloud.svg`, `content_copy.svg`, `date_check.svg`, `date_current.svg`, `date_incomplete.svg`, `date_incomplete_to_done.svg`, `exclamation.svg`, `face.svg`, `fire.svg`, `flor.svg`, `home.svg`, `information-circle.svg`, `logop.svg`, `more_horiz.svg`, `notion.svg`, `platula.svg`, `refresh.svg`, `semilla.svg` (el más usado, ~docenas de referencias), `switch-horizontal.svg`, `user-circle.svg`, `vault.svg` (en `images/` raíz), `whatapp.svg`.

PNG redundantes / mezcla (mismo ícono en PNG y SVG): `arrow-forward.png`, `back.png`, `brote1.png`, `user-circle.png`, `Buttons.png`, `Text.png` (estos dos parecen exports de Figma huérfanos).

Subcarpeta `icons/profile/` (mezcla PNG+SVG, varios duplicados): `Arrow-forward.png`, `arrow-forward.svg`, `Medal.png`/`Medal.svg`, `Open.png`/`Open.svg`, `Options.png`/`Options.svg`, `Share-social.png`/`share-social.svg`, `logout.png`/`logout.svg`, `pencil.svg`, `exclamation.svg`, `trash.svg`.

Subcarpeta `icons/Moon/` (íconos de fase lunar, set "icons"): `crescent.svg`, `declining.svg`, `full.svg`, `new.svg`, `Gibosa_crescent.svg`, `Gibosa_declining.svg`.

### 3.4 Fases lunares (set principal — `src/assets/images/Moon/` — SVG)
`nueva.svg`, `cuarto_creceiente.svg` (typo en nombre), `gibosa_creciente.svg`, `llena.svg`, `gibosa_menguante.svg`, `cuarto_menguante.svg`, `eclipses_card_home .svg` (**con espacio en el nombre** — riesgo de bundling/import en RN). Hay **dos sets de luna** (`images/Moon/*` en español y `images/icons/Moon/*` en inglés) — verificar cuál se usa realmente para no duplicar en la migración.

### 3.5 Ilustraciones / logos / fondos
- `background.svg` — fondo blur de splash y `container_explore` (`global.scss:60`, `splash-animation.page.scss:2`).
- `card_moon_bg.svg`, `calendar_example.svg`, `logo.svg`, `logo_Makesens.svg`, `logo_Makesens_Fondo_oscuro.png`, `logo_Natura_Isagen.png`, `LogoNaturaColombia.svg`, `Powered_by.png`, `logop.svg`.
- `icon-72.webp` (duplicado dentro de `images/`).

### 3.6 Animaciones (**solo GIF — NO hay Lottie/JSON**)
Verificado: no existe ninguna animación Lottie (`.json` de lottie) ni dependencia `lottie`. Las "animaciones" son **GIFs**:
- `confety.gif` — celebración (`register-completed.page.html:8`, `project-vinculation-done.page.html:7`).
- `done_register.gif` — éxito (`register-measurement.page.html:104`, `register-success.page.html:4`).
- `loader.gif` — spinner de carga (`validate-code.page.ts:14`, `validate-project.page.ts:16`).

### 3.7 Íconos de Ionicons (built-in, set de la librería)
Vía `ion-icon name="..."`: `arrow-back-outline` (×9), `close` (×4), `arrow-forward-outline` (×2), `arrow-forward`, `arrow-back`, `trash-outline`, `share-outline`, `settings-outline`, `notifications-off-outline`. Registro explícito solo en tabs: `addIcons({ triangle, ellipse, square })` (`tabs.page.ts:9-27`). En RN hay que sustituir Ionicons por `@expo/vector-icons` (incluye set Ionicons) o por los SVG propios.

---

## 4. Patrones SCSS recurrentes (muestreo de los 43 archivos)

### 4.1 Estilado del Shadow DOM de Ionic (CRÍTICO para la migración)
Dos mecanismos, ambos **inexistentes en RN**:

**a) CSS custom properties de Ionic (`--algo`)** dentro del selector del host:
- `ion-content { --background: #f4f4f4 }` (`home.page.scss:4`), `--background: var(--Colors-Gray-50)` (`register-measurement.page.scss:4`), `--background: #ffffff` (`configuration.page.scss:24`), `--background: #F5F5F5` (`profile.page.scss:23`).
- `ion-input` padding/highlight: `--padding-top/bottom/start/end`, `--highlight-color-focused/-invalid/-valid` (`global.scss:161-167`).
- `ion-tab-bar`: `--background`, `--color`; `ion-tab-button`: `--background-focused`, `--ripple-color`, `--color-selected` (`global.scss:304-316`).
- `ion-chip`: `--background`, `--color` (`header.component.scss:24-26`).
- `ion-button`: `--border-radius` (`global.scss:376`).
- `ion-segment-button`: `--background-checked`, `--padding-*`, `--indicator-color` (`historical.page.scss:10-13`, `time-frame.component.scss:22-25`).
- `ion-thumbnail`: `--size`, `--border-radius` (`global.scss:195-199`).
- `ion-modal`: `--height: auto`, `--width`, `--max-width` (`global.scss:513-521`).

**b) Pseudo-elemento `::part()`** (Shadow Parts), usado en 10 archivos:
- `ion-content::part(background)` → fondo real del content: `home.page.scss:52`, `measurement.page.scss:3`, `moon-phase.page.scss:3`, `historical.page.scss:3`, `measurement-detail.page.scss:3`, `achievement.page.scss:109`, `alerts.page.scss:7`.
- `ion-checkbox::part(container)` y `::part(label)` (`measurement.page.scss:108-113`, `guide-measurement.component.scss:62-67`, `pre-register.page.scss:6-11`).
- `.custom-modal_confirmation::part(backdrop)` y `::part(content)` (`register-measurement.page.scss:139-151`).

> **No se usa `::ng-deep`** en ningún `.scss` (verificado, 0 ocurrencias). Sí hay un selector de profundidad por ruta de DOM (`global.scss:550`) hacia `app-profile ... ion-list` y selectores por `#ion-overlay-N` (`global.scss:545-548`) — frágiles y específicos de Ionic.

### 4.2 Layout: Flexbox dominante, algo de Grid
- Flexbox por todas partes (mixin `align` en `mixins.scss:1-10`: `flex` column centrado). Patrón `display:flex; flex-direction; justify-content; align-items; gap`.
- **CSS Grid** solo en el reporte ambiental: `grid-template-columns: 1fr 1fr 1fr` y `1fr 1fr` (`environmental-report.component.scss:116,149`). RN no tiene grid → se replica con flex/columnas.
- Uso de propiedades lógicas: `margin-inline`, `padding-inline`, `margin-inline-start/end`, `padding-block` (`global.scss:122,307,339-342`, `moon-card.component.scss:15`). En RN solo existen los equivalentes `marginHorizontal/Vertical` o `start/end` parciales.

### 4.3 Sombras (`box-shadow` / `drop-shadow`)
- `box-shadow: 0 4px 16px rgba(0,0,0,0.2)` (`alert.component.scss:42`).
- `box-shadow: 0 2px 8px rgba(16,188,202,0.1)` (azul) y `0 2px 8px rgba(105,171,60,0.1)` (verde) — sombras teñidas en el reporte (`environmental-report.component.scss:158,286,340`).
- `box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` y variantes hover (`configuration.page.scss:290-300`).
- `box-shadow: 0px 4px 4px rgba(0,0,0,0.25)`, `2px 4px 6px rgba(0,0,0,0.1)` (`achievement.page.scss:43,250`).
- `box-shadow: 0 1px 3px / 0 2px 8px / 0 4px 12px rgba(0,0,0,...)` (`alerts.page.scss:42,47,196`).
- `box-shadow: 0px -2px 10px rgb(248 242 242 / 10%)` (`personal-info.page.scss:372`).
- `filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.1))` sobre `ion-icon` (`header.component.scss:44`).

### 4.4 `backdrop-filter: blur(...)` (efecto glassmorphism)
- `blur(25px)` sobre fondo `background.svg` en splash y `container_explore` (`global.scss:71`, `splash-animation.page.scss:21`).
- `blur(20px)` en backdrop/content de modal de confirmación (`register-measurement.page.scss:140,152`).

> **`backdrop-filter` NO existe en React Native.** Requiere `expo-blur` (`BlurView`) o aplanar el efecto.

### 4.5 Gradientes lineales
- `linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.8) 100%)` — tarjetas glass (`global.scss:103-106`).
- En reporte ambiental, varios `linear-gradient(135deg, ...)` con tokens Blue/Green (`environmental-report.component.scss:52,96,178,258,289,348`).

> RN no soporta gradientes en CSS → `expo-linear-gradient`.

### 4.6 Radios, redondeo y formas
- Radios sueltos: `border-radius: 50%` (círculos), `18px`, `16px`, `14px`, `10px`, `8px`, `7px`, `6px`, `4px`. Y los "tokens" `var(--xl,10px)`, `var(--3xl,14px)`, `var(--4xl,16px)` (ver §1.4).
- `border-radius: 50%` en `.leaf-icon` (`splash-animation.page.scss:39`).

### 4.7 Unidades de viewport (`vh`/`vw`)
- `.container_explore { height: 100vh; width: 100vw; padding: 5vw; position: fixed }` (`global.scss:74-81`). RN no tiene `vh/vw/fixed` → `Dimensions`/`useWindowDimensions` o `flex:1`.

### 4.8 Patrones SCSS estructurales
- `@import 'src/theme/mixins'` al inicio de muchos componentes (no es theming, solo trae mixins).
- Uso de **placeholder selectors `%name` + `@extend`**: `%bg` (`global.scss:59`), `%measurment` (`global.scss:422`), `%modalCommons` (`home.page.scss:56`). En RN se traducen a objetos de estilo compartidos / componentes.
- Selectores por nombre de elemento de componente Angular (host): `app-pre-register`, `app-login`, `app-profile` (`global.scss:283-301,550`). Sin equivalente en RN.
- `text-transform: capitalize/uppercase/none` en botones y marca (`global.scss:185,279`, `environmental-report.component.scss:75`).
- `!important` puntual para forzar overrides de Ionic (`global.scss:280,547,552`; `register-measurement.page.scss:105-106`; `otp.page.scss:10-11`).

---

## 5. Modo oscuro y theming dinámico

### 5.1 Modo oscuro (Ionic dark palette)
- En `global.scss:37` se importa **`@ionic/angular/css/palettes/dark.system.css`** (las variantes `dark.always` y `dark.class` están **comentadas**, `global.scss:35-36`). Es decir, el modo oscuro de Ionic está **habilitado en modo "system"**: si el SO está en oscuro, Ionic reescribe sus `--ion-*` por defecto.
- **PERO** la app fija fondos claros explícitos en casi todos los `ion-content` (`#f4f4f4`, `#F5F5F5`, `#fff`, `#ffffff`) y colores de texto/marca con sus propios tokens `--Colors-*`, por lo que la UI es efectivamente **clara siempre**; no hay un set de tokens oscuros propio. **No existe un toggle de tema en la app** (no se halló `prefers-color-scheme` propio ni lógica de dark/light controlada por usuario; los únicos hits son el import de la paleta dark de Ionic).

> **Conclusión**: el "dark mode" es un artefacto residual de Ionic, no una feature diseñada. En RN se puede ignorar y forzar tema claro, o reimplementarlo desde cero si se quiere soporte real.

### 5.2 Theming dinámico por RACIMO (branding en runtime) — REAL y activo
Sí existe **theming configurable por proyecto (RACIMO)** que se aplica en runtime. Flujo en `src/app/core/services/storage/configuration-app.service.ts`:

1. El modelo de colores es genérico: `ColorsModel = Record<string, ColorData>` donde `ColorData` es `{value, group, type:'HEX'}` o `{value:[r,g,b], group, type:'RGB'}` (`src/models/configuration/colors.model.ts:1-19`).
2. `getConfigurationColors()` lee `${pathRacimo}/branding/colors.json` desde el **filesystem del dispositivo** (Capacitor `Directory.Data`), no del bundle (`configuration-app.service.ts:153-169`). La ruta del racimo depende de `session.racimoLinkCode` (`configuration-app.service.ts:292-298`).
3. `loadBranding()` → `applyColors(colors)` (`configuration-app.service.ts:175-182`).
4. **`applyColors`** itera las claves y hace `document.documentElement.style.setProperty('--'+key, value)` para HEX, o `rgb(r,g,b)` para RGB (`configuration-app.service.ts:273-285`).

> Es decir: el JSON de branding **sobrescribe en caliente las CSS custom properties** del `:root` (p.ej. puede redefinir `--Colors-Blue-500`, etc.) por cada RACIMO. Es theming multi-tenant via CSS variables + DOM API.

### 5.3 Colores dinámicos por medición (gráficas)
- `measurements.model.ts` define `Style { backgroundColor: Color; borderColor: Color }` y `Color { colorName; colorHex }` (`measurements.model.ts:84-98`); también `Icon { colorName; colorHex }` (`measurements.model.ts:61-67`). Mismos campos en `IMeasurement.ts:8-16`.
- En `historical.page.ts:387-438` los `colorHex` de la config de medición se pasan a Chart.js (`backgroundColor`, `borderColor` de las series). Es color data-driven, no CSS.

> **Implicación para RN**: `applyColors` (DOM `setProperty`) **no funciona** en React Native. El theming por RACIMO debe rehacerse con **Context/estado** (p.ej. un `ThemeProvider` que cargue `colors.json` desde FileSystem de Expo y exponga un objeto de tokens reactivo), no manipulando un documento. Todas las pantallas que hoy leen `var(--Colors-...)` deberán leer del theme en runtime para preservar el branding multi-tenant.

---

## 6. Estrategia de mapeo a React Native (sección obligatoria)

### 6.1 Tokens → `theme.ts`
Crear un único módulo `theme.ts` (objeto JS tipado) que sea la fuente de verdad. Estructura propuesta:

```ts
export const colors = {
  blue:   { 50:'#EDFEFE', 100:'#D1FBFC', 200:'#A9F5F8', 300:'#6EEBF2', 400:'#2CD9E4',
            500:'#10BCCA', 600:'#1097AA', 700:'#14788A', 800:'#1A6270', 900:'#164551', 950:'#0B3641' },
  orange: { 50:'#FDF9EF', 100:'#FBF0D9', 200:'#F7DFB1', 300:'#F1C880', 400:'#EBA84C',
            500:'#E58B24', 600:'#D7751F', 700:'#B25A1C', 800:'#8E481E' },
  green:  { 50:'#F2F9EC', 100:'#E3F2D5', 200:'#C8E6B0', 300:'#A5D581', 400:'#85C259',
            500:'#69AB3C', 600:'#4E852B', 700:'#3D6625', 800:'#335222', 900:'#2E4621', 950:'#15260D' },
  gray:   { 50:'#FAFAFA', 100:'#F5F5F5', 200:'#E5E5E5', 300:'#D4D4D4', 400:'#A3A3A3',
            500:'#737373', 600:'#525252', 700:'#404040', 800:'#262626', 900:'#171717', 950:'#0A0A0A' },
  danger: '#E5245E',
  gray900Alt: '#111928',         // el --gray-900 (≠ gray.900)
  white: '#FFFFFF',
};
export const radius  = { sm:6, md:8, xl:10, '3xl':14, '4xl':16, pill:18, round:9999 };
export const spacing = { xs:4, sm:8, md:10, lg:16, xl:20, '2xl':24, '3xl':32 };
export const typography = {
  fontFamily: 'Montserrat',
  sizes: { xs:12, sm:14, base:16, lg:18, xl:20, xxl:22, title:24, brand:28, modal:30 },
  weights: { regular:'400', medium:'500', semibold:'600', bold:'700' },
};
export const shadows = { /* ver §6.4 */ };
```
- Mapear las dos nomenclaturas (`--ion-color-uva_*` y `--Colors-*`) a un único sistema; documentar que `uva_green-700` es realmente azul (`#14788A`).
- `--Colors-Danger` → `colors.danger`; preservar `--gray-900` (`#111928`) como `gray900Alt` para no colisionar con `gray.900`.

### 6.2 Unidades que cambian
- `px` → **números sin unidad** (RN usa density-independent pixels). Todos los `Xpx` pasan a `X`.
- `vh`/`vw`/`%` viewport → `useWindowDimensions()` / `Dimensions.get('window')` o `flex:1`. `position:fixed` → no existe; usar `absolute` + `flex`.
- `rem`/`em`: no se usan (todo está en px), ventaja para la migración.
- Propiedades lógicas (`margin-inline`, `padding-block`) → `marginHorizontal`/`marginVertical` (o `marginStart/End` para RTL parcial).
- `gap` en flex: soportado en RN moderno (>=0.71) → mantener.
- `text-transform` → en RN se usa la prop `style.textTransform` (`capitalize`/`uppercase`/`none`), soportado. `letter-spacing` → `letterSpacing`.
- `line-height: normal`/`150%` → en RN `lineHeight` es **número absoluto en px**; convertir `150%` a `fontSize*1.5` (p.ej. 16 → 24).

### 6.3 Tipografías en Android (Expo)
- Registrar **Montserrat** con `expo-font` (`useFonts`) o `npx expo install` + config plugin. **Problema clave**: la app usa **variable fonts** (`Montserrat-VariableFont_wght.ttf`) con `font-weight: 100 900`. El soporte de variable fonts en React Native/Android es **limitado/inconsistente**. Recomendación: **bajar pesos estáticos** de Montserrat (400/500/600/700, normal+italic) y registrarlos como familias separadas (`Montserrat-Regular`, `Montserrat-Medium`, `Montserrat-SemiBold`, `Montserrat-Bold`, `Montserrat-Italic`), porque en RN `fontWeight` sobre una variable font no interpola fiable en Android.
- Reemplazar el mixin `text_base` por un componente `<Text>` tipado / helper que aplique `fontFamily` por peso (no `fontWeight` numérico arbitrario, que Android puede ignorar). **Separar** los `margin: 10px` que hoy vienen embebidos en el mixin tipográfico.

### 6.4 Sombras en Android
- Las `box-shadow` web NO existen en RN. En Android la sombra se controla con la prop **`elevation`** (no respeta color/offset/blur web). Para sombras teñidas (azules/verdes del reporte) o sombras precisas multicapa, usar **`elevation`** aproximado o una librería (`react-native-shadow-2`) si se necesita color. Mapear cada `box-shadow` a una escala (`shadows.sm/md/lg`) con su `elevation` Android e `shadowColor/shadowOffset/shadowRadius/shadowOpacity` iOS:
  - `0 1px 3px rgba(0,0,0,.1)` → elevation ~2.
  - `0 2px 8px rgba(0,0,0,.15)` → elevation ~4.
  - `0 4px 12-16px rgba(0,0,0,.2)` → elevation ~8.
  - Sombras teñidas (`rgba(16,188,202,.1)`, `rgba(105,171,60,.1)`) → en Android se pierde el tinte con `elevation`; aceptar gris o usar `react-native-shadow-2`.
- `filter: drop-shadow` sobre íconos → en RN aplicar shadow al contenedor del SVG.

### 6.5 SVG → `react-native-svg`
- RN **no renderiza SVG nativamente**. Necesario `react-native-svg` + `react-native-svg-transformer` (para `import Icon from './icon.svg'`), o convertir los SVG a componentes con `svgr`.
- **58 archivos SVG** a migrar. Priorizar: íconos UI de `images/icons/*` (`semilla.svg` es el más usado), set de fases lunares (`images/Moon/*` — elegir un único set vs. `images/icons/Moon/*`), logos (`logo_Makesens.svg`, `background.svg`).
- **`background.svg`** se usa como `background-image` con `background-size: cover` + `backdrop-filter: blur(25px)` → en RN: SVG/Image de fondo con `resizeMode:'cover'` + `expo-blur` `BlurView` encima.
- **Atención a nombres con espacio/typo**: `eclipses_card_home .svg` (espacio), `cuarto_creceiente.svg` (typo) — renombrar antes de importar (los bundlers de Metro pueden fallar con espacios).
- Limpiar **duplicados PNG/SVG** (`profile/*.png` vs `.svg`, `Buttons.png`, `Text.png`, `brote1.png`) y `.DS_Store`.

### 6.6 Ionicons
- Sustituir `<ion-icon name="...">` por `@expo/vector-icons` (incluye `Ionicons`). Mapeo directo de nombres: `arrow-back-outline`, `close`, `arrow-forward-outline`, `trash-outline`, `share-outline`, `settings-outline`, `notifications-off-outline`. Quitar `addIcons({triangle,ellipse,square})` (eran iconos placeholder de tabs).

### 6.7 GIFs y animaciones
- No hay Lottie. Los GIFs (`confety.gif`, `done_register.gif`, `loader.gif`) se renderizan con `<Image>` en RN (Android **sí** anima GIFs si se habilita Fresco/animated; con Expo usar `expo-image` que soporta GIF/animado). Alternativa de mayor calidad: reemplazar `confety`/`done_register` por Lottie real (`lottie-react-native`) y `loader.gif` por `ActivityIndicator`.

### 6.8 Componentes Ionic shadow-DOM → equivalentes RN (lo más costoso)
Todo el estilado vía `--ion-*` y `::part()` desaparece. Mapeo:
- `ion-content` `--background` / `::part(background)` → `<SafeAreaView>`/`<ScrollView>` con `backgroundColor`.
- `ion-button` (`--border-radius`, `text-transform`) → `<Pressable>`/`TouchableOpacity` + estilos.
- `ion-input` (`--padding-*`, `--highlight-color-*`) → `<TextInput>` con `borderColor` por estado (focus/valid/invalid) gestionado en estado React.
- `ion-tab-bar`/`ion-tab-button` (selección con `tab-selected`, `--background-focused`, `--ripple-color`) → `@react-navigation/bottom-tabs` con `tabBarStyle`/`tabBarActiveTintColor`.
- `ion-segment`/`ion-segment-button` (`--background-checked`, `--indicator-color`) → segmented control propio o lib.
- `ion-checkbox::part(container/label)` → `<Pressable>` + ícono propio.
- `ion-modal` (`--height:auto`, `--width`, `::part(backdrop/content)`, `backdrop-filter:blur`) → `react-native-modal` / Modal de RN + `expo-blur` para el backdrop borroso.
- `ion-chip`, `ion-card`, `ion-list`, `ion-avatar`, `ion-thumbnail`, `ion-img`, `ion-progress-bar`, `ion-segment`, `ion-label`, `ion-icon` → componentes propios/libs RN.
- Selectores frágiles (`#ion-overlay-N`, `body>app-root>...ion-list`) y reglas por host (`app-login`, `app-profile`) **no migran** — reimplementar por componente.

### 6.9 Efectos sin equivalente directo (atención especial)
- `backdrop-filter: blur(...)` → **`expo-blur` `BlurView`** (única vía fiable; el blur de fondo es central en splash y modales).
- `linear-gradient` → **`expo-linear-gradient`** (`global.scss` y reporte ambiental).
- CSS Grid → reescribir con flex (reporte ambiental, `1fr 1fr 1fr` / `1fr 1fr`).
- `@extend %placeholder` → objetos de estilo compartidos.

### 6.10 Theming dinámico por RACIMO en RN (preservar feature)
- Reemplazar `document.documentElement.style.setProperty` (`configuration-app.service.ts:273-285`) por un **`ThemeProvider` + Context** que:
  1. Lea `branding/colors.json` con `expo-file-system` (no bundle).
  2. Fusione esos overrides sobre el `theme.ts` base.
  3. Exponga el theme via hook (`useTheme()`), de modo que los estilos se recalculen al cambiar de RACIMO (las pantallas deben consumir tokens del hook, no constantes estáticas, donde aplique el branding multi-tenant).
- Mantener `ColorsModel`/`ColorData` (HEX/RGB) como contrato; convertir RGB array → `rgb(r,g,b)` string como ya hace `applyColors`.

---

## 7. Verificaciones / cosas que esperaba y NO existen

- **No hay Lottie ni JSON de animación** (solo GIF). Verificado: ninguna dependencia ni `.json` de lottie en `src/app`.
- **No hay `::ng-deep`** en ningún SCSS (0 ocurrencias) — solo `::part()` y un par de selectores de ruta DOM.
- **No hay tokens de spacing/radius definidos** (`--xl`, `--2xl`, `--3xl`, `--4xl`, `--5xl`, `--lg`): solo se consumen con fallback inline (números mágicos).
- **No hay un set de tokens de modo oscuro propio**: el `dark.system.css` de Ionic está importado pero la UI fuerza fondos claros; no hay toggle de tema.
- **No hay redefinición de `--ion-color-primary`/`--ion-color-danger`** propios: se usan valores por defecto de Ionic en los pocos sitios que los referencian.
- Hay **archivos huérfanos/duplicados** (`shapes.svg`, `Buttons.png`, `Text.png`, dos sets de luna, pares PNG/SVG, `.DS_Store`, `splash 2.png`) que NO deben arrastrarse 1:1 a RN.

---

## 8. Archivos de referencia (rutas absolutas)

- `/Users/jose.salamanca/Documents/code/makesens/MakeSens-Apps/UVA-App-Frontend/src/theme/variables.scss`
- `/Users/jose.salamanca/Documents/code/makesens/MakeSens-Apps/UVA-App-Frontend/src/theme/mixins.scss`
- `/Users/jose.salamanca/Documents/code/makesens/MakeSens-Apps/UVA-App-Frontend/src/global.scss`
- `/Users/jose.salamanca/Documents/code/makesens/MakeSens-Apps/UVA-App-Frontend/src/models/configuration/colors.model.ts`
- `/Users/jose.salamanca/Documents/code/makesens/MakeSens-Apps/UVA-App-Frontend/src/models/configuration/measurements.model.ts`
- `/Users/jose.salamanca/Documents/code/makesens/MakeSens-Apps/UVA-App-Frontend/src/models/configuration/config.model.ts`
- `/Users/jose.salamanca/Documents/code/makesens/MakeSens-Apps/UVA-App-Frontend/src/app/core/services/storage/configuration-app.service.ts`
- `/Users/jose.salamanca/Documents/code/makesens/MakeSens-Apps/UVA-App-Frontend/src/app/components/environmental-report/environmental-report.component.scss`
- `/Users/jose.salamanca/Documents/code/makesens/MakeSens-Apps/UVA-App-Frontend/angular.json`
- `/Users/jose.salamanca/Documents/code/makesens/MakeSens-Apps/UVA-App-Frontend/src/assets/` (fonts, icons, images)

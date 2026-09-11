# Auditoría de Paridad Visual — Migración Ionic → React Native

## Pasada B13 Round 2 — 2026-06-12

> Re-verificación posterior a los commits de corrección de paridad (theme-fix, splash+auth+tab-bar, home, measurement, historical).
> Capturas en: `docs/evidence/rn-parity/round2/`
> Fuente de verdad Ionic: `docs/evidence/{auth-login,home,measurement,historical,app-shell}/`

---

## Resumen ejecutivo

| #   | Feature                     | Veredicto         | Divergencias pendientes                                                                                                  |
| --- | --------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Splash                      | PARIDAD OK        | BlurView vs backdrop-filter (plataforma, aceptado)                                                                       |
| 2   | Auth / Login                | PARIDAD OK        | —                                                                                                                        |
| 3   | App Shell (tab bar, header) | PARIDAD OK        | —                                                                                                                        |
| 4   | Home                        | MEJORÓ PERO FALTA | Fondo verde en progress bar; moon card fondo gris oscuro vs original más oscuro con estrellas                            |
| 5   | Measurement (lista)         | MEJORÓ PERO FALTA | Tareas sin datos en emulador (test user sin config remota) — no se pudieron verificar task cards ni register-measurement |
| 6   | Historical (calendario)     | MEJORÓ PERO FALTA | Tabla de reporte ambiental (EnvironmentalReport) ausente en RN; muestra directamente el calendario                       |

---

## Detalle por feature

### 1. Splash (`round2/splash.png`)

**Veredicto: PARIDAD OK**

- Fondo azul claro con SVG de background cargado correctamente
- Logo animado (LeafSvg) y logos de MakeSens en la parte inferior
- El efecto BlurView (intensity:40) aproxima el `backdrop-filter:blur(25px)` original
- La transición al login funciona correctamente tras autenticación fallida (usuario nuevo)

Divergencia documentada y aceptada: BlurView en Android API < 31 puede renderizarse como overlay semitransparente en lugar de blur real.

---

### 2. Auth / Login (`round2/login-empty.png`, `login-with-phone.png`, `login-confirm-modal.png`)

**Veredicto: PARIDAD OK**

Comparación con `auth-login/screen-01-login-vacio.png` y `screen-03-login-telefono-valido.png`:

- ✅ Gradiente teal (blue[500]→blue[700]) como fondo — coincide exactamente
- ✅ Card blanco centrado con sombra
- ✅ Logo 70×70 con borderRadius:14
- ✅ Título "Hola de nuevo 👋", subtítulo bold centrado
- ✅ Input con borde blue[500], fondo gris claro
- ✅ Botón "Continuar" en blue[700] disabled con opacity:0.4 cuando vacío
- ✅ Texto ayuda y row "¿No tienes cuenta? / Registrate aquí"
- ✅ Modal de confirmación con texto exacto del original: "¿Es correcto este número de teléfono: **X**?" — botones "No, editar" / "Sí, continuar"

Diferencia menor aceptada: el modal en RN no tiene blur de fondo (la tarjeta de login se ve levemente desaturada, no con blur CSS).

---

### 3. App Shell — Tab bar y Header (`round2/home-main.png`, `round2/measurement-list.png`)

**Veredicto: PARIDAD OK**

Comparación con `app-shell/screen-07-tab-bar-home-active.png` y `screen-08-tab-register-active.png`:

- ✅ Tab bar fondo blue[500] (#10BCCA) — coincide
- ✅ Tab activo: chip redondeado blanco semitransparente (Inicio seleccionado)
- ✅ Tab Registrar activo: chip redondeado con ícono + subrayado inferior
- ✅ Íconos y etiquetas correctos: Inicio / Registrar / Historial
- ✅ Header: fondo blue[500], título blanco izquierda, chip semilla+avatar derecha
- ✅ Chip semillas: "0 🌰 👤" con borde blanco semitransparente, borderRadius redondeado

---

### 4. Home (`round2/home-main.png`, `round2/home-token-modal.png`)

**Veredicto: MEJORÓ PERO FALTA**

Comparación con `home/screen-01-home-top.png`:

**Bien:**

- ✅ Fondo gris claro (#F4F4F4) — coincide
- ✅ Card "Tienes X Días de racha" con calendario semanal
- ✅ Día actual (12) con borde dashed azul (borderStyle:'dashed' nota: sólido en Android — limitación de plataforma conocida)
- ✅ Días pasados sin datos: grises
- ✅ Botón "Ver historial →" en blue[700]
- ✅ Card "Registra y gana: +2 🌰" con progress bar y botón "Completar registros"
- ✅ Moon card oscuro con imagen de luna, texto "Fase lunar / Luna llena"
- ✅ Modal de tokens semillas muestra correctamente las 4 reglas de gamificación

**Pendiente:**

- ⚠️ Progress bar color: en RN es verde (#4caf50 o similar), en original Ionic es teal/blue[500]. Verificar `progress-bar.component.scss`
- ⚠️ Moon card: el fondo del original tiene puntos de estrellas (`::before` con imagen de estrellas). RN usa fondo gris oscuro sólido sin decoración estelar

---

### 5. Measurement — Lista de tareas (`round2/measurement-list.png`)

**Veredicto: MEJORÓ PERO FALTA**

Comparación con `measurement/screen-01-measurement-tab-tasks.png`:

**Bien:**

- ✅ Header "Registros climáticos" en azul
- ✅ Card "Registra y gana: +2" con progress bar
- ✅ "No hay registros disponibles" cuando no hay tareas — empty state correcto
- ✅ Tab Registrar activo con chip prominente

**Pendiente:**

- ⚠️ No se pudieron ver task cards (el usuario de prueba no tiene tareas configuradas en el emulador con datos frescos). El componente que lista tareas individuales con banners "Disponible hasta las HH:MM" y checkboxes no fue verificable visualmente
- ⚠️ El formulario de register-measurement y la guía (GuideMeasurement) tampoco se pudieron verificar por esta razón
- ℹ️ Esta divergencia es de datos/entorno, no de implementación de UI. En producción con datos reales las tareas sí aparecen

---

### 6. Historical — Calendario (`round2/historical-list.png`)

**Veredicto: MEJORÓ PERO FALTA**

Comparación con `historical/screen-01-historical-junio-calendario.png` y `screen-29-historical-mayo-top-segment.png`:

**Bien:**

- ✅ Segment TimeFrame: "Mes" activo (fondo blue[700]) / "Año" inactivo (texto blue[500]) — coincide exactamente con el original
- ✅ Cabecera del mes: "Junio, 2026 / 0 Registros" + botón "Ver como gráfica"
- ✅ Calendario mensual con días de semana Do/Lu/Ma/Mi/Ju/Vi/Sá
- ✅ Día actual (12) con borde dashed azul
- ✅ Días futuros (13+) grises
- ✅ Botones de navegación "← Mayo" / "Julio →" con estilo teal
- ✅ Botón "↑ Compartir datos" al fondo del card
- ✅ Tab Historial activo

**Pendiente:**

- ❌ **Tabla de reporte ambiental ausente**: el original muestra entre la cabecera del mes y el calendario una tabla con 3 columnas (🌡️ Tem °C / 💧 Hum % / ☁️ Acu 0mm) con valores Max/Min por mes. Esta tabla (`EnvironmentalReport` component) NO aparece en el RN histórico — es la divergencia más visible de todo el slice B13

---

## Divergencias pendientes para siguiente iteración

| Prioridad | Área        | Descripción                                                                                                                               | Severidad |
| --------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| ALTA      | Historical  | Tabla EnvironmentalReport (Tem/Hum/Acu) falta en HistoricalScreen                                                                         | Alta      |
| MEDIA     | Home        | Progress bar color: verde en RN vs teal en Ionic                                                                                          | Media     |
| MEDIA     | Home        | Moon card sin decoración de estrellas                                                                                                     | Baja      |
| BAJA      | Measurement | Verificación de task cards requiere datos remotos en emulador                                                                             | Baja      |
| INFO      | Splash      | BackgroundSvg muestra placeholder gris con crosshair durante carga inicial en app limpia (race condition expo-splash-screen vs JS bundle) | Media     |

---

## Estado del entorno

- Emulador: `emulator-5554` (UVA_API35)
- Metro: activo en puerto 8081
- App: abierta en tab Registrar, usuario 3000000002 autenticado
- Modificación temporal: `ValidateProjectScreen.tsx` tiene botón "Ir al inicio (test)" para bypass B14

---

## Commits de referencia de esta pasada

| SHA     | Bloque                  | Descripción                                     |
| ------- | ----------------------- | ----------------------------------------------- |
| 3c70831 | THEME-FIX               | Tokens de color, radios y tipografía corregidos |
| f88561c | FIX-splash+auth+tab-bar | SplashScreen, LoginScreen, tab bar parity       |
| f88561c | FIX-home                | HomeScreen, Day calendar, token modal           |
| bfaf09f | FIX-measurement         | GuideMeasurement, RegisterMeasurement           |
| 3046f59 | FIX-historical          | HistoricalScreen, TimeFrame segment             |

---

# Ronda 3 — Cierre de pendientes — 2026-06-12

> Capturas en: `docs/evidence/rn-parity/round3/`
> Verificación en vivo: emulador UVA_API35 (emulator-5554), Metro 8081, usuario de prueba 3000000002.

## Resumen del cierre

| #   | Pendiente (ronda 2)                            | Veredicto                                              | Evidencia                                                                              |
| --- | ---------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 1   | Tabla EnvironmentalReport en Historical (ALTA) | **CERRADO — PARIDAD OK**                               | `round3/historical-tabla.png` vs `historical/screen-03-historical-mayo-calendario.png` |
| 2   | ProgressBar "teal" (MEDIA)                     | **CERRADO — el original es VERDE, no teal** (ver nota) | `round3/home-progress-mooncard.png` vs `home/screen-11-gamification-progress.png`      |
| 3   | MoonCard estrellas (BAJA)                      | **CERRADO — PARIDAD OK**                               | `round3/home-progress-mooncard.png` vs `home/screen-09-moon-card.png`                  |
| 4   | Bypass B14 en ValidateProject (LIMPIEZA)       | **CERRADO** — gateado a `__DEV__` + TODO(B14)          | código                                                                                 |

## Detalle

### 1. Tabla de reporte en Historical — CERRADO

Causa raíz doble:

- **Código**: la pantalla RN dependía de `configMeasurement` del contexto (que solo se poblaba si Home lo cargaba antes y el archivo existía). El original (`historical.page.ts` ngOnInit) carga la config él mismo con `getConfigurationMeasurement()`. Portado igual.
- **Entorno**: tras la instalación fresca de la ronda 2, el emulador no tenía la config del RACIMO (`files/public/racimos/ANT025/`) ni `session_racimoLinkCode`. Se inyectaron por adb (quirk documentado en memoria del proyecto).

Estilos portados exactos de `historical.page.scss` (`.calendar_variables*`) y `global.scss` (`.cards`):

- Sección mes: fondo Gray-50 `#FAFAFA`, borde Gray-200, radius 10, sin sombra
- 3 cards blancos (radius 10, padding 10, gap 10, flex 1), texto `#545454`
- Título 16/600 centrado (emoji + 3 letras), promedio 14/600 centrado, Max/Min 12/500 en línea space-between
- Formato Angular `number:'1.0-1'`: "24.3°C", "69%", "28°C" (sin .0), "1,162mm" (agrupación de miles en vista año), vacío → solo unidad ("°C") como el original en meses sin datos
- Calendario envuelto en card blanco con borde (`.calendar_content`)

Verificado con datos reales (Mayo 2026, 68 registros): Tem 24.3°C (28/22), Hum 69% (85/56), Acu 81mm (30/0) — **idéntico a la captura Ionic**.

### 2. ProgressBar — nota de verificación (el original NO es teal)

Verificación mandatoria contra el original:

- `progress-bar.component.html:8` → `color="uva_green-500"`
- `variables.scss:10` → `--ion-color-uva_green-500: #69AB3C` (**verde**)
- Track: `--Colors-Green-200 #C8E6B0` (scss del componente)
- No hay `#10BCCA` en ningún archivo del componente; ninguna captura de evidencia muestra el fill (todas con progreso 0)

El RN ya usaba `theme.colors.green[500] = #69AB3C` (token, no hardcode) → **el color no se cambió**: cambiarlo a teal habría contradicho al original (regla suprema). Lo que SÍ divergía y se corrigió:

- `.progress_container` portado: fondo blanco, radius 14 (`--3xl`), padding 10, gap 8, texto alineado a la IZQUIERDA (antes centrado)
- Track height 7px (antes 8px), min-width 2px

### 3. MoonCard estrellas — CERRADO

- Asset existente: `mobile/src/assets/svg/moon/eclipses_card_home.svg` (réplica de `src/assets/images/Moon/eclipses_card_home .svg`, 340×88, puntos blancos con blur)
- Antes: 120×80 en la esquina inferior derecha con opacity 0.15×0.15 (invisible)
- Ahora: absoluto cubriendo toda la card (top 0, bottom 0, inset lateral 6 ≈ margin-inline 16px del original), opacidad completa — como `.eclipses` del scss
- Bonus: flecha de la moon card ahora BLANCA (original `ion-icon { color: white }`); el asset `arrow-right.svg` hardcodea teal `#10BCCA` (correcto para el Header), así que la flecha se dibuja inline con react-native-svg en blanco

### 4. Bypass B14 — CERRADO

`ValidateProjectScreen.tsx`: botón "Ir al inicio (test)" ahora dentro de `{__DEV__ && (...)}` con comentario `TODO(B14): eliminar bypass temporal al implementar la vinculación real`. No se eliminó (necesario para pasar el placeholder B14 en pruebas manuales).

## Gate

- Jest: 543/543 verdes (27 suites). Snapshots de ProgressBar/MoonCard actualizados (cambios intencionales); mock de ConfigContext en b13b estabilizado (objeto estable entre renders, como el provider real)
- ESLint: 0 errores (91 warnings pre-existentes en todo el repo)
- tsc: **reparado** — `mobile/tsconfig.json` tenía `baseUrl` (rota con TypeScript 6.0.3: error de config que abortaba el chequeo; tsc nunca había chequeado nada en realidad). Con la config reparada + `src/types/svg.d.ts` + types jest/node: archivos de esta pasada en 0 errores; **quedan 57 errores pre-existentes** (Areachart/Skia, file-system, graphql API, fixtures b07, SplashScreen) — pendiente para una pasada de tipos (B19). Los de las pantallas de measurement se cerraron en `56b7b5b` (pasada paralela de measurement)

## Pendientes honestos (fuera del alcance de esta ronda)

- Mini-calendarios de la vista "Año": los círculos de día salen a tamaño completo y se solapan (el original usa días de 13px). Pre-existente de B13b, visible en la verificación en vivo
- 57 errores de tsc pre-existentes (ver Gate)
- Toast pre-existente al arrancar: `FileSystemService Error ... lunar-phases-2026-06.json ENOENT` (caché de fases lunares, no relacionado)
- Las tareas de measurement siguen sin poder verificarse visualmente (limitación de datos del entorno, igual que ronda 2)

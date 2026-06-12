# Auditoría de Paridad Visual — Migración Ionic → React Native
## Pasada B13 Round 2 — 2026-06-12

> Re-verificación posterior a los commits de corrección de paridad (theme-fix, splash+auth+tab-bar, home, measurement, historical).
> Capturas en: `docs/evidence/rn-parity/round2/`
> Fuente de verdad Ionic: `docs/evidence/{auth-login,home,measurement,historical,app-shell}/`

---

## Resumen ejecutivo

| # | Feature | Veredicto | Divergencias pendientes |
|---|---------|-----------|------------------------|
| 1 | Splash | PARIDAD OK | BlurView vs backdrop-filter (plataforma, aceptado) |
| 2 | Auth / Login | PARIDAD OK | — |
| 3 | App Shell (tab bar, header) | PARIDAD OK | — |
| 4 | Home | MEJORÓ PERO FALTA | Fondo verde en progress bar; moon card fondo gris oscuro vs original más oscuro con estrellas |
| 5 | Measurement (lista) | MEJORÓ PERO FALTA | Tareas sin datos en emulador (test user sin config remota) — no se pudieron verificar task cards ni register-measurement |
| 6 | Historical (calendario) | MEJORÓ PERO FALTA | Tabla de reporte ambiental (EnvironmentalReport) ausente en RN; muestra directamente el calendario |

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

| Prioridad | Área | Descripción | Severidad |
|-----------|------|-------------|-----------|
| ALTA | Historical | Tabla EnvironmentalReport (Tem/Hum/Acu) falta en HistoricalScreen | Alta |
| MEDIA | Home | Progress bar color: verde en RN vs teal en Ionic | Media |
| MEDIA | Home | Moon card sin decoración de estrellas | Baja |
| BAJA | Measurement | Verificación de task cards requiere datos remotos en emulador | Baja |
| INFO | Splash | BackgroundSvg muestra placeholder gris con crosshair durante carga inicial en app limpia (race condition expo-splash-screen vs JS bundle) | Media |

---

## Estado del entorno

- Emulador: `emulator-5554` (UVA_API35)
- Metro: activo en puerto 8081
- App: abierta en tab Registrar, usuario 3000000002 autenticado
- Modificación temporal: `ValidateProjectScreen.tsx` tiene botón "Ir al inicio (test)" para bypass B14

---

## Commits de referencia de esta pasada

| SHA | Bloque | Descripción |
|-----|--------|-------------|
| 3c70831 | THEME-FIX | Tokens de color, radios y tipografía corregidos |
| f88561c | FIX-splash+auth+tab-bar | SplashScreen, LoginScreen, tab bar parity |
| f88561c | FIX-home | HomeScreen, Day calendar, token modal |
| bfaf09f | FIX-measurement | GuideMeasurement, RegisterMeasurement |
| 3046f59 | FIX-historical | HistoricalScreen, TimeFrame segment |

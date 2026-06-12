# Evidencia Visual — Dashboard Principal (HomePage)

**Feature:** Dashboard principal (`/app/tabs/home`)
**Fecha de captura:** 2026-06-11
**Usuario de prueba:** 3000000002 (auto-confirmado, sin OTP)
**Viewport:** Samsung Galaxy S8 — 360×740 px (DPR 3)

---

## Condiciones de la sesión

- **Usuario:** 3000000002, vinculado al proyecto UVA de prueba.
- **Estado de datos (IndexedDB):** `user_Measurement` con 10 000 registros sincronizados; `user_UserProgress` con 3 709 registros.
- **Estado actual del usuario (junio 2026):** Streak = 0, Semillas = 0, sin mediciones registradas hoy.
- **Mes con datos históricos:** Mayo 2026 (68 registros — temperatura, humedad, lluvia).
- **Workaround aplicado:** Tras login, se navega directamente a `/app/tabs/home` para saltear el cuelgue de `waitForSyncDataStore()` en web (limitación conocida del entorno browser; en nativo funciona).

---

## Flujo recorrido

1. Login con teléfono 3000000002 → confirmación modal "Sí, continuar".
2. Goto directo a `/app/tabs/home` (workaround DataStore).
3. Verificación de IndexedDB: `user_Measurement` con 10 000 registros confirmados.
4. Recarga de página (`reload`) para asegurar que `ionViewWillEnter` recarga progreso real.
5. Captura del estado principal: 0 días de racha, 0 semillas, progreso 0/1.
6. Apertura secuencial de los 4 modales de información:
   - `modal_Days` → clic en icono "ⓘ" de la tarjeta de racha.
   - `modal_Days_question` → clic en "Siguiente" dentro de `modal_Days`.
   - `modal_token` → clic en icono "ⓘ" de la tarjeta de semillas.
   - `modal_token_2` → clic en "Siguiente" dentro de `modal_token`.
7. Capturas de elemento de la tarjeta lunar, cabecera y secciones individuales.

---

## Variantes encontradas

| Variante | Descripción |
|---|---|
| **Estado racha cero** | `Streak = 0`, texto "Tienes 0 Días de racha 😌". Progreso 0/1. |
| **Semillas cero** | Header muestra "0" junto al ícono de semilla. |
| **Día actual sin datos** | Junio 2026: ningún día completo ni incompleto en el calendario semanal — todos los días anteriores al hoy aparecen sin marcadores; el día de hoy (11) tiene círculo punteado "por registrar". |
| **Fase lunar dinámica** | "Cuarto menguante" — la tarjeta muestra la fase calculada en tiempo real por `MoonPhaseService`. |

---

## Tabla de capturas

| # | Archivo | Descripción |
|---|---|---|
| 01 | `screen-01-home-top.png` | Vista completa del home desde el top (primera carga, antes de reload). Header, fecha, tarjeta de racha, calendario semanal, progreso/semillas, tarjeta lunar, tab bar. |
| 02 | `screen-02-home-bottom.png` | Vista tras hacer scroll hacia abajo — confirma que el contenido es mayor que el viewport en ~3 px (scrollHeight 743 vs viewport 740). |
| 03 | `screen-03-home-full-top.png` | Home con scroll reseteado al top (igual que 01, confirmación). |
| 04 | `screen-04-tab-bar.png` | Zoom del tab bar inferior: "Inicio" activo (fondo claro + ícono casa), "Registrar" y "Historial" inactivos. |
| 05 | `screen-05-modal-days-states.png` | Modal `modal_Days`: explica los tres estados de los días del calendario (completo ✓, incompleto, por registrar). Bottom sheet con drag handle visible. |
| 06 | `screen-06-modal-days-question.png` | Modal `modal_Days_question`: ejemplo visual de la racha con calendario ilustrado. Tiene botón de back (←) y X para cerrar. |
| 07 | `screen-07-modal-token-seeds.png` | Modal `modal_token`: explicación de semillas (+2 por día completo, +1 por día parcial, 5 semillas para recuperar racha, +3 por 7 días consecutivos). |
| 08 | `screen-08-modal-token-germination.png` | Modal `modal_token_2`: germinación mensual según semillas acumuladas (11-40 → brote, 41-63 → plántula, >63 → flor, 0-10 → nada). |
| 09 | `screen-09-moon-card.png` | Captura del componente `MoonCardComponent` aislado: imagen lunar, label "Fase lunar", nombre de la fase y flecha de navegación. |
| 10 | `screen-10-header.png` | Cabecera aislada: toolbar azul con título "Inicio", chip de semillas (seed + ícono + avatar). |
| 11 | `screen-11-gamification-progress.png` | Sección de gamificación/progreso: título "Registra y gana: +2 🌰", ícono info, barra de progreso "Progreso: 0 de 1", botón "Completar registros". |
| 12 | `screen-12-streak-calendar.png` | Sección de racha + calendario semanal: título "Tienes Días de racha 😌", cabecera de días (D/L/M/M/J/V/S), fila de fechas con el día actual marcado. |
| 13 | `screen-13-home-state-zero-streak.png` | Estado completo del home antes del reload (Streak null → texto sin número). |
| 14 | `screen-14-home-reload-with-data.png` | **Captura de referencia principal.** Después del reload con datos correctos: "Tienes 0 Días de racha", semillas "0" en header, progreso 0/1, luna "Cuarto menguante". |
| 15 | `screen-15-home-scrolled-moon-visible.png` | Después de mousewheel — el contenido apenas supera el viewport; visualmente idéntico al 14 (la tarjeta lunar ya es visible sin scroll). |
| 16 | `screen-16-header-seed-count.png` | Header recortado mostrando el chip de semillas con valor "0" + ícono acorn + avatar. |

---

## Variantes NO capturadas

| Variante | Razón |
|---|---|
| **Racha > 0 (ej. 10 días)** | El usuario tiene Streak=0 en junio 2026. El record histórico de Streak=10 (mayo 2026) ya no está activo. Habría que crear un caso de prueba con un usuario con racha activa o avanzar el calendario al mes pasado — fuera del alcance de esta captura. |
| **Semillas > 0 (ej. 49 semillas)** | Misma razón: el estado actual es Seed=0. |
| **Alertas/popups de gamificación al entrar** | No aparecieron alertas al entrar porque el usuario no tiene tareas pendientes de gamificación (el servicio `GamificationAlertsService` no disparó ninguna alerta). Estos popups solo se activan tras completar tareas, ganar racha o alcanzar hitos, ninguno de los cuales ocurrió en esta sesión. |
| **Días del calendario marcados (completo/incompleto)** | Junio 2026 no tiene ninguna medición, por lo que todos los días aparecen neutros/por registrar. Para ver días marcados en verde/naranja habría que estar en mayo 2026 o registrar una medición (no permitido por reglas de seguridad del inventario). |
| **Progreso > 0 (ej. 1 tarea completada hoy)** | No hay mediciones en el día actual. |
| **Notificación badge en perfil visible desde home** | No se puede acceder desde el home — solo visible en `/profile`. |

---

## Notas visuales para implementadores React Native

### Colores
- **Fondo toolbar/header:** `#2dc5c4` (turquesa UVA, token `uva_blue-500`).
- **Botones principales** (Ver historial, Completar registros): `uva_blue-600` — tono más oscuro del turquesa.
- **Texto del tab activo:** blanco sobre fondo claro redondeado.
- **Tarjeta de racha/semillas:** fondo blanco con sombra ligera, borde redondeado.
- **Tarjeta lunar:** fondo oscuro (casi negro), texto blanco, luna sobre fondo estrellado.
- **Progreso:** barra horizontal verde claro sobre fondo gris muy claro.

### Espaciado y layout
- El home **cabe sin scroll** en 360×740 (scrollHeight apenas 3 px extra). Diseñar como pantalla no-scrollable es válido salvo en dispositivos más pequeños.
- Las tarjetas tienen `ion-margin-top` entre ellas (~16 px).
- El tab bar mide ~64 px de altura; la `ion-content` ocupa el resto.

### Componentes críticos a implementar en RN
- **HeaderComponent:** toolbar fija con título, chip de semillas (número + ícono acorn + avatar), navega a `/profile` al tocar.
- **CalendarComponent (vista `week`):** 7 columnas D/L/M/M/J/V/S + fila de números de día; el día actual en círculo punteado; días completos con check verde; días incompletos en naranja/vacío.
- **ProgressBarComponent:** texto "Progreso: X de Y" + barra horizontal.
- **MoonCardComponent:** imagen de la luna, texto de la fase, flecha de navegación; toca toda la tarjeta para ir a `/app/tabs/moon-phase`.

### Modales (bottom sheets)
- Todos los modales son **ion-modal con breakpoints [0,1] initialBreakpoint=1** — equivalen a un `BottomSheet` que cubre toda la pantalla desde abajo.
- Tienen un "drag handle" gris visible en la parte superior.
- La secuencia `modal_Days → modal_Days_question` y `modal_token → modal_token_2` usa `setTimeout(300ms)` entre cierre y apertura para evitar conflictos de animación — en RN se puede usar `onDismiss` callback.
- Los modales de "pregunta" tienen botón ← (volver al anterior) y × (cerrar todo) en la cabecera.

### Animaciones y comportamientos
- `ionViewWillEnter` recarga el progreso, la fase lunar y las tareas de la semana cada vez que se vuelve al home — en RN usar `useFocusEffect`.
- El modal `modal_token_2` hace scroll interno para mostrar los 4 rangos de germinación; implementar como `ScrollView` en RN.
- No hay animaciones de entrada/salida personalizadas en el home más allá de los modales.
- El ícono "ⓘ" en las tarjetas abre los modales; es un SVG local, no Ionicon nativo.

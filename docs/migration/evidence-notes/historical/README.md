# Evidencia Visual — Histórico de Mediciones

> Inventario visual generado para la migración Ionic/Angular 18 → React Native (Expo + Dev Builds).
> Todas las capturas son del viewport Samsung Galaxy S8 (360 × 740 px, CSS pixels, escala 3×).

## Condiciones de la sesión

| Parámetro              | Valor                                   |
| ---------------------- | --------------------------------------- |
| Usuario de prueba      | `3000000002` (auto-confirmado, sin OTP) |
| Fecha de captura       | 2026-06-11 (jueves)                     |
| Mes con datos          | Mayo 2026 — 68 registros                |
| Mes vacío              | Junio 2026 — 0 registros                |
| Mes parcial            | Abril 2026 — 41 registros               |
| IndexedDB sincronizado | `user_Measurement` count: 10 000        |

## Flujo recorrido paso a paso

1. Login con `3000000002` → modal de confirmación → `goto /app/tabs/home` (workaround DataStore).
2. Verificado que `user_Measurement` en IndexedDB tiene 10 000 registros.
3. Navegado a `/app/tabs/history` → captura estado **Junio 2026** vacío.
4. Clic en botón "Mayo" → captura **Mayo 2026** con datos.
5. Toggle "Ver como gráfica" → capturas de los tres gráficos (Tem, Hum, Acu).
6. Toggle "Año" (via JavaScript `.click()` sobre el `ion-segment-button`) → vista anual.
7. Regreso a Mes/Mayo → clic en **día 02** (completo) → `measurement-detail` con registros completados.
8. Regreso → clic en **día 08** (normal, sin datos) → `measurement-detail` sin datos.
9. Navegado a **Abril 2026** → clic en **día 02** (incompleto: 1 tarea completada, 2 sin completar).
10. Navegado a **Junio 2026** → clic en **día 10** (ayer, estado `normal` = no data).
11. Navegado directamente via URL a **June 10 con `state=incomplete`** → alerta de semillas insuficientes.
12. Clic en "Compartir datos" desde Mayo → toast "Reporte compartido exitosamente".
13. Cierre de sesión del browser con `playwright-cli close`.

---

## Tabla de capturas

| #   | Archivo                                               | Pantalla / Estado                                       | Notas clave                                                                                                                  |
| --- | ----------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 01  | screen-01-historical-junio-calendario.png             | Histórico — Junio 2026 calendario, estado vacío         | Segmento Mes/Año, 0 Registros, día 11 resaltado con borde discontinuo (hoy), stats vacíos                                    |
| 02  | screen-02-historical-junio-calendario-scroll.png      | Histórico — Junio scroll inferior                       | Botones "Mayo" / "Julio", botón "Compartir datos"                                                                            |
| 03  | screen-03-historical-mayo-calendario.png              | Histórico — Mayo 2026 calendario, con datos             | 68 Registros, stats Tem/Hum/Acu, días con checkmark vs sin datos                                                             |
| 04  | screen-04-historical-mayo-calendario-scroll.png       | Histórico — Mayo scroll inferior                        | Navegación entre meses (Abril / Junio), botón "Compartir datos"                                                              |
| 05  | screen-05-historical-mayo-grafica.png                 | Gráfica Mayo — primera vista (sin scroll)               | Header + stats strip visible pero chart fuera del viewport                                                                   |
| 06  | screen-06-historical-mayo-grafica-chart.png           | Gráfica Mayo — Temperatura (Tem) seleccionada           | Gráfica de área con banda de confianza, eje X con fechas del mes, Tem card destacada con borde                               |
| 07  | screen-07-historical-mayo-grafica-hum.png             | Gráfica Mayo — Humedad (Hum) seleccionada               | Curva de humedad, misma estructura de área+banda, Hum card destacada                                                         |
| 08  | screen-08-historical-mayo-grafica-acu.png             | Gráfica Mayo — Acumulado de lluvia (Acu) seleccionado   | Acu card destacada; datos de precipitación                                                                                   |
| 09  | screen-09-historical-mayo-calendario-top.png          | Mayo — vista calendario desde el principio              | Misma vista que 03 pero con canvas renderizado en posición correcta                                                          |
| 10  | screen-10-historical-timeframe-ano.png                | Selector Año activado — vista anual 2026                | Mini-calendarios de 12 meses, año selector con flechas (2025 / 2027), stats anuales                                          |
| 11  | screen-11-historical-timeframe-ano-scroll.png         | Vista anual — scroll inferior                           | Meses julio–diciembre en miniatura                                                                                           |
| 12  | screen-12-measurement-detail-complete.png             | Detalle de medición — día completo (02/05/2026)         | DayComponent teal+checkmark, "Registros completados", tarjetas de Tem tarde y mañana con min/max                             |
| 13  | screen-13-measurement-detail-scroll.png               | Detalle completo — scroll                               | Lluvia completada con valor 10mm                                                                                             |
| 14  | screen-14-measurement-detail-bottom.png               | Detalle completo — fondo (sin más contenido)            | Confirma que el contenido termina con la tarjeta de lluvia                                                                   |
| 15  | screen-15-measurement-detail-normal.png               | Detalle de medición — día normal/sin datos (08/05/2026) | Día sin círculo de racha, "Registros sin completar" con 3 checkboxes vacíos                                                  |
| 16  | screen-16-historical-junio-empty-state.png            | Junio — estado vacío completo con calendario            | Día 11 con borde discontinuo (hoy), días pasados sin decoración, stats vacíos                                                |
| 17  | screen-17-historical-junio-grafica-vacia.png          | Gráfica Junio — vacía                                   | Área de Chart.js sin datos: solo grid y eje X con fechas                                                                     |
| 18  | screen-18-historical-mayo-grafica-tem-top.png         | Gráfica Mayo Tem — captura top completa                 | Stats strip + gráfica en un solo viewport, Tem card con borde activo                                                         |
| 19  | screen-19-historical-mayo-grafica-hum-top.png         | Gráfica Mayo Hum — captura top completa                 | Hum card con borde activo                                                                                                    |
| 20  | screen-20-historical-mayo-grafica-acu-top.png         | Gráfica Mayo Acu — captura top completa                 | Acu card con borde activo, menor amplitud de curva                                                                           |
| 21  | screen-21-historical-abril-calendario.png             | Abril 2026 — 41 registros, vista calendario             | Mezcla visible de días completos (círculo teal sólido+checkmark), días con círculo teal sin checkmark, y días sin decoración |
| 22  | screen-22-measurement-detail-incomplete.png           | Detalle — día incompleto (02/04/2026)                   | "Registros completados" (Tem tarde) + "Registros sin completar" (Tem mañana + Lluvia) en la misma vista                      |
| 23  | screen-23-measurement-detail-incomplete-bottom.png    | Detalle incompleto — scroll (mismo día)                 | Confirmación de que no hay botón de racha (no es "ayer")                                                                     |
| 24  | screen-24-measurement-detail-yesterday-normal.png     | Detalle — ayer (10/06/2026) estado normal               | Sin datos, sin botón de racha (state=normal)                                                                                 |
| 25  | screen-25-measurement-detail-incomplete-yesterday.png | Detalle — ayer (10/06/2026) estado incompleto           | Alerta amarilla "No tienes suficientes semillas para recuperar tu racha, necesitas: 5"                                       |
| 26  | screen-26-historical-mayo-compartir-button.png        | Mayo — botón "Compartir datos" visible                  | Scroll inferior del calendario mostrando el botón de compartir                                                               |
| 27  | screen-27-historical-compartir-loading.png            | "Compartir datos" — toast de éxito                      | Toast verde "Reporte compartido exitosamente" en la parte inferior                                                           |
| 28  | screen-28-historical-mayo-calendar-complete.png       | Mayo — vista completa del calendario (sin segmento)     | Vista media sin el header Mes/Año                                                                                            |
| 29  | screen-29-historical-mayo-top-segment.png             | Mayo — vista completa desde arriba                      | Segmento Mes/Año + nombre mes + nRegistros + "Ver como gráfica" + stats strip + calendario                                   |

---

## Variantes NO capturadas

| Variante                                                               | Razón                                                                                                                                                                               |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Botón "Recupera tu racha" visible                                      | Requiere `state=incomplete` + `isYesterday` + el usuario tiene ≥ 5 semillas. El usuario de prueba tiene 0 semillas, por lo que solo se muestra la alerta de semillas insuficientes. |
| Modal de confirmación de pago de semillas (AlertComponent)             | Depende de tener ≥ 5 semillas; no alcanzable con el usuario de prueba.                                                                                                              |
| Alerta "Día completado con semillas"                                   | Requiere haber pagado con semillas exitosamente; idem.                                                                                                                              |
| Toast de error "Error al compartir el reporte. Intenta de nuevo."      | No ocurrió en la sesión; la función de compartir como texto funcionó correctamente.                                                                                                 |
| Toast "La función de compartir no está disponible en este dispositivo" | Requiere `canShare()` = false (nativo), no aplica en browser.                                                                                                                       |
| Estado de "día futuro" en el detalle                                   | Los días futuros del calendario no son clickeables (el código los filtra con `!isFuture`); no navegan a `measurement-detail`.                                                       |
| Vista de Año con datos de múltiples años                               | Solo existen datos en 2026; los años 2025 y 2027 tienen mini-calendarios vacíos.                                                                                                    |
| Loader manual inyectado en DOM ("showAlternativeLoader")               | Requiere que el `LoadingController` de Ionic falle en el browser — no ocurrió en la sesión.                                                                                         |

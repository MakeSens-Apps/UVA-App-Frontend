# Evidencia Visual — Flujo de Medición

> Inventario visual capturado el 2026-06-12 para la migración Ionic/Angular 18 → React Native.
> Viewport: Samsung Galaxy S8 (360×740). Usuario de prueba: `3000000002`.

---

## Condiciones de captura

- **Usuario**: `3000000002` (usuario de prueba — omite OTP, sesión activa)
- **Fecha de captura**: 2026-06-12 (jueves)
- **Estado de tareas**: todas las tareas del día estaban sin completar y con restricciones de horario activas
  - "Temperatura y humedad (mañana)" — disponible hasta las 08:00
  - "Registro de lluvias" — disponible hasta las 08:00
  - "Temperatura y humedad (tarde)" — disponible hasta las 20:00
- **Sin envíos reales**: ningún registro fue guardado para no contaminar datos del usuario de prueba
- **Modo restricción de tiempo activo**: las tareas muestran banner de restricción horaria (no se pudo navegar dentro del flujo normal por restricción de tiempo — se usó navegación directa por URL)

---

## Flujo recorrido paso a paso

1. Login con `3000000002` → `goto /app/tabs/home` (workaround DataStore)
2. `goto /app/tabs/register` → captura pantalla principal de medición
3. Click en tarea "Temperatura y humedad (mañana)" → navega a `register-measurement-new?flowId=flow1&taskId=task1`
4. Guía `flow1` se auto-abre (guide1 — lista de pasos, "Entendido") → captura
5. Cerrar guía → captura formulario vacío de flow1 (Temperatura máx + Humedad máx)
6. Click "¿Cómo ver este dato?" → abrir guía manualmente → captura
7. Llenar temperatura=28°C, humedad=65% → captura formulario diligenciado
8. Cambiar temperatura a 99°C (fuera de rango máx=38°C) → captura alerta de validación inline
9. Restaurar temperatura=28°C → click "Guardar registro" → captura modal de confirmación → Escape para cancelar
10. Regreso a `/app/tabs/register` → click "Registro de lluvias" → navega a `flow3/task2`
11. Guía rain step 1 se auto-abre ("Siguiente") → captura
12. Click "Siguiente" → guía rain step 2 (texto HTML de menisco) → captura → cerrar
13. Captura formulario vacío lluvia (3 dígitos — mm)
14. Llenar 025mm → captura formulario diligenciado
15. Regreso a `/app/tabs/register` → click "Temperatura y humedad (tarde)" → `flow1/task3` → captura guía (idéntica a mañana)
16. `goto /register-measurement-new?flowId=flow2&taskId=task1` (minimos) → guía flow2 auto-abre → captura → cerrar → captura formulario vacío minimos
17. Captura pantalla medición con progress bar
18. Scroll en formulario para ver botón "Guardar registro" al fondo
19. `goto /register-measurement-new?flowId=flow3&taskId=task2&backButtom=false` → captura header sin botón back (modo flujo encadenado)
20. Click a través de guía lluvia paso 1 y 2 de nuevo → capturas adicionales
21. Cierre del browser

---

## Variantes encontradas

### Mecanismo de input: dígitos individuales

El formulario usa **un input por dígito** (`ion-input`, `inputmode="numeric"`, `type="number"`, `maxlength="1"`). No es un teclado personalizado sino `inputmode="numeric"` que invoca el teclado numérico nativo. El foco avanza automáticamente al siguiente dígito tras ingresar uno (auto-avance gestionado por `onDigitsChange`).

### Tipos de contenido en guías (texto S3)

Los guides se cargan desde S3 vía `ConfigurationAppService.loadImage`. Se encontraron 3 formatos de texto en guías:

1. **Array de strings** (lista HTML `<ul><li>`): flow1/guide1 y flow2/guide1 — instrucciones paso a paso del termohigrómetro
2. **HTML dinámico** (párrafos `<p>`): flow3/guide2 — descripción del menisco con dos párrafos
3. **Texto simple**: no observado en este usuario pero soportado por el componente

### Cadena de flujos (nextFlow)

- `flow1` (Registro máximos: Temp máx + Hum máx) → `nextFlow: flow2`
- `flow2` (Registro mínimos: Temp mín + Hum mín) → `nextFlow: null` (fin)
- `flow3` (Precipitaciones: 3 dígitos en mm) → flujo independiente

### Número de dígitos por medición

- Temperatura (°C): **2 dígitos** → rango 0–38°C máx, valores mínimos distintos
- Humedad (%): **2 dígitos** → rango 0–100%
- Lluvia (mm): **3 dígitos** → rango 0–999mm

### Header: back vs. centrado

- Cuando `backButtom=true` (default): header con botón de retroceso a `/app/tabs/register`
- Cuando `backButtom=false` (flujo encadenado): header sin back, título centrado

### Alerta de validación inline

Aparece dentro del card de la medición cuando el valor completo está fuera del rango `min/max` definido en la config. Muestra: ícono de exclamación + "¿Estás seguro de este dato?" + mensaje generado dinámicamente "La {sortName} no puede ser {menor|mayor} a {valor} {unidad}". El fondo NO tiene blur al mostrar esta alerta.

### Blur al abrir modal de confirmación

Cuando se abre `modal_modal_confirmation`, el contenido de `ion-content` recibe la clase `blur`. Este efecto no ocurre con el modal de guía.

### Restricciones de horario

Cada task card muestra un banner superior con texto dinámico: "Disponible hasta las HH:MM" o "Disponible en X horas". El `goToRegister` se bloquea si hay restricción activa (excepto usuarios de prueba). El click en una tarea restringida sí navega al formulario si es `isTestUser`.

---

## Tabla de capturas

| #   | Archivo                                       | Pantalla                                   | Descripción                                                                                                                                                                                      |
| --- | --------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 01  | screen-01-measurement-tab-tasks.png           | Tab Registrar                              | Lista de tareas del día: 3 sin completar con banners de restricción horaria, progress bar "0 de 3", botón "Registra y gana: +2🌱"                                                                |
| 02  | screen-02-register-measurement-empty.png      | register-measurement (flow1)               | Idéntico a screen-03 — la guía se auto-abrió antes de poder capturar el formulario vacío solo                                                                                                    |
| 03  | screen-03-guide-flow1-step1.png               | Guía flow1 (Registro máximos) auto-abierta | Modal de guía con lista de pasos (array format): instrucciones del botón ADJ-MAX/MIN del termohigrómetro. Imagen de S3 cargada. Botón "Entendido" (sin nextGuide)                                |
| 04  | screen-04-register-form-flow1-empty.png       | register-measurement flow1 vacío           | Formulario limpio después de cerrar la guía: 2 cards (Temperatura máxima / Humedad máxima), 2 spinbuttons cada uno, unidades °C y %, link "¿Cómo ver este dato?"                                 |
| 05  | screen-05-guide-manual-flow1.png              | Guía flow1 abierta manualmente             | Mismo modal de guía abierto vía click en "¿Cómo ver este dato?". Confirma que la guía manual es idéntica a la auto-abierta                                                                       |
| 06  | screen-06-register-form-flow1-filled.png      | register-measurement flow1 diligenciado    | Temperatura=28°C, Humedad=65% ingresados. Campos con valores visibles en los spinbuttons individuales                                                                                            |
| 07  | screen-07-register-form-out-of-range.png      | Alerta de validación inline                | Temperatura=99°C (fuera de rango máx 38°C). Alerta aparece: "¿Estás seguro de este dato? La temperatura max no puede ser mayor a 38 °C" con ícono de exclamación naranja/rojo                    |
| 08  | screen-08-register-form-valid-after-error.png | register-measurement flow1 restaurado      | Temperatura=28°C de vuelta, alerta desaparecida. Mismo estado que screen-06                                                                                                                      |
| 09  | screen-09-confirmation-modal.png              | Modal de confirmación                      | "Verifica los datos 🧐". Muestra los mismos cards con valores (28°C / 65%) en una sheet modal. Botón "Guardar registro" al fondo. Sin blur de fondo visible aquí (valores vacíos en ese momento) |
| 10  | screen-10-guide-rain-step1.png                | Guía lluvia paso 1 (Siguiente)             | Modal de guía flow3 step 1: texto simple "Ten en cuenta esta información para medir las lluvias", imagen de S3. Botón "Siguiente" (tiene nextGuide)                                              |
| 11  | screen-11-guide-rain-step2.png                | Guía lluvia paso 2 (HTML)                  | Modal de guía flow3 step 2: 2 párrafos HTML sobre lectura del menisco en el pluviómetro. Botón "Entendido" (sin nextGuide)                                                                       |
| 12  | screen-12-rain-form-empty.png                 | register-measurement flow3 vacío           | Formulario de lluvia limpio: 1 card "Precipitaciones", 3 spinbuttons (3 dígitos), unidad "mm"                                                                                                    |
| 13  | screen-13-rain-form-filled.png                | register-measurement flow3 diligenciado    | Precipitaciones=025mm ingresados                                                                                                                                                                 |
| 14  | screen-14-guide-tarde-flow1.png               | Guía tarde flow1 (duplicado)               | Guía auto-abierta para "Temperatura y humedad (tarde)" — idéntica a screen-03/flow1 (mismo flowId)                                                                                               |
| 15  | screen-15-guide-flow2-minimos.png             | Guía flow2 (Registro mínimos)              | Modal de guía flow2: lista de pasos para leer valores mínimos del termohigrómetro (Mantenga oprimido ADJ-MAX/MIN...). Botón "Entendido"                                                          |
| 16  | screen-16-register-form-flow2-empty.png       | register-measurement flow2 vacío           | Formulario de mínimos limpio: 2 cards (Temperatura mínima / Humedad mínima), 2 spinbuttons cada uno                                                                                              |
| 17  | screen-17-measurement-tab-with-progress.png   | Tab Registrar (redundante)                 | Idéntico a screen-01, muestra el mismo estado de tareas con progress bar                                                                                                                         |
| 18  | screen-18-register-form-bottom.png            | register-measurement scroll                | Formulario de flow1 scroll 300px hacia abajo. Idéntico a screen-19 (scroll no produjo cambio visible extra en el viewport de 740px)                                                              |
| 19  | screen-19-register-form-save-button.png       | register-measurement scroll adicional      | Igual que screen-18 — el formulario cabe en una sola pantalla de 740px de altura                                                                                                                 |
| 20  | screen-20-confirmation-modal-with-blur.png    | Modal de confirmación con blur             | Modal "Verifica los datos 🧐" abierto con el formulario vacío como fondo (sin datos llenados — los refs viejos no coincidieron). El efecto blur del `ion-content` es visible                     |
| 21  | screen-21-header-no-back-button.png           | Header centrado (backButtom=false)         | Guía rain auto-abierta, header de fondo sin botón de retroceso — título "Registro de lluvias" centrado. Modo flujo encadenado                                                                    |
| 22  | screen-22-guide-rain-step2-alt.png            | Guía lluvia paso 2 (segunda captura)       | Segunda captura del step 2 de la guía de lluvia — idéntico al contenido de screen-11                                                                                                             |

---

## Variantes NO capturadas

| Variante                                                               | Razón                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modal `modal_register_Ok` ("X guardados" + gif done_register.gif)      | Requería hacer `save()` real que crearía un registro de medición real en DynamoDB — prohibido por reglas de seguridad. Se documenta por código: gif en `assets/images/done_register.gif`, texto `{flow.name} guardados`, botón "Siguiente" si hay `nextFlow` |
| Estado "Registros completados" en el tab Registrar                     | Todas las tareas del usuario de prueba estaban sin completar el día de la captura. Se muestra en `measurement.page.html:64-95` con checkboxes marcados y valores `{sortName} {value}{unit}`                                                                  |
| Modal "Sorpresa" (bonus moniliasis)                                    | El bonus solo aparece en días/semanas/meses específicos según config remota. El 2026-06-12 (jueves, semana 2 de junio) no cumplía las condiciones. El modal muestra: pregunta de sí/no, botones "Si", "No", "Omitir"                                         |
| Alerta de restricción cruzada entre mediciones (`validateRestriction`) | Requiere valores específicos que violen restricciones entre mediciones del mismo flujo (ej. temperatura mínima > máxima). No se exploró por complejidad de condiciones                                                                                       |
| Formulario con datos del flujo `flow4` o superiores (si existen)       | La config remota puede tener flujos adicionales — solo se verificaron flow1, flow2, flow3 que corresponden a las tareas visibles                                                                                                                             |
| Estado de progreso parcial (1/3 o 2/3 tareas completadas)              | No se completó ninguna tarea para no crear registros reales                                                                                                                                                                                                  |
| Header con back button visible (sin guía abierta encima)               | La guía se auto-abría inmediatamente cubriendo el header. Se puede inferir de screen-04 donde el header sí es visible con back button                                                                                                                        |
| Checkbox "Mostrar automaticamente" en guía — estado marcado            | El checkbox no tiene binding funcional (`guide-measurement.component.html:40-47`) — al abrirse de nuevo la guía se abre igual                                                                                                                                |

---

## Notas para implementación React Native

Ver sección `ui_notes` del StructuredOutput adjunto para detalles técnicos completos.

Resumen clave:

- Los inputs de dígitos son **individuales por dígito** — implementar con un array de `TextInput` con `maxLength=1`, `keyboardType="numeric"`, y focus-advance manual en `onChangeText`.
- La guía usa `SafeHtmlPipe` para renderizar HTML de S3 — en RN necesitará `react-native-render-html` o similar.
- El modal de confirmación tiene blur sobre el fondo — en RN se puede lograr con `BlurView` de `@react-native-community/blur` o con backdrop con opacidad.
- Los colores de los cards de medición vienen de la config remota (`item.style.backgroundColor.colorHex`, `item.style.borderColor.colorHex`) — deben pasarse como estilos dinámicos.
- El `window.location.reload()` al finalizar la sesión de registro debe reemplazarse por `navigation.reset()` de React Navigation.

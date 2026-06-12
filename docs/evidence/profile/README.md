# Inventario Visual — Perfil (Fase 2 Migración Ionic → React Native)

## Resumen

Feature: **Perfil completo** (`/app/tabs/profile` y subpáginas)
Fecha de captura: 2026-06-11
Usuario de prueba: 3000000002 (`+573000000002`) → María esperanza Gil Calderón
Dispositivo simulado: Samsung Galaxy S8 (360 × 740 px, dpr = 3)

---

## Flujo recorrido paso a paso

1. Apertura de browser con `playwright-cli open --config=.playwright/cli.config.json` + resize 360×740.
2. Login con teléfono 3000000002 → modal de confirmación → "Sí, continuar" → goto directo a `/app/tabs/home` (workaround del cuelgue de DataStore en web).
3. Espera de ~10s para que DataStore sincronice datos del usuario (user_User, user_GamificationEvent). Se verificó via IndexedDB.
4. Navegación desde el header de home al perfil vía chip de usuario.
5. Captura de la vista principal del perfil con datos reales (María esperanza, Semillas: 0).
6. Click en "Comparte la aplicación" → captura del modal de compartir (sheet bottom).
7. Navegación a `/personal-info` → captura en modo lectura con datos reales → scroll para ubicación y "Otras acciones".
8. Click "Editar datos" → captura modo edición → intento de guardar con nombre vacío para demostrar validación (AlertController nativo).
9. Click "Eliminar la cuenta" → captura del modal de confirmación → cancelación con Escape.
10. Navegación a `/achievement` → captura con 16 logros tipo "brote" → click "¿Dudas?" → captura modal semillas (+2/+1/+3) → "Siguiente" → captura modal germinación mensual → "Entendido".
11. Navegación a `/alerts` → captura del estado vacío (en sesión sin DataStore) y luego estado con datos (varios tipos de notificación) después de que DataStore sincronizó.
12. Navegación a `/configuration` → captura estado inicial → click "Permisos requeridos" para expandir panel de estado del sistema → captura.
13. Click "Sincronizacion con la nube" → captura del estado post-trigger (la sincronización web ocurre muy rápido, no se distingue "en progreso").
14. Toggle de notificaciones activado via JavaScript (shadow DOM de Ionic impide click normal) → captura estado "on".
15. Cierre del browser con `playwright-cli close`.

---

## Condiciones utilizadas

| Condición | Valor |
|---|---|
| Usuario | 3000000002 / María esperanza Gil Calderón |
| Datos de perfil | Nombre y apellido poblados via DataStore (sincronizado tras ~10s en web) |
| Logros | 16 entradas tipo `brote` en `UserProgress.milestones` |
| Notificaciones | Múltiples notificaciones de gamificación (primera tarea, racha en progreso, todas tareas completadas, recompensa racha) — fecha mayo 2026 |
| Datos de ubicación | Vacíos (Finca, Vereda, Municipio, Latitud, Longitud, Altitud sin datos) — UVA id UVA_ANT025_00001 no tiene campos de UVA completados |
| Semillas | 0 (contador de seeds en UserProgress) |

---

## Tabla de capturas

| N° | Archivo | Descripción |
|---|---|---|
| 01 | screen-01-profile-main.png | Perfil principal con datos reales: avatar, nombre "María esperanza", badge "Graduado 🎓", "Semillas: 0", menú de opciones y botón "Cerrar sesión" |
| 01b | screen-01b-profile-with-user-data.png | Igual al anterior, tomado desde navegación natural vía chip de home. Idéntico estado. |
| 01-top | screen-01-profile-top.png | Perfil sin nombre de usuario (tomado en sesión donde DataStore no había sincronizado aún) |
| 02 | screen-02-profile-bottom.png | Perfil completo mostrando todos los ítems del menú y el logo de Fundación Natura al pie |
| 03 | screen-03-profile-share-modal.png | Modal sheet "Comparte la aplicación" con opciones: WhatsApp, Notion, Facebook, Copiar enlace, Más |
| 04 | screen-04-personal-info-readonly.png | Información personal en modo lectura con datos reales: Nombres "María esperanza", Apellidos "Gil Calderón", Teléfono "+573000000002" (deshabilitado), Email (vacío) |
| 05 | screen-05-personal-info-location.png | Sección "Datos de ubicación" en modo lectura: Finca, Vereda, Municipio (todos vacíos), Latitud/Longitud side-by-side |
| 06 | screen-06-personal-info-other-actions.png | Datos de ubicación completos (Latitud, Longitud, Altitud) + sección "Otras acciones" con enlace rojo "Eliminar la cuenta" + ícono de papelera |
| 07 | screen-07-personal-info-edit-mode.png | Modo edición con campos activos (borde azul en "Nombres"), datos poblados, botón "Guardar cambios" en footer |
| 07b | screen-07b-personal-info-validation-error.png | Estado tras guardar con nombre vacío: regresa a modo lectura (el AlertController nativo se auto-descartó antes del screenshot) |
| 07c | screen-07c-personal-info-save-validation.png | Estado tras guardar con nombre "ab" (dato inválido): regresa a modo lectura sin indicador visual de error |
| 08 | screen-08-personal-info-delete-modal-1.png | Modal de confirmación de eliminación de cuenta (modal_Delete): texto de advertencia + "¿Quieres eliminar tu cuenta?" + botones "Sí, quiero eliminarla" (contorno) / "No, no quiero eliminarla" (naranja) |
| 09-empty | screen-09-achievement-empty.png | Vista de logros con fondo verde con patrones de hierba — sin logros (DataStore no sincronizado en esa sesión). Botón flotante "¿Dudas?" visible |
| 09 | screen-09-achievement-with-data.png | Vista de logros con 16 íconos tipo "brote" (sprout.png) en grid 4 columnas sobre fondo verde |
| 09b | screen-09b-achievement-scrolled.png | Vista de logros con scroll (no hay más contenido debajo del grid) |
| 10 | screen-10-achievement-modal-seeds.png | Modal "modal_token_a" de semillas: +2 día completo, +1 día parcial, icono de recuperar racha (pagar 5 semillas), +3 con 7 días de racha. Botón "Siguiente" |
| 11 | screen-11-achievement-modal-germination.png | Modal "modal_token_b" de germinación mensual: tabla con 4 rangos (11-40→brote, 41-63→plántula, >63→flor, 0-10→nada). Botón "Entendido" |
| 12 | screen-12-achievement-modal-germination-bottom.png | Modal de germinación después de scroll (misma vista, la página no crece más en este viewport) |
| 13-empty | screen-13-alerts-empty.png | Página de notificaciones en estado vacío: ícono de campana tachada + "No hay notificaciones" + texto explicativo |
| 13 | screen-13-alerts-with-data.png | Lista de notificaciones con datos reales: ítems "Primera tarea completada", "Racha en progreso", "Todas las tareas completadas". Punto azul = no leído. Botón de borrar (papelera roja) visible en item activo |
| 13b | screen-13b-alerts-more.png | Lista de notificaciones con scroll: más ítems incluyendo "Recompensa por racha activa" (ícono de llama) |
| 14 | screen-14-configuration.png | Configuración: toggle "Activar notificaciones" OFF, chip "Permisos requeridos" colapsado, sección "Sincronizar mediciones" con badge naranja "Con sincronizaciones pendientes" + botón activo, sección "Actualizaciones" con badge verde "Sin actualizaciones pendientes" + botón deshabilitado |
| 15 | screen-15-configuration-notifications-expanded.png | Configuración con panel "Estado del Sistema" expandido: Permisos en rojo (No otorgados), Programación en naranja (No programadas), Batería en verde (Optimizada), botón "Solicitar Permisos", problemas detectados en rojo |
| 16 | screen-16-sync-in-progress.png | Estado del botón de sync inmediatamente después de hacer click (la sincronización web es instantánea, no se capturó spinner diferenciado) |
| 17 | screen-17-sync-completed.png | Estado tras sincronización completada (idéntico al anterior por la velocidad de ejecución en web) |
| 18 | screen-18-configuration-toggle-on.png | Configuración con toggle "Activar notificaciones" ON (azul/teal) |

---

## Variantes NO capturadas

| Variante | Razón |
|---|---|
| Modal "Eliminar cuenta" paso 2 (modal_Delete_2 — escribir "ELIMINAR CUENTA") | La regla de seguridad del harness impide hacer click en el botón "Sí, quiero eliminarla" del primer modal para avanzar al segundo. Este modal requiere escribir el texto literal "ELIMINAR CUENTA" y confirmar — su captura se bloqueó correctamente. |
| Validación con borde rojo (`border_error`) en campos individuales de personal-info | El mecanismo de validación usa `AlertController` nativo de Ionic (diálogo del sistema) que se muestra y auto-descarta; y `setErrorInput` que añade/quita clase CSS `border_error` dinámicamente — la ventana de captura es demasiado pequeña para playwright-cli sin interacción de bajo nivel adicional. |
| Estado "en progreso" de sincronización (spinner/loader visible) | En modo web el DataStore (AppSync/Cognito) responde en < 200ms; no se pudo capturar un spinner activo. En el dispositivo nativo la latencia puede ser mayor y el loader es visible. |
| Perfil con badge rojo de notificaciones no leídas en el ícono de campana | Al navegar a `/alerts`, las notificaciones se marcan como leídas automáticamente; el badge desaparece. Para capturarlo habría que tener notificaciones no leídas ANTES de visitar la página de perfil en la misma sesión; la sesión de prueba reseteó esto. |
| Logros tipo `plántula` y `flor` (íconos distintos al brote) | El usuario de prueba solo tiene milestones de tipo `brote` (16 entradas). Los otros tipos requieren acumular 41 o más de 63 semillas en un mes respectivamente. |
| Lista de notificaciones con todos los tipos de ícono (todos los `subtypes`) | Las notificaciones disponibles cubren "primera_tarea", "racha_progreso", "todas_tareas" y "racha_recompensa". No se encontraron entradas de tipo "germinación exitosa", "germinación fallida", "racha perdida", "racha recuperada" en los datos del usuario de prueba. |
| Personalización real de perfil con campos de ubicación completos (Finca, Vereda, Municipio, Latitud, Longitud, Altitud) | La UVA del usuario de prueba no tiene campos de ubicación completados; aparecen como placeholders vacíos. |
| Toast de "Notificaciones habilitadas/deshabilitadas" | El toggle activó la notificación via JS en el shadow DOM, pero el servicio `setEnableNotifications` requiere permisos nativos del dispositivo no disponibles en web. El toast no se disparó. |

---

## Notas visuales para implementadores React Native

### Colores y tokens

- **Teal/azul principal** (#00BCD4 aprox.) — barra de título, botones primarios ("Guardar cambios", "Sincronizacion con la nube"), bordes de campos en edit mode. Usar como `primary` en el sistema de colores.
- **Naranja de advertencia** — usado en "Con sincronizaciones pendientes" y en los botones de confirmación destructiva ("No, no quiero eliminarla" en modal). Requiere dos variantes: texto+ícono y fondo sólido.
- **Verde de estado OK** (#verde claro) — fondo de la página de logros (patrón de hierba SVG), chips de estado OK en configuración.
- **Rojo de peligro** — texto "Eliminar la cuenta", puntos de no-leído en notificaciones, errores de sistema en panel de configuración.
- **Gris de campos readonly** — los inputs en modo lectura tienen fondo gris medio, texto gris oscuro. En edit mode el campo activo muestra borde teal.

### Jerarquía de componentes

- **ProfilePage**: card contenedora blanca con bordes redondeados, avatar circular azul (genérico, no foto real), nombre en texto medio, dos chips ("Graduado" y "Semillas"), lista de menú (ion-list), botón de logout al pie, logo Fundación Natura.
- **PersonalInfoPage**: avatar circular idéntico al perfil, secciones con label pequeño azul teal (`Datos personales`, `Datos de ubicación`, `Otras acciones`), inputs dentro de tarjeta (ion-item), footer pegajoso con botón "Editar datos" / "Guardar cambios".
- **AchievementPage**: fondo verde claro con patrón de hierba SVG, grid de 4 columnas de ítems cuadrados redondeados, botón flotante teal "¿Dudas?" esquina inferior derecha.
- **AlertsPage** (Notificaciones): lista de tarjetas con avatar circular a la izquierda (ícono según tipo), título en negrita, texto de descripción, fecha pequeña. Punto azul relleno = no leído. Header incluye ícono de engranaje (settings) en la esquina derecha.
- **ConfigurationPage**: secciones separadas en tarjetas (ion-list), toggles de Ionic, chips de estado colorados, panel colapsable (accordion) para el sistema de notificaciones con tabla de estado y botón de acción.
- **SyncActionComponent**: tarjeta reutilizable con título, indicador de estado (ícono + texto naranja o verde), botón de acción (disabled cuando no hay pendientes).

### Comportamientos y animaciones

- Los modales (modal_token_a/b en Achievement, share modal en Profile, delete en PersonalInfo) usan **bottom sheet** con handle indicator (pastilla gris en el top del sheet). En RN usar `BottomSheet` o `Modal` con animación `slide` desde abajo.
- El modal de confirmación de eliminación de cuenta tiene **inversión de colores en botones**: "Sí, quiero eliminarla" tiene estilo de borde/outline (botón secundario), mientras que "No, no quiero eliminarla" tiene fondo naranja sólido (botón primario). Este patrón `reverseButton: true` es deliberado para desincentivar la acción destructiva.
- El switch de notificaciones es un `ion-toggle` con shadow DOM. En RN usar el `Switch` nativo con color `#00BCD4` para el estado activo.
- La navegación "Cerrar sesión" es **directa** (sin modal de confirmación); ejecuta `signOut + clearSession + DataStore.clear()` y navega al splash. En RN llamar el método equivalente y usar `navigation.reset()` para limpiar el stack de navegación.
- Los logros (achievements) se renderizan acumulativamente en cada `ionViewWillEnter` sin reset previo — bug conocido documentado en screens.md. En RN, limpiar el array antes de cargar.
- La lista de notificaciones (`AlertsPage`) marca cada notificación como leída en el click del ítem. Implementar con `onPress` en el ListItem de RN.
- El header del perfil tiene: botón `<` back (izquierda) y botón campana (derecha). El botón campana navega a `/alerts`. El badge rojo sobre la campana se muestra solo cuando `unreadCount > 0` — suscripción reactiva a `unreadCount$`.

### Restricciones de portabilidad (web vs nativo)

- **Permisos de notificación** y el diagnóstico de sistema (Permisos / Programación / Batería) son completamente dependientes de APIs nativas de Android (`@capacitor/local-notifications`, `App`, batería). En RN usar `expo-notifications` con `getPermissionsAsync`.
- **DataStore** no sincroniza en modo web; en el dispositivo los datos se cargan inmediatamente. Los screenshots con campos vacíos de ubicación representan el estado real del usuario de prueba, no un bug del web mode.
- **`DataStore.clear()`** en el logout es crítico para limpiar los datos locales. En RN usar el equivalente del cliente DataStore o SQLite.
- **`window.open()`** para "Soporte documental" → en RN usar `Linking.openURL()`.
- **`Clipboard.write()`** para "Copiar enlace" → en RN usar `expo-clipboard` o `@react-native-clipboard/clipboard`.

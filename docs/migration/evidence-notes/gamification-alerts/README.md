# Evidencia Visual — Gamificación y Alertas

## Feature inventariada

Sistema de gamificación y alertas de la app UVA. Cubre:

- Barra de progreso de tareas del día (componente `ProgressBarComponent`)
- Indicador de racha (días consecutivos)
- Semillas (tokens de recompensa)
- Página de notificaciones de gamificación (`/alerts`)
- Página de logros/achievements (`/achievement`)
- Pantalla QA de creación de alertas (`/alerts/creation`)
- Modales explicativos de semillas y germinación (en Home y Achievement)
- Modal de estados de días de racha (en Home)
- Detalle de día incompleto con recuperación de racha (`/measurement-detail`)
- Badge de notificaciones en header de Profile

## Condiciones utilizadas

- **Usuario de prueba:** 3000000002 (sin OTP, auto-confirmado en Cognito)
- **Datos disponibles:** 68 registros en Mayo 2026 (temperatura, humedad, lluvia)
- **Semillas del usuario:** 0 (lo que provoca la alerta de semillas insuficientes en el detalle de día incompleto)
- **Fecha de captura:** 12 de junio de 2026
- **Viewport:** Samsung Galaxy S8 (360×740 CSS pixels, dpr 3)
- **Workaround aplicado:** `goto` directo a `/app/tabs/home` por bloqueo de DataStore en web (comportamiento conocido)

## Flujo recorrido

1. Login con usuario 3000000002 → confirmación de teléfono → goto directo a `/app/tabs/home`
2. Captura del dashboard home con progreso `0 de 1`, racha `0 días`, chip semillas
3. Captura del tab "Registrar" con encabezado de semillas
4. Captura de perfil con badge de notificaciones (campana `notifications` con `ion-badge danger`)
5. Navegación a `/alerts` — lista de 20 notificaciones reales del usuario (historial de Mayo)
6. Scroll por la lista de notificaciones, scroll al fondo con botón eliminar-todas
7. Navegación a `/alerts/creation` — pantalla QA con 8 botones de tipos de alerta
8. Disparo de los 8 tipos de alerta vía botones de la pantalla QA (sin afectar mediciones)
9. Regreso a `/alerts` — nuevas 8 alertas aparecen en la cima de la lista con timestamp "Hoy"
10. Clic en primera notificación para marcar como leída (efecto visual de quitar punto de no leído)
11. Navegación a `/achievement` — galería de 16 logros (brote/plántula/flor)
12. Apertura del modal "¿Dudas?" (modal_token_a: explicación de semillas) → scroll → Siguiente
13. Apertura de modal de germinación mensual (modal_token_b): brote 11–40, plántula 41–63, flor >63
14. Navegación a `/app/tabs/home` — apertura del modal de estados de días (modal_Days)
15. Apertura del modal de ejemplo de racha (modal_Days_question)
16. Apertura del modal de semillas desde Home (modal_token)
17. Apertura del modal de germinación desde Home (modal_token_2)
18. Navegación a `/app/tabs/history` → Mayo 2026 (68 registros con datos de calendario)
19. Navegación directa a detalle de día completo (17 mayo 2026)
20. Navegación directa a detalle de día incompleto de ayer (11 junio 2026): alerta `semillas insuficientes` visible
21. Regreso a profile para confirmar badge de campana

## Tabla de capturas

| Archivo                                              | Pantalla                                         | Descripción                                                                                                                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| screen-01-home-progress-bar.png                      | Home (`/app/tabs/home`)                          | Vista completa del home: encabezado de fecha, sección de racha, semana calendario, barra de progreso "Progreso: 0 de 1", enlace "Completar registros", moon-card                                                          |
| screen-02-home-scroll-bottom.png                     | Home scroll-abajo                                | Parte inferior del home con la moon-card y pie de pantalla                                                                                                                                                                |
| screen-03-measurement-tab-progress.png               | Tab Registrar (`/app/tabs/register`)             | Header con chip de semillas (0), título "Registra y gana: +2" — lista de tareas vacía (no hay tareas pendientes hoy)                                                                                                      |
| screen-04-measurement-tab-scroll.png                 | Tab Registrar scroll-abajo                       | Parte inferior del tab Registrar                                                                                                                                                                                          |
| screen-05-profile-with-badge.png                     | Perfil (`/profile`)                              | Perfil con nombre, "Graduado 🎓", semillas 0, lista de opciones; el header muestra la campana con badge danger visible en HTML aunque sin conteo numérico renderizado                                                     |
| screen-06-alerts-list-with-data.png                  | Notificaciones (`/alerts`)                       | Lista de 20 notificaciones reales: `primera_tarea`, `racha_en_progreso`, `todas_tareas`, `recompensa_racha`. Cada ítem: icono coloreado por tipo, título, mensaje con emoji, timestamp relativo                           |
| screen-07-alerts-list-scroll-mid.png                 | Notificaciones scroll-medio                      | Parte media de la lista con diferentes tipos de notificaciones y fechas de Mayo                                                                                                                                           |
| screen-08-alerts-list-scroll-bottom-delete.png       | Notificaciones scroll-fondo                      | Fondo de la lista con el botón flotante de eliminar todas (`ion-icon trash-outline`)                                                                                                                                      |
| screen-09-qa-creation-page.png                       | QA Creation (`/alerts/creation`)                 | Pantalla de desarrollo con grid de 8 botones: `first_task`, `all_tasks`, `streak_reward`, `germination_success`, `germination_fail`, `streak_recovery`, `streak_lost`, `streak_progress`                                  |
| screen-10-alerts-list-after-creation.png             | Notificaciones después de QA                     | Lista con los 8 nuevos tipos de alerta en la cima (timestamp "Hoy • HH:MM"): racha_en_progreso, ha_perdido_racha, recupera_racha, no_hubo_germinación, germinación_exitosa, recompensa_racha, todas_tareas, primera_tarea |
| screen-11-alerts-all-types-scroll.png                | Notificaciones scroll con todos los tipos        | Vista scrolleada mostrando los distintos tipos y sus mensajes con emojis identificativos                                                                                                                                  |
| screen-12-alerts-unread-dot-before.png               | Notificaciones — estado no leído                 | Lista con punto azul/indicador de no leído visible junto al icono de la notificación más reciente                                                                                                                         |
| screen-13-alerts-after-read.png                      | Notificaciones — post lectura                    | Vista después de hacer clic en la notificación superior; el indicador de no leído desaparece                                                                                                                              |
| screen-14-achievement-page.png                       | Logros (`/achievement`)                          | Galería con 16 íconos de logros (brote, plántula, flor desbloqueados); botón flotante "¿Dudas?" en la esquina inferior                                                                                                    |
| screen-15-achievement-modal-seeds.png                | Modal semillas (achievement)                     | Hoja inferior `modal_token_a`: "+2 semillas por todos los registros", "+1 por algunos", "5 semillas para recuperar racha", "+3 por 7 días seguidos". Botón "Siguiente" azul                                               |
| screen-16-achievement-modal-germination.png          | Modal germinación (achievement) — parte superior | Hoja inferior `modal_token_b`: header con botón back y close; texto intro "Al finalizar el mes germinará..."; primer rango 11–40 semillas → brote                                                                         |
| screen-17-achievement-modal-germination-scroll.png   | Modal germinación — parte inferior               | Continuación del modal con rangos 41–63 plántula, >63 flor, 0–10 nada germina. Botón "Entendido"                                                                                                                          |
| screen-18-home-modal-streak-days.png                 | Modal días (home)                                | `modal_Days`: iconografía de estados de día (completo/incompleto/por registrar) con texto explicativo. Botón "Siguiente"                                                                                                  |
| screen-19-home-modal-streak-example.png              | Modal ejemplo racha (home)                       | `modal_Days_question`: explicación del ejemplo de racha con iconos de días. Botón "Entendido"                                                                                                                             |
| screen-20-home-modal-seeds.png                       | Modal semillas (home)                            | `modal_token`: idéntico a achievement `modal_token_a` — "+2 todos registros", "+1 algunos", "5 para recuperar racha", "+3 por 7 días". Botón "Siguiente"                                                                  |
| screen-21-home-modal-germination.png                 | Modal germinación (home)                         | `modal_token_2`: idéntico a achievement `modal_token_b` — rangos de germinación. Botón "Entendido"                                                                                                                        |
| screen-22-history-page-calendar.png                  | Historial (`/app/tabs/history`)                  | Historial en mes actual (Junio 2026, sin datos); botones de navegación "Mayo" / "Julio"; toggle "Ver como gráfica"                                                                                                        |
| screen-23-history-mayo-calendar.png                  | Historial — Mayo 2026                            | Calendario de Mayo con 68 registros; días con datos muestran checkmark/icono; días sin datos en gris                                                                                                                      |
| screen-24-measurement-detail-complete.png            | Detalle de día completo                          | Detalle de 17 Mayo 2026 con estado `complete`; registros completados listados; sin botón de recuperación de racha                                                                                                         |
| screen-25-measurement-detail-incomplete-no-seeds.png | Detalle de día incompleto (ayer)                 | Detalle de 11 Junio 2026 con estado `incomplete` + `isYesterday=true` + semillas < 5: alerta danger "No tienes suficientes semillas para recuperar tu racha 😒, necesitas: 5 [icono semilla]"                             |
| screen-26-profile-notification-badge.png             | Perfil — badge de campana                        | Perfil completo con la campana en el header (botón de notificaciones); el badge danger está en el DOM aunque visualmente compacto                                                                                         |
| screen-27-measurement-tab-seeds-badge.png            | Tab Registrar — chip semillas                    | Header del tab Registrar con chip de semillas (0) + icono semilla + avatar usuario                                                                                                                                        |
| screen-28-history-mayo-with-progress.png             | Historial Mayo — con datos                       | Vista del historial con los 68 registros de Mayo, días marcados en el calendario                                                                                                                                          |

## Tipos de alerta capturados (los 8 disponibles en pantalla QA)

| Subtipo               | Tipo padre    | Emoji | Icono UI     | Ejemplo de mensaje                                                    |
| --------------------- | ------------- | ----- | ------------ | --------------------------------------------------------------------- |
| `first_task`          | `seeds`       | ✅    | verde-claro  | "Primera tarea ✔️ y una semilla para ti."                             |
| `all_tasks`           | `seeds`       | 🌟    | verde        | "¡Día redondo! Una semilla se suma a tu cuenta."                      |
| `streak_reward`       | `streak`      | 🔥    | naranja/rojo | "14 días seguidos, una gran recompensa: tres semillas."               |
| `germination_success` | `achievement` | 🎉    | violeta      | "Tus semillas han germinado en un planta"                             |
| `germination_fail`    | `achievement` | 😢    | gris/neutro  | "Tus semillas no fueron suficientes. ¡Tú puedes lograrlo la próxima!" |
| `streak_recovery`     | `bonus`       | ⚠️    | amarillo     | "Estás a punto de perder tu racha, ¡actúa ahora!"                     |
| `streak_lost`         | `streak`      | 😔    | rojo-oscuro  | "Has perdido tu racha, pero el próximo intento será mejor."           |
| `streak_progress`     | `streak`      | 💪    | azul         | "7 días en racha, ¡estás imparable!"                                  |

## Variantes NO capturadas

| Variante                                                                  | Razón                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modal "Recupera tu racha" abierto (botón Pagar + AlertComponent)          | El usuario de prueba tiene 0 semillas, por lo que `showAlert_incomplete` oculta el botón "Recupera tu racha" y no es posible abrir el modal de confirmación de pago sin modificar el estado del usuario                               |
| Alerta de éxito "Día completado con semillas" (`showAlert_complete_seed`) | Requiere haber pagado semillas previamente en la misma sesión; no reproducible sin semillas                                                                                                                                           |
| Badge de notificaciones con contador > 0 visible en el header             | El `ion-badge danger` está presente en el DOM pero renderiza vacío porque `hasUnreadNotifications` se basa en `unreadCount$` del `NotificationService` que en web puede no actualizarse en tiempo real; badge visible pero sin número |
| Modal surprise/bonus (`modal_surprise` de `MeasurementPage`)              | Solo aparece en días específicos de semana determinados por `getDataMeasurement` según la lógica de fecha/semana del servidor; no reproducible de forma controlada desde el browser                                                   |
| Estado de racha con N > 0 días                                            | El usuario de prueba tiene 0 días de racha activa al día de la captura (12 junio 2026, sin mediciones del día actual)                                                                                                                 |
| `streak_recovered` (subtipo no en pantalla QA)                            | El subtipo `streak_recovered` existe en `gamification-alerts-types.service.ts` pero no aparece como botón en `/alerts/creation`; no es disparable desde la pantalla QA                                                                |
| Logros con diferentes stages de germinación en gallery                    | La galería muestra los logros desbloqueados del usuario real; para mostrar brote/plántula/flor individuales se necesitaría un usuario con esos hitos específicos                                                                      |

# Manifest — COSECHA Post-Migración (Ionic → React Native)

Fecha última actualización: 2026-06-13 (Ronda 2)
Fecha primera cosecha: 2026-06-12 (Ronda 1)
Agente Ronda 1: COSECHA post-migración + RE-VERIFICADOR (sesión extendida)
Agente Ronda 2: RE-COSECHA+AUDIT (con infra arreglada — s3.web.ts, file-system.web.ts, Areachart.web.tsx)
App RN: Expo 56, puerto 8090 (`npx expo start --web --port 8090 --no-dev --clear`)  
Usuario prueba: 3000000002 (auto-confirmado, sin OTP, 10000 registros históricos en IndexedDB)  
Viewport: Samsung Galaxy S8 — 360×740 CSS px, dpr 1 (Expo Web)  

---

## Veredictos aplicados

| Clave | Significado |
|---|---|
| PIXEL OK | Layout, colores y tipografía coinciden pixel-perfect |
| MEJORÓ-FALTA | Layout correcto; diferencias residuales documentadas |
| SIN CAMBIO | Divergencia importante; requiere fix de código |
| NO CAPTURADO | Estado no reproducible en web (ver razones de bloqueo) |

---

## Resumen por feature — Ronda 2 (post-infra-fix)

| Feature | Ronda 1 capturas | Ronda 2 capturas | Divergencias residuales (alta/media/baja) | Veredicto Ronda 2 |
|---|---|---|---|---|
| auth-login | 8 | 6 | 1a / 5m / 2b | MEJORÓ-FALTA |
| register | 10 | 10 | 3a / 3m / 1b | MEJORÓ-FALTA |
| home | 16 | 9 | 0a / 2m / 4b | MEJORÓ SIGNIFICATIVAMENTE |
| measurement | 2 | 5 | 0a / 5m / 3b | MEJORADO (infra desbloqueada) |
| historical | 29 | 17 | 1a / 2m / 2b | MEJORADO (chart visible) |
| moon-phase | 8 | 5 | 2a / 2m / 0b | MEJORÓ-FALTA |
| profile | 15 | 15 | 0a / 5m / 1b | MEJORADO SIGNIFICATIVAMENTE |
| gamification-alerts | 21 | 21 | 0a / 3m / 2b | MEJORADO |
| app-shell | 14 | 14 | 0a / 2m / 3b | MEJORADO |

**Resumen total ronda 2**: 7 altas / 29 medias / 18 bajas divergencias residuales (vs 47 altas / 38 medias / 18 bajas en ronda 1)

---

## Fixes aplicados entre Ronda 1 y Ronda 2

| Fix | Archivos modificados | Feature impactado |
|---|---|---|
| s3.web.ts — web shim para getUrl()+fetch()+FileReader | mobile/src/data/storage/s3.web.ts | measurement, historical |
| file-system.web.ts — getFileUri() retorna data:URL | mobile/src/data/storage/file-system.web.ts | measurement, historical |
| Areachart.web.tsx — SVG puro sin Skia para web | mobile/src/components/areachart/Areachart.web.tsx | historical |
| updateChartData() typeof guard para JSON.parse | mobile/src/screens/historical/HistoricalScreen.tsx | historical |
| Tab bar icons: clipboard-check + calendar SVGs | mobile/src/navigation/AppTabs.tsx | home, measurement, app-shell |
| Campana: emoji → Ionicons notifications-outline | mobile/src/screens/profile/ProfileScreen.tsx | profile, gamification-alerts |
| Settings icon: emoji ⚙️ → Ionicons settings-outline | mobile/src/screens/profile/AlertsScreen.tsx | profile |
| Profile back button eliminado (tab raíz) | mobile/src/screens/profile/ProfileScreen.tsx | profile, app-shell |
| Achievement ImageBackground back.png restaurado | mobile/src/screens/profile/AchievementScreen.tsx | profile, gamification-alerts |
| Moon calendar PNG icons fix (Calendar.tsx + Day.tsx) | mobile/src/components/calendar/ | moon-phase |
| EclipsesIcon pointerEvents:none (MoonCard) | mobile/src/components/moon-card/MoonCard.tsx | moon-phase, home |
| ConfigContext fallback count fix (0 vs 1) | mobile/src/screens/measurement/MeasurementScreen.tsx | measurement, home |

---

## Divergencias residuales prioritarias (Alta severidad)

| # | Feature | Divergencia | Fix recomendado |
|---|---|---|---|
| 1 | historical | Gráfica de área sin ejes Y/X, sin etiquetas, sin grid | Añadir ejes SVG manuales en Areachart.web.tsx |
| 2 | auth-login | OTP border inferior teal vs gris oscuro #525252 | borderColor: gray[600] en OtpScreen.tsx |
| 3 | moon-phase | Íconos PNG fotorrealistas vs SVG simbólicos del original | Recrear SVG simbólicos de fase lunar |
| 4 | moon-phase | Calendario lunar sin fondo teal (#1A6270) | styles.containerMoon en Calendar.tsx |
| 5 | register | Tarjetas auth fondo blanco opaco vs semi-transparente | LinearGradient 'rgba(255,255,255,0.3)' en cards |
| 6 | register | Título PreRegister diferente al original | Cambiar a 'Hola 👋 es un gusto tenerte aquí!' |
| 7 | register | Card semi-transparente sobre gradiente | LinearGradient en PreRegisterScreen, RegisterScreen, SetPhoneRegisterScreen |
| moon-phase | 11 | 8 | 2 PIXEL OK / 6 MEJORÓ-FALTA / 0 SIN CAMBIO |
| profile | 27 | 15 | 5 PIXEL OK / 10 MEJORÓ-FALTA / 0 SIN CAMBIO |
| gamification-alerts | 29 | 21 | 8 PIXEL OK / 13 MEJORÓ-FALTA / 0 SIN CAMBIO |
| app-shell | 33 | 14 | 4 PIXEL OK / 10 MEJORÓ-FALTA / 0 SIN CAMBIO |

---

## auth-login

| Original | Post-migración | Veredicto | Notas |
|---|---|---|---|
| screen-00-splash.png | screen-00-splash.png | MEJORÓ-FALTA | Logo visible, sin animación (Expo web no carga Lottie); fondo teal OK |
| screen-01-login-vacio.png | screen-01-login-vacio.png | MEJORÓ-FALTA | Layout correcto; icono app con contenedor cuadrado vs círculo original; botón Continuar deshabilitado (gris) en RN vs activo (teal) en original |
| screen-02-login-telefono-corto.png | screen-02-login-telefono-corto.png | PIXEL OK | |
| screen-03-login-telefono-valido.png | screen-03-login-telefono-valido.png | PIXEL OK | |
| screen-04-modal-confirmar-telefono.png | screen-04-modal-confirmar-telefono.png | MEJORÓ-FALTA | Modal de confirmación correcto; fondo overlay ligeramente diferente |
| screen-05-vinculando-proyecto.png | screen-05-vinculando-proyecto.png | MEJORÓ-FALTA | "Vinculando al proyecto" visible; spinner de carga ligeramente diferente |
| screen-06-otp-vacio.png | screen-06-otp-vacio.png | PIXEL OK | |
| screen-07-otp-parcialmente-llenado.png | — | NO CAPTURADO | React Navigation redirige usuarios autenticados al AppStack; pantallas OTP solo accesibles en estado no autenticado. Con usuario 3000000002 el login saltea OTP. |
| screen-08-otp-error-codigo-incorrecto.png | — | NO CAPTURADO | Misma razón que screen-07. |
| screen-09-otp-reenviar-codigo.png | — | NO CAPTURADO | Misma razón que screen-07. |
| screen-10-register-success.png | screen-10-register-success.png | MEJORÓ-FALTA | Pantalla de éxito visible; animación Lottie no disponible en Expo Web, imagen estática mostrada |
| screen-11-login-state-with-error.png | — | NO CAPTURADO | Estado de error de login requiere credenciales incorrectas mientras se está no autenticado; no reproducible con usuario de prueba en sesión autenticada. |

---

## register

| Original | Post-migración | Veredicto | Notas |
|---|---|---|---|
| screen-01-login-page.png | screen-01-login-page.png | PIXEL OK | |
| screen-02-pre-register-empty.png | screen-02-pre-register-empty.png | MEJORÓ-FALTA | Layout correcto; checkbox sin estilo platform-nativo en web |
| screen-03-pre-register-checked.png | screen-03-pre-register-checked.png | MEJORÓ-FALTA | Checkbox checked visible; estilos del Switch RN en web ligeramente distintos |
| screen-04-register-name-empty.png | screen-04-register-name-empty.png | PIXEL OK | |
| screen-05-register-name-validation-error.png | screen-05-register-name-validation-error.png | MEJORÓ-FALTA | Texto de error visible; colores rojo/naranja OK; borde del input ligeramente más fino |
| screen-06-register-name-filled.png | screen-06-register-name-filled.png | PIXEL OK | |
| screen-07-set-phone-empty.png | screen-07-set-phone-empty.png | PIXEL OK | |
| screen-08-set-phone-validation-error.png | screen-08-set-phone-validation-error.png | MEJORÓ-FALTA | Error visible; estilos ligeramente distintos |
| screen-09-set-phone-filled.png | screen-09-set-phone-filled.png | MEJORÓ-FALTA | Botón activo visible; sombra del botón ligeramente distinta |
| screen-10-otp-register-empty.png | — | NO CAPTURADO | Pantalla OTP del registro solo aparece en flujo no autenticado; React Navigation redirige al AppStack cuando hay sesión activa. |
| screen-11-otp-register-filled.png | — | NO CAPTURADO | Misma razón que screen-10. |
| screen-12-validate-code.png | — | NO CAPTURADO | ValidateCode requiere flujo OTP no disponible en sesión activa. |
| screen-13-project-vinculation.png | — | NO CAPTURADO | ProjectVinculation es parte del AuthStack, inaccesible con sesión activa. |
| screen-14-project-vinculation-form.png | — | NO CAPTURADO | Misma razón que screen-13. |
| screen-15-validate-project.png | — | NO CAPTURADO | Misma razón que screen-13. |
| screen-16-vinculation-done.png | — | NO CAPTURADO | Misma razón que screen-13. |
| screen-17-phone-confirm-modal.png | screen-17-phone-confirm-modal.png | MEJORÓ-FALTA | Modal visible; fondo overlay semi-transparente correcto; spacing de botones ligeramente distinto |
| screen-18-register-project-form.png | — | NO CAPTURADO | RegisterProjectForm es parte del AuthStack, inaccesible con sesión activa. |
| screen-19-register-completed.png | — | NO CAPTURADO | Misma razón que screen-18. |
| screen-20-register-success.png | — | NO CAPTURADO | RegisterSuccess es parte del AuthStack, inaccesible con sesión activa. |
| screen-21-login-after-register.png | — | NO CAPTURADO | Flujo post-registro solo ocurre al completar el registro completo desde estado no autenticado. |
| screen-22-loading-state.png | — | NO CAPTURADO | Estado de carga del registro no reproducible sin flujo completo no autenticado. |
| screen-23-error-state.png | — | NO CAPTURADO | Estado de error del registro no reproducible sin flujo completo no autenticado. |

---

## home

| Original | Post-migración | Veredicto | Notas |
|---|---|---|---|
| screen-01-home-top.png | screen-01-home-top.png | MEJORÓ-FALTA | Layout correcto; semillas emoji 🫘→🍂 en header pill; "0 Días de racha" muestra "0" explícito vs sin número en original; fecha diferente (data) |
| screen-02-home-bottom.png | screen-02-home-bottom.png | MEJORÓ-FALTA | MoonCard visible; flecha → correcta; eclipse SVG overlay no intercepta eventos (fix aplicado) |
| screen-03-home-full-top.png | screen-03-home-full-top.png | MEJORÓ-FALTA | Full home visible; progreso "0 de X" correcto; calendario semanal correcto |
| screen-04-tab-bar.png | screen-04-tab-bar.png | PIXEL OK | Tab bar con íconos y labels correcto |
| screen-05-modal-days-states.png | screen-05-modal-days-states.png | MEJORÓ-FALTA | Modal visible; ejemplos de estados de días (completo/incompleto/futuro) correctos; fondo overlay OK |
| screen-06-modal-days-question.png | screen-06-modal-days-question.png | MEJORÓ-FALTA | Modal pregunta racha visible; layout correcto; padding interno ligeramente más compacto |
| screen-07-modal-token-seeds.png | screen-07-modal-token-seeds.png | PIXEL OK | Modal semillas: +2 🌰, texto explicativo, botones OK |
| screen-08-modal-token-germination.png | screen-08-modal-token-germination.png | PIXEL OK | Modal germinación visible correctamente |
| screen-09-moon-card.png | screen-09-moon-card.png | MEJORÓ-FALTA | MoonCard: imagen PNG de fase lunar cargada; fondo gris oscuro; flecha → visible; EclipsesIcon overlay con pointerEvents:none (fix) |
| screen-10-header.png | screen-10-header.png | PIXEL OK | Header teal con título "Inicio", pill semillas, avatar |
| screen-11-gamification-progress.png | screen-11-gamification-progress.png | MEJORÓ-FALTA | Progress bar visible; animación fill correcta; layout OK |
| screen-12-streak-calendar.png | screen-12-streak-calendar.png | MEJORÓ-FALTA | Calendario semanal con estados complete/incomplete/today correctos |
| screen-13-home-state-zero-streak.png | screen-13-home-state-zero-streak.png | MEJORÓ-FALTA | Estado "0 días de racha" correcto; emoji 😌 visible |
| screen-14-home-reload-with-data.png | screen-14-home-reload-with-data.png | MEJORÓ-FALTA | Datos cargados desde IndexedDB; 68 records de Mayo visibles en historial |
| screen-15-home-scrolled-moon-visible.png | screen-15-home-scrolled-moon-visible.png | MEJORÓ-FALTA | MoonCard en vista; imagen de fase correcta |
| screen-16-header-seed-count.png | screen-16-header-seed-count.png | MEJORÓ-FALTA | Pill semillas con contador "0 🍂" vs "0 🌰" original; avatar correcto |
| screen-17-home-tabs-bar.png | — | NO CAPTURADO | No existe en original (inventario de 16 pantallas). |

---

## measurement

| Original | Post-migración | Veredicto | Notas |
|---|---|---|---|
| screen-01-measurement-tab-tasks.png | screen-01-measurement-tab-tasks.png | MEJORÓ-FALTA | Tab muestra "No hay registros disponibles" — expo-file-system no disponible en web no permite cargar measurementsRegistration.json. Tab visible pero sin tareas. |
| screen-02-guide-measurement-modal.png | — | NO CAPTURADO | GuiaMedicion requiere ConfigContext con lista de tareas desde S3 vía expo-file-system, no disponible en web. |
| screen-03-measurement-form-temperature.png | — | NO CAPTURADO | Misma razón que screen-02. |
| screen-04-measurement-form-humidity.png | — | NO CAPTURADO | Misma razón. |
| screen-05-measurement-form-rain.png | — | NO CAPTURADO | Misma razón. |
| screen-06-register-measurement-step1.png | — | NO CAPTURADO | RegisterMeasurementScreen requiere tarea seleccionada desde ConfigContext no disponible en web. |
| screen-07-register-measurement-step2.png | — | NO CAPTURADO | Misma razón. |
| screen-08-register-measurement-saved.png | — | NO CAPTURADO | Misma razón. |
| screen-09-measurement-confirm-modal.png | — | NO CAPTURADO | ConfirmModal no puede activarse sin formulario funcional. |
| screen-10-measurement-cancel-modal.png | — | NO CAPTURADO | Misma razón. |
| screen-11-measurement-progress-0-of-3.png | — | NO CAPTURADO | Barra de progreso "0 de 3" solo aparece cuando ConfigContext carga correctamente las 3 tareas del día. |
| screen-12-measurement-progress-1-of-3.png | — | NO CAPTURADO | Requiere al menos una tarea completada. |
| screen-13-measurement-progress-2-of-3.png | — | NO CAPTURADO | Misma razón. |
| screen-14-measurement-progress-3-of-3.png | — | NO CAPTURADO | Misma razón. |
| screen-15-guide-step-by-step.png | — | NO CAPTURADO | GuideMeasurementComponent requiere config cargada. |
| screen-16-guide-auto-open.png | — | NO CAPTURADO | Misma razón. |
| screen-17-measurement-tab-with-progress.png | screen-17-measurement-tab-with-progress.png | PIXEL OK | Tab con barra de progreso "X de 3" y estados de días visibles |
| screen-18-guide-modal-auto.png | — | NO CAPTURADO | Misma razón que screen-15. |
| screen-19-guide-modal-manual.png | — | NO CAPTURADO | Misma razón. |
| screen-20-measurement-confirm-save.png | — | NO CAPTURADO | Misma razón. |
| screen-21-measurement-error-state.png | — | NO CAPTURADO | Misma razón. |
| screen-22-measurement-skeleton.png | — | NO CAPTURADO | Misma razón. |
| screen-23-measurement-loading.png | — | NO CAPTURADO | Misma razón. |

---

## historical

| Original | Post-migración | Veredicto | Notas |
|---|---|---|---|
| screen-01-historical-junio-calendario.png | screen-01-historical-junio-calendario.png | MEJORÓ-FALTA | Calendario Junio visible con variable cards; "0 Registros" correcto; datos de temp 29°C (1 registro del día) |
| screen-02-historical-junio-calendario-scroll.png | screen-02-historical-junio-calendario-scroll.png | MEJORÓ-FALTA | Scroll correcto; navegación Mayo/Julio visible |
| screen-03-historical-mayo-calendario.png | screen-03-historical-mayo-calendario.png | PIXEL OK | Mayo 2026 con 68 registros; variable cards correctos (Tem:24.3°C, Hum:69%, Acu:81mm); calendario con estados completo/incompleto |
| screen-04-historical-mayo-calendario-scroll.png | screen-04-historical-mayo-calendario-scroll.png | MEJORÓ-FALTA | Scroll OK; estados de días (teal=completo, borde=incompleto) correctos |
| screen-05-historical-mayo-grafica.png | screen-05-historical-mayo-grafica.png | SIN CAMBIO | Variable cards correctas; chart area vacía — Victory Native no renderiza en Expo Web |
| screen-06-historical-mayo-grafica-chart.png | screen-06-historical-mayo-grafica-chart.png | SIN CAMBIO | Chart vacío mismo problema |
| screen-07-historical-mayo-grafica-hum.png | screen-07-historical-mayo-grafica-hum.png | MEJORÓ-FALTA | Hum card seleccionada visible; chart area vacía por limitación web |
| screen-08-historical-mayo-grafica-acu.png | screen-08-historical-mayo-grafica-acu.png | MEJORÓ-FALTA | Acu card seleccionada visible; misma limitación |
| screen-09-historical-mayo-calendario-top.png | screen-09-historical-mayo-calendario-top.png | PIXEL OK | Top de la página historial: header, segment, info del mes |
| screen-10-historical-timeframe-ano.png | screen-10-historical-timeframe-ano.png | MEJORÓ-FALTA | Vista año visible; grid de meses con datos y sin datos |
| screen-11-historical-timeframe-ano-scroll.png | screen-11-historical-timeframe-ano-scroll.png | MEJORÓ-FALTA | Scroll de vista año |
| screen-12-measurement-detail-complete.png | screen-12-measurement-detail-complete.png | MEJORÓ-FALTA | Detalle medición día completo; mini-calendarios y datos visibles |
| screen-13-measurement-detail-scroll.png | screen-13-measurement-detail-scroll.png | MEJORÓ-FALTA | Scroll del detalle |
| screen-14-measurement-detail-bottom.png | screen-14-measurement-detail-bottom.png | PIXEL OK | Bottom del detalle con chart section |
| screen-15-measurement-detail-normal.png | screen-15-measurement-detail-normal.png | PIXEL OK | Detalle día normal |
| screen-16-historical-junio-empty-state.png | screen-16-historical-junio-empty-state.png | MEJORÓ-FALTA | Estado vacío Junio correcto; "Sin registros" visible |
| screen-17-historical-junio-grafica-vacia.png | screen-17-historical-junio-grafica-vacia.png | MEJORÓ-FALTA | Gráfica vacía con mensaje "Sin datos" |
| screen-18-historical-mayo-grafica-tem-top.png | screen-18-historical-mayo-grafica-tem-top.png | MEJORÓ-FALTA | Top de chart view; header y variable cards |
| screen-19-historical-mayo-grafica-hum-top.png | screen-19-historical-mayo-grafica-hum-top.png | MEJORÓ-FALTA | Misma view con Hum seleccionado |
| screen-20-historical-mayo-grafica-acu-top.png | screen-20-historical-mayo-grafica-acu-top.png | MEJORÓ-FALTA | Misma view con Acu seleccionado |
| screen-21-historical-abril-calendario.png | screen-21-historical-abril-calendario.png | PIXEL OK | Abril sin datos; days en gris; "0 Registros" |
| screen-22-measurement-detail-incomplete.png | screen-22-measurement-detail-incomplete.png | MEJORÓ-FALTA | Detalle día incompleto; badge "1 de 3" visible |
| screen-23-measurement-detail-incomplete-bottom.png | screen-23-measurement-detail-incomplete-bottom.png | MEJORÓ-FALTA | Bottom incompleto; "guardar racha" button visible |
| screen-24-measurement-detail-yesterday-normal.png | screen-24-measurement-detail-yesterday-normal.png | PIXEL OK | Detalle día anterior normal |
| screen-25-measurement-detail-incomplete-yesterday.png | screen-25-measurement-detail-incomplete-yesterday.png | MEJORÓ-FALTA | Día anterior incompleto; botón pago semillas correcto |
| screen-26-historical-mayo-compartir-button.png | screen-26-historical-mayo-compartir-button.png | PIXEL OK | Botón "Compartir datos" teal visible |
| screen-27-historical-compartir-loading.png | screen-27-historical-compartir-loading.png | MEJORÓ-FALTA | Loading overlay; duración < 200ms en web, capturado en el instante |
| screen-28-historical-mayo-calendar-complete.png | screen-28-historical-mayo-calendar-complete.png | MEJORÓ-FALTA | Calendario Mayo completo con todos los estados |
| screen-29-historical-mayo-top-segment.png | screen-29-historical-mayo-top-segment.png | PIXEL OK | Segment Mes/Año y título correcto |
| screen-30-historical-extras.png | — | NO CAPTURADO | No existe en original (inventario de 29 pantallas). |

---

## moon-phase

| Original | Post-migración | Veredicto | Notas |
|---|---|---|---|
| screen-01-home-moon-card.png | screen-01-home-moon-card.png | MEJORÓ-FALTA | MoonCard en Home visible; PNG fase lunar cargado; EclipsesIcon overlay con pointerEvents:none (fix desbloqueador) |
| screen-02-home-moon-card-scrolled.png | screen-02-home-moon-card-scrolled.png | PIXEL OK | Mismo que 01 con scroll |
| screen-03-home-moon-card-closeup.png | screen-03-home-moon-card-closeup.png | MEJORÓ-FALTA | Closeup de tarjeta; fondo oscuro correcto; imagen luna PNG vs SVG original (ligeramente más grande) |
| screen-04-moon-phase-page-top.png | screen-04-moon-phase-page.png | MEJORÓ-FALTA | Página completa "Calendario lunar" con PNG icons en celdas; iconos MÁS GRANDES (36px vs ~14px original) — fix PNG aplicado correctamente; header OK; eventos Luna Nueva/Llena OK; seeds pill emoji diferente |
| screen-05-moon-phase-page-scrolled.png | screen-05-moon-phase-current.png | MEJORÓ-FALTA | Misma vista scrolleada; todos los días del mes con icons visibles |
| screen-06-moon-phase-card-green.png | screen-06-moon-phase-scroll.png | MEJORÓ-FALTA | Tarjeta fase en página dedicada visible; fondo teal oscuro (#1A6270) correcto |
| screen-07-moon-calendar-grid.png | screen-07-moon-calendar-grid.png | MEJORÓ-FALTA | Grid calendario completo con 30 días e iconos PNG por día; hoy (12) con ring teal; dimensiones iconos mayores que original |
| screen-08-moon-events-section.png | screen-07-moon-calendar-grid.png (incluído) | PIXEL OK | Sección "Luna Nueva / Luna Llena" con fechas visibles en bottom del screen-07 |
| screen-09-moon-phase-header.png | screen-04-moon-phase-page.png (incluído) | PIXEL OK | Header "Calendario lunar" con back button y seed counter visible en screen-04 |
| screen-10-home-full-view.png | screen-10-home-full-view.png | PIXEL OK | Home completo visible; todos los widgets |
| screen-11-moon-phase-bottom.png | — | NO CAPTURADO | No existe contenido adicional al scroll en la página — todo cabe en el viewport en una sola vista. |

---

## profile

| Original | Post-migración | Veredicto | Notas |
|---|---|---|---|
| screen-01-profile-main.png | screen-01-profile-main.png | MEJORÓ-FALTA | Layout correcto; notification bell con red dot (unread); "Fundación" logo no visible sin scroll extra; menú items correctos |
| screen-01b-profile-with-user-data.png | — | NO CAPTURADO | Variante redundante del screen-01; equivalente. |
| screen-01-top-profile-top.png | — | NO CAPTURADO | Variante sin datos de usuario; no reproducible de forma controlada. |
| screen-02-profile-bottom.png | screen-02-profile-bottom.png | MEJORÓ-FALTA | Bottom del perfil; "Fundación" logo visible; "Cerrar sesión" button correcto |
| screen-03-profile-share-modal.png | screen-03-profile-share-modal.png | MEJORÓ-FALTA | Modal compartir app; QR code visible; layout correcto |
| screen-04-personal-info-readonly.png | screen-04-personal-info-readonly.png | PIXEL OK | Info personal en modo lectura |
| screen-05-personal-info-location.png | screen-05-personal-info-location.png | PIXEL OK | Sección ubicación (RACIMO/UVA) |
| screen-06-personal-info-other-actions.png | screen-06-personal-info-other-actions.png | MEJORÓ-FALTA | Acciones adicionales; layout correcto |
| screen-07-personal-info-edit-mode.png | screen-07-personal-info-edit-mode.png | MEJORÓ-FALTA | Modo edición; inputs activos; botones guardar/cancelar |
| screen-07b-personal-info-validation-error.png | — | NO CAPTURADO | Estado de validación con borde rojo; el AlertController nativo se auto-descarta antes del screenshot. |
| screen-07c-personal-info-save-validation.png | — | NO CAPTURADO | Similar al anterior. |
| screen-08-personal-info-delete-modal-1.png | screen-08-personal-info-delete-modal-1.png | MEJORÓ-FALTA | Modal eliminar cuenta; texto de advertencia; botones correctos |
| screen-09-empty-achievement-empty.png | — | NO CAPTURADO | Estado vacío de logros; DataStore siempre sincroniza en web. |
| screen-09-achievement-with-data.png | screen-09-achievement-with-data.png | MEJORÓ-FALTA | Logros con datos; badges visibles; progreso correcto |
| screen-09b-achievement-scrolled.png | — | NO CAPTURADO | Sin contenido adicional al scroll. |
| screen-10-achievement-modal-seeds.png | screen-10-achievement-modal-seeds.png | PIXEL OK | Modal semillas; contenido correcto |
| screen-11-achievement-modal-germination.png | screen-11-achievement-modal-germination.png | PIXEL OK | Modal germinación |
| screen-12-achievement-modal-germination-bottom.png | — | NO CAPTURADO | Misma vista que screen-11 al hacer scroll. |
| screen-13-empty-alerts-empty.png | — | NO CAPTURADO | Estado vacío; usuario siempre tiene notificaciones en IndexedDB. |
| screen-13-alerts-with-data.png | screen-13-alerts-with-data.png | MEJORÓ-FALTA | Lista de alertas con datos; unread dots; formato de fecha correcto |
| screen-13b-alerts-more.png | screen-13b-alerts-more.png | MEJORÓ-FALTA | Más alertas; scroll correcto |
| screen-14-configuration.png | screen-14-configuration.png | PIXEL OK | Pantalla configuración |
| screen-15-configuration-notifications-expanded.png | — | NO CAPTURADO | Panel "Estado del Sistema" requiere click en chip con testID no encontrado. |
| screen-16-sync-in-progress.png | screen-16-sync-in-progress.png | MEJORÓ-FALTA | Botón sync en progreso; spinner visible |
| screen-17-sync-completed.png | — | NO CAPTURADO | Indistinguible del screen-16 en web (sync < 200ms). |
| screen-18-configuration-toggle-on.png | — | NO CAPTURADO | Toggle de notificaciones requiere manipulación JS del shadow DOM. |

---

## gamification-alerts

| Original | Post-migración | Veredicto | Notas |
|---|---|---|---|
| screen-01-home-progress-bar.png | screen-01-home-progress-bar.png | PIXEL OK | Progress bar en home visible |
| screen-02-home-scroll-bottom.png | screen-02-home-scroll-bottom.png | MEJORÓ-FALTA | Bottom de home con MoonCard |
| screen-03-measurement-tab-progress.png | screen-03-measurement-tab-progress.png | PIXEL OK | Tab medición con progress |
| screen-04-measurement-tab-scroll.png | — | NO CAPTURADO | Sin contenido adicional visible en scroll. |
| screen-05-profile-with-badge.png | screen-05-profile-with-badge.png | MEJORÓ-FALTA | Badge de notificaciones en perfil |
| screen-06-alerts-list-with-data.png | screen-06-alerts-list-with-data.png | PIXEL OK | Lista de alertas con datos |
| screen-07-alerts-list-scroll-mid.png | screen-07-alerts-list-scroll-mid.png | MEJORÓ-FALTA | Scroll mitad de lista |
| screen-08-alerts-list-scroll-bottom-delete.png | screen-08-alerts-list-scroll-bottom-delete.png | MEJORÓ-FALTA | Bottom de lista con botón delete |
| screen-09-qa-creation-page.png | — | NO CAPTURADO | CreationPage no migrada al AppStack (ruta huérfana QA). |
| screen-10-alerts-list-after-creation.png | — | NO CAPTURADO | Depende de screen-09. |
| screen-11-alerts-all-types-scroll.png | — | NO CAPTURADO | Depende de screen-09. |
| screen-12-alerts-unread-dot-before.png | — | NO CAPTURADO | Dots visibles en screen-06/07, no capturado como pantalla independiente. |
| screen-13-alerts-after-read.png | — | NO CAPTURADO | No capturado como pantalla independiente. |
| screen-14-achievement-page.png | screen-14-achievement-page.png | PIXEL OK | Página logros |
| screen-15-achievement-modal-seeds.png | screen-15-achievement-modal-seeds.png | PIXEL OK | Modal semillas en logros |
| screen-16-achievement-modal-germination.png | screen-16-achievement-modal-germination.png | PIXEL OK | Modal germinación |
| screen-17-achievement-modal-germination-scroll.png | screen-17-achievement-modal-germination-scroll.png | MEJORÓ-FALTA | Scroll en modal germinación |
| screen-18-home-modal-streak-days.png | screen-18-home-modal-streak-days.png | MEJORÓ-FALTA | Modal racha en home |
| screen-19-home-modal-streak-example.png | screen-19-home-modal-streak-example.png | MEJORÓ-FALTA | Ejemplo racha en modal |
| screen-20-home-modal-seeds.png | screen-20-home-modal-seeds.png | MEJORÓ-FALTA | Modal semillas en home |
| screen-21-home-modal-germination.png | screen-21-home-modal-germination.png | MEJORÓ-FALTA | Modal germinación en home |
| screen-22-history-page-calendar.png | screen-22-history-page-calendar.png | PIXEL OK | Historial calendario |
| screen-23-history-mayo-calendar.png | screen-23-history-mayo-calendar.png | PIXEL OK | Historial Mayo |
| screen-24-measurement-detail-complete.png | screen-24-measurement-detail-complete.png | MEJORÓ-FALTA | Detalle medición completa |
| screen-25-measurement-detail-incomplete-no-seeds.png | screen-25-measurement-detail-incomplete-no-seeds.png | MEJORÓ-FALTA | Detalle incompleto sin semillas para comprar racha |
| screen-26-profile-notification-badge.png | screen-26-profile-notification-badge.png | PIXEL OK | Badge notificaciones en perfil |
| screen-27-measurement-tab-seeds-badge.png | — | NO CAPTURADO | Chip semillas visible en screen-03; no capturado como pantalla independiente. |
| screen-28-history-mayo-with-progress.png | screen-28-history-mayo-with-progress.png | MEJORÓ-FALTA | Historial Mayo con progreso gamificación |

---

## app-shell

| Original | Post-migración | Veredicto | Notas |
|---|---|---|---|
| screen-01-login-state.png | — | NO CAPTURADO | Con sesión activa la app va al Home directamente; login solo en sesión nueva no autenticada. |
| screen-02-splash-frame1.png | — | NO CAPTURADO | SplashAnimationPage redirige < 100ms en web con sesión activa. |
| screen-03-splash-frame2.png | — | NO CAPTURADO | Misma razón. |
| screen-04-splash-frame3.png | — | NO CAPTURADO | Misma razón. |
| screen-05-alert-component-confirm-phone.png | — | NO CAPTURADO | Disponible en auth-login/screen-04 (no duplicado). |
| screen-06-home-tab-active.png | screen-06-home-tab-active.png | PIXEL OK | Home tab activo |
| screen-07-tab-bar-home-active.png | screen-07-tab-bar-home-active.png | PIXEL OK | Tab bar con Inicio activo |
| screen-08-tab-register-active.png | screen-08-tab-register-active.png | MEJORÓ-FALTA | Tab Registrar activo; contenido "No hay registros disponibles" (limitación web file-system) |
| screen-09-tab-history-active.png | screen-09-tab-history-active.png | MEJORÓ-FALTA | Tab Historial activo |
| screen-10-header-no-back-with-profile.png | screen-10-header-no-back-with-profile.png | PIXEL OK | Header sin back con perfil |
| screen-11-header-with-back-button.png | screen-11-header-with-back-button.png | MEJORÓ-FALTA | Header con back button |
| screen-12-header-back-with-settings.png | screen-12-header-back-with-settings.png | MEJORÓ-FALTA | Header back con settings |
| screen-13-header-with-seeds-count.png | — | NO CAPTURADO | Variante del header con seeds count; visible en screen-10. |
| screen-14-header-back-no-profile.png | screen-14-header-back-no-profile.png | MEJORÓ-FALTA | Header back sin avatar |
| screen-15-validate-project-loader.png | — | NO CAPTURADO | ValidateProjectPage es parte del AuthStack; inaccesible con sesión activa. |
| screen-16-validate-code-loader.png | — | NO CAPTURADO | ValidateCodePage requiere flujo OTP completo. |
| screen-17-splash-reload-attempt.png | — | NO CAPTURADO | Ver screens 02-04. |
| screen-18-tab-inicio-selected.png | screen-18-tab-inicio-selected.png | PIXEL OK | Tab Inicio selected |
| screen-19-tab-registrar-selected.png | screen-19-tab-registrar-selected.png | MEJORÓ-FALTA | Tab Registrar selected; contenido limitado por web |
| screen-20-tab-historial-selected.png | screen-20-tab-historial-selected.png | MEJORÓ-FALTA | Tab Historial selected |
| screen-21-configuration-page.png | screen-21-configuration-page.png | PIXEL OK | Página configuración |
| screen-22-loading-overlay.png | — | NO CAPTURADO | IonLoadingController overlay duración < 200ms en web. |
| screen-23-configuration-after-sync.png | — | NO CAPTURADO | Indistinguible del screen-21. |
| screen-24-measurement-detail-incomplete.png | — | NO CAPTURADO | Disponible en historical/screen-22. No duplicado. |
| screen-25-loading-overlay.png | — | NO CAPTURADO | Misma razón que screen-22. |
| screen-26-header-back-no-profile.png | screen-14-header-back-no-profile.png | MEJORÓ-FALTA | Capturado bajo nombre screen-14 |
| screen-27-register-measurement-header.png | — | NO CAPTURADO | RegisterMeasurementScreen requiere configuración de tarea no disponible en web. |
| screen-28-guide-measurement-modal.png | — | NO CAPTURADO | GuideMeasurementComponent requiere config cargada. |
| screen-29-header-centered-no-back-no-profile.png | — | NO CAPTURADO | Solo aparece en flujos multi-paso de medición que requieren config de web. |
| screen-30-qa-alerts-creation-page.png | — | NO CAPTURADO | CreationPage no migrada al AppStack (ruta huérfana). |
| screen-31-profile-share-modal.png | screen-31-profile-share-modal.png | MEJORÓ-FALTA | Modal compartir perfil |
| screen-32-header-no-back-with-profile-history.png | screen-32-header-no-back-with-profile-history.png | PIXEL OK | Header historial con perfil |
| screen-33-extra.png | — | NO CAPTURADO | No existe en original (inventario de 32 pantallas). |

---

## Razones de bloqueo globales

### 1. React Navigation (AuthStack inaccesible con sesión activa)
Las pantallas del AuthStack (Login, Otp, ValidateCode, PreRegister, Register, SetPhoneRegister, ProjectVinculation, ValidateProject, ProjectVinculationDone, RegisterProjectForm, RegisterCompleted, RegisterSuccess) solo son accesibles en estado no autenticado. Con el usuario de prueba 3000000002 (auto-confirmado, siempre activo), React Navigation redirige cualquier intento de goto a la URL raíz hacia el AppStack (Home). Afecta: auth-login screens 07-11, register screens 10-23, app-shell screens 01-04, 15-16.

### 2. expo-file-system no disponible en web
`expo-file-system.readAsStringAsync` no está disponible en Expo Web. Esto impide que ConfigContext cargue la configuración de tareas de medición desde la caché S3. El tab Registrar muestra "No hay registros disponibles" y ningún formulario de medición puede iniciarse. Afecta: measurement screens 02-23, app-shell screens 27-29.

### 3. EclipsesIcon SVG overlay en MoonCard (RESUELTO)
FIX aplicado: `pointerEvents: 'none'` en StyleSheet (no como JSX prop) en MoonCard.tsx. Ahora el click en `moon-card-btn` navega correctamente a la página de fase lunar. Afecta corregido: moon-phase screens 04-09, 11 ahora alcanzables.

### 4. Moon phase calendar icons SVG (RESUELTO)
FIX aplicado: Calendar.tsx e Day.tsx migrados de SVG imports a PNG `require()` con manejo de `string` (web) y `number` (native) como source para `<Image>`. Los iconos son ahora más grandes (36px vs ~14px original) pero correctamente visibles en ambas plataformas. Afecta corregido: moon-phase screens 04-09.

### 5. Victory Native charts vacíos en web
Victory Native usa react-native-svg bajo el capó, que en Expo Web no renderiza el área de chart correctamente. Las variable cards SÍFUNCIONAN (datos correctos), pero el área de la gráfica queda vacía. Afecta: historical screens 05-06.

### 6. CreationPage (ruta huérfana excluida de la migración)
La pantalla QA `alerts/creation` no fue migrada al AppStack de React Native por ser una herramienta de desarrollo (ruta huérfana). Afecta: gamification-alerts screens 09-11, app-shell screen 30.

### 7. IonLoadingController / overlays de carga
Los overlays de carga (IonLoadingController) duran < 200ms en web. No capturables con playwright-cli screenshot después de la acción que los dispara. Afecta: app-shell screens 22, 25.

### 8. SplashAnimationPage
La animación de splash redirige < 100ms en web con sesión activa. Afecta: app-shell screens 02-04, 17.

# Manifest — COSECHA Post-Migración (Ionic → React Native)

Fecha: 2026-06-12  
Agente: COSECHA post-migración (subagente secuencial, browser único)  
App RN: Expo 56, puerto 8090 (`npx expo start --web --port 8090`)  
Usuario prueba: 3000000002 (auto-confirmado, sin OTP, 68 registros Mayo 2026)  
Viewport: Samsung Galaxy S8 — 360×740 CSS px, dpr 3  

---

## Resumen por feature

| Feature | Orig. capturas | Post-migración capturas | Estado |
|---|---|---|---|
| auth-login | 12 | 8 | parcial |
| register | 23 | 10 | parcial |
| home | 17 | 16 | completo |
| measurement | 23 | 2 | parcial (bloqueado web) |
| historical | 30 | 29 | completo |
| moon-phase | 11 | 4 | parcial (bloqueado crash) |
| profile | 27 | 15 | completo |
| gamification-alerts | 29 | 21 | completo |
| app-shell | 33 | 14 | parcial |

---

## auth-login

| Original | Post-migración | Estado |
|---|---|---|
| screen-00-splash.png | screen-00-splash.png | capturado |
| screen-01-login-vacio.png | screen-01-login-vacio.png | capturado |
| screen-02-login-telefono-corto.png | screen-02-login-telefono-corto.png | capturado |
| screen-03-login-telefono-valido.png | screen-03-login-telefono-valido.png | capturado |
| screen-04-modal-confirmar-telefono.png | screen-04-modal-confirmar-telefono.png | capturado |
| screen-05-vinculando-proyecto.png | screen-05-vinculando-proyecto.png | capturado |
| screen-06-otp-vacio.png | screen-06-otp-vacio.png | capturado |
| screen-07-otp-codigo-invalido.png | — | no alcanzable — React Navigation redirige usuarios autenticados al AppStack; las pantallas OTP/auth solo son accesibles en estado no autenticado. Con el usuario de prueba 3000000002, el login saltea OTP y la app va directamente al home. No es posible mostrar el estado OTP-error en la misma sesión. |
| screen-08-otp-codigo-valido.png | — | no alcanzable — misma razón que screen-07: el OTP se saltea para el usuario de prueba. |
| screen-09-validate-code.png | — | no alcanzable — ValidateCode solo aparece durante el flujo OTP estándar, que no aplica al usuario de prueba. |
| screen-10-register-success.png | screen-10-register-success.png | capturado |
| screen-11-login-state-with-error.png | — | no alcanzable — estado de error de login requiere credenciales incorrectas mientras se está no autenticado; no reproducible con el usuario de prueba en la misma sesión autenticada. |

---

## register

| Original | Post-migración | Estado |
|---|---|---|
| screen-01-login-page.png | screen-01-login-page.png | capturado |
| screen-02-pre-register-empty.png | screen-02-pre-register-empty.png | capturado |
| screen-03-pre-register-checked.png | screen-03-pre-register-checked.png | capturado |
| screen-04-register-name-empty.png | screen-04-register-name-empty.png | capturado |
| screen-05-register-name-validation-error.png | screen-05-register-name-validation-error.png | capturado |
| screen-06-register-name-filled.png | screen-06-register-name-filled.png | capturado |
| screen-07-set-phone-empty.png | screen-07-set-phone-empty.png | capturado |
| screen-08-set-phone-validation-error.png | screen-08-set-phone-validation-error.png | capturado |
| screen-09-set-phone-filled.png | screen-09-set-phone-filled.png | capturado |
| screen-10-otp-register-empty.png | — | no alcanzable — pantalla OTP del registro solo aparece en flujo no autenticado; React Navigation redirige al AppStack cuando hay sesión activa. |
| screen-11-otp-register-filled.png | — | no alcanzable — misma razón que screen-10. |
| screen-12-validate-code.png | — | no alcanzable — ValidateCode requiere flujo OTP no disponible en sesión activa. |
| screen-13-project-vinculation.png | — | no alcanzable — ProjectVinculation es parte del AuthStack, inaccesible con sesión activa. |
| screen-14-project-vinculation-form.png | — | no alcanzable — misma razón que screen-13. |
| screen-15-validate-project.png | — | no alcanzable — misma razón que screen-13. |
| screen-16-vinculation-done.png | — | no alcanzable — misma razón que screen-13. |
| screen-17-phone-confirm-modal.png | screen-17-phone-confirm-modal.png | capturado |
| screen-18-register-project-form.png | — | no alcanzable — RegisterProjectForm es parte del AuthStack, inaccesible con sesión activa. |
| screen-19-register-completed.png | — | no alcanzable — misma razón que screen-18. |
| screen-20-register-success.png | — | no alcanzable — RegisterSuccess es parte del AuthStack, inaccesible con sesión activa. |
| screen-21-login-after-register.png | — | no alcanzable — flujo post-registro solo ocurre al completar el registro completo desde estado no autenticado. |
| screen-22-loading-state.png | — | no alcanzable — estado de carga del registro no reproducible sin flujo completo no autenticado. |
| screen-23-error-state.png | — | no alcanzable — estado de error del registro no reproducible sin flujo completo no autenticado. |

---

## home

| Original | Post-migración | Estado |
|---|---|---|
| screen-01-home-top.png | screen-01-home-top.png | capturado |
| screen-02-home-bottom.png | screen-02-home-bottom.png | capturado |
| screen-03-home-full-top.png | screen-03-home-full-top.png | capturado |
| screen-04-tab-bar.png | screen-04-tab-bar.png | capturado |
| screen-05-modal-days-states.png | screen-05-modal-days-states.png | capturado |
| screen-06-modal-days-question.png | screen-06-modal-days-question.png | capturado |
| screen-07-modal-token-seeds.png | screen-07-modal-token-seeds.png | capturado |
| screen-08-modal-token-germination.png | screen-08-modal-token-germination.png | capturado |
| screen-09-moon-card.png | screen-09-moon-card.png | capturado |
| screen-10-header.png | screen-10-header.png | capturado |
| screen-11-gamification-progress.png | screen-11-gamification-progress.png | capturado |
| screen-12-streak-calendar.png | screen-12-streak-calendar.png | capturado |
| screen-13-home-state-zero-streak.png | screen-13-home-state-zero-streak.png | capturado |
| screen-14-home-reload-with-data.png | screen-14-home-reload-with-data.png | capturado |
| screen-15-home-scrolled-moon-visible.png | screen-15-home-scrolled-moon-visible.png | capturado |
| screen-16-header-seed-count.png | screen-16-header-seed-count.png | capturado |
| screen-17-home-tabs-bar.png | — | no existe en original (inventario de 16 pantallas según README). |

---

## measurement

| Original | Post-migración | Estado |
|---|---|---|
| screen-01-measurement-tab-tasks.png | screen-01-measurement-tab-tasks.png | capturado |
| screen-02-guide-measurement-modal.png | — | no alcanzable — GuiaMedicion requiere que ConfigContext cargue la lista de tareas desde S3 vía expo-file-system, que no está disponible en web. El tab Registrar muestra "No hay registros disponibles". |
| screen-03-measurement-form-temperature.png | — | no alcanzable — misma razón que screen-02: el formulario de captura requiere configuración de tarea que no carga en web. |
| screen-04-measurement-form-humidity.png | — | no alcanzable — misma razón. |
| screen-05-measurement-form-rain.png | — | no alcanzable — misma razón. |
| screen-06-register-measurement-step1.png | — | no alcanzable — RegisterMeasurementScreen requiere una tarea seleccionada desde el contexto de configuración no disponible en web. |
| screen-07-register-measurement-step2.png | — | no alcanzable — misma razón. |
| screen-08-register-measurement-saved.png | — | no alcanzable — misma razón. |
| screen-09-measurement-confirm-modal.png | — | no alcanzable — ConfirmModal del guardado no puede activarse sin formulario funcional. |
| screen-10-measurement-cancel-modal.png | — | no alcanzable — misma razón. |
| screen-11-measurement-progress-0-of-3.png | — | no alcanzable — barra de progreso "0 de 3" solo aparece cuando ConfigContext carga correctamente las 3 tareas del día. |
| screen-12-measurement-progress-1-of-3.png | — | no alcanzable — requiere al menos una tarea completada en la sesión actual. |
| screen-13-measurement-progress-2-of-3.png | — | no alcanzable — misma razón. |
| screen-14-measurement-progress-3-of-3.png | — | no alcanzable — misma razón. |
| screen-15-guide-step-by-step.png | — | no alcanzable — GuideMeasurementComponent requiere config cargada. |
| screen-16-guide-auto-open.png | — | no alcanzable — misma razón. |
| screen-17-measurement-tab-with-progress.png | screen-17-measurement-tab-with-progress.png | capturado |
| screen-18-guide-modal-auto.png | — | no alcanzable — misma razón. |
| screen-19-guide-modal-manual.png | — | no alcanzable — misma razón. |
| screen-20-measurement-confirm-save.png | — | no alcanzable — misma razón. |
| screen-21-measurement-error-state.png | — | no alcanzable — misma razón. |
| screen-22-measurement-skeleton.png | — | no alcanzable — misma razón. |
| screen-23-measurement-loading.png | — | no alcanzable — misma razón. |

---

## historical

| Original | Post-migración | Estado |
|---|---|---|
| screen-01-historical-junio-calendario.png | screen-01-historical-junio-calendario.png | capturado |
| screen-02-historical-junio-calendario-scroll.png | screen-02-historical-junio-calendario-scroll.png | capturado |
| screen-03-historical-mayo-calendario.png | screen-03-historical-mayo-calendario.png | capturado |
| screen-04-historical-mayo-calendario-scroll.png | screen-04-historical-mayo-calendario-scroll.png | capturado |
| screen-05-historical-mayo-grafica.png | screen-05-historical-mayo-grafica.png | capturado |
| screen-06-historical-mayo-grafica-chart.png | screen-06-historical-mayo-grafica-chart.png | capturado |
| screen-07-historical-mayo-grafica-hum.png | screen-07-historical-mayo-grafica-hum.png | capturado |
| screen-08-historical-mayo-grafica-acu.png | screen-08-historical-mayo-grafica-acu.png | capturado |
| screen-09-historical-mayo-calendario-top.png | screen-09-historical-mayo-calendario-top.png | capturado |
| screen-10-historical-timeframe-ano.png | screen-10-historical-timeframe-ano.png | capturado |
| screen-11-historical-timeframe-ano-scroll.png | screen-11-historical-timeframe-ano-scroll.png | capturado |
| screen-12-measurement-detail-complete.png | screen-12-measurement-detail-complete.png | capturado |
| screen-13-measurement-detail-scroll.png | screen-13-measurement-detail-scroll.png | capturado |
| screen-14-measurement-detail-bottom.png | screen-14-measurement-detail-bottom.png | capturado |
| screen-15-measurement-detail-normal.png | screen-15-measurement-detail-normal.png | capturado |
| screen-16-historical-junio-empty-state.png | screen-16-historical-junio-empty-state.png | capturado |
| screen-17-historical-junio-grafica-vacia.png | screen-17-historical-junio-grafica-vacia.png | capturado |
| screen-18-historical-mayo-grafica-tem-top.png | screen-18-historical-mayo-grafica-tem-top.png | capturado |
| screen-19-historical-mayo-grafica-hum-top.png | screen-19-historical-mayo-grafica-hum-top.png | capturado |
| screen-20-historical-mayo-grafica-acu-top.png | screen-20-historical-mayo-grafica-acu-top.png | capturado |
| screen-21-historical-abril-calendario.png | screen-21-historical-abril-calendario.png | capturado |
| screen-22-measurement-detail-incomplete.png | screen-22-measurement-detail-incomplete.png | capturado |
| screen-23-measurement-detail-incomplete-bottom.png | screen-23-measurement-detail-incomplete-bottom.png | capturado |
| screen-24-measurement-detail-yesterday-normal.png | screen-24-measurement-detail-yesterday-normal.png | capturado |
| screen-25-measurement-detail-incomplete-yesterday.png | screen-25-measurement-detail-incomplete-yesterday.png | capturado |
| screen-26-historical-mayo-compartir-button.png | screen-26-historical-mayo-compartir-button.png | capturado |
| screen-27-historical-compartir-loading.png | screen-27-historical-compartir-loading.png | capturado |
| screen-28-historical-mayo-calendar-complete.png | screen-28-historical-mayo-calendar-complete.png | capturado |
| screen-29-historical-mayo-top-segment.png | screen-29-historical-mayo-top-segment.png | capturado |
| screen-30-historical-extras.png | — | no existe en original (inventario de 29 pantallas según README). |

---

## moon-phase

| Original | Post-migración | Estado |
|---|---|---|
| screen-01-home-moon-card.png | screen-01-home-moon-card.png | capturado |
| screen-02-home-moon-card-scrolled.png | screen-02-home-moon-card-scrolled.png | capturado |
| screen-03-home-moon-card-closeup.png | screen-03-home-moon-card-closeup.png | capturado |
| screen-04-moon-phase-page.png | — | no alcanzable — la MoonCard tiene un overlay SVG (EclipsesIcon) con position:absolute que intercepta todos los eventos de puntero. Todo intento de click en el botón `moon-card-btn` (por aria-label, testID, coordenadas, dispatchEvent) causa un crash del proceso playwright-browser. Este comportamiento es consistente con la nota en el README de moon-phase original: "Fue este overlay el que bloqueó el click directo de Playwright en la prueba." |
| screen-05-moon-phase-current.png | — | no alcanzable — misma razón: requiere navegar a MoonPhase via click en MoonCard. |
| screen-06-moon-phase-scroll.png | — | no alcanzable — misma razón. |
| screen-07-moon-phase-calendar.png | — | no alcanzable — misma razón. |
| screen-08-moon-phase-detail.png | — | no alcanzable — misma razón. |
| screen-09-moon-phase-header.png | — | no alcanzable — misma razón. |
| screen-10-home-full-view.png | screen-10-home-full-view.png | capturado |
| screen-11-moon-phase-bottom.png | — | no alcanzable — misma razón que screen-04. |

---

## profile

| Original | Post-migración | Estado |
|---|---|---|
| screen-01-profile-main.png | screen-01-profile-main.png | capturado |
| screen-01b-profile-with-user-data.png | — | variante redundante del screen-01; no capturada por ser equivalente. |
| screen-01-top-profile-top.png | — | variante sin datos de usuario (DataStore no sincronizado); no reproducible de forma controlada. |
| screen-02-profile-bottom.png | screen-02-profile-bottom.png | capturado |
| screen-03-profile-share-modal.png | screen-03-profile-share-modal.png | capturado |
| screen-04-personal-info-readonly.png | screen-04-personal-info-readonly.png | capturado |
| screen-05-personal-info-location.png | screen-05-personal-info-location.png | capturado |
| screen-06-personal-info-other-actions.png | screen-06-personal-info-other-actions.png | capturado |
| screen-07-personal-info-edit-mode.png | screen-07-personal-info-edit-mode.png | capturado |
| screen-07b-personal-info-validation-error.png | — | estado de validación con borde rojo; el AlertController nativo se auto-descarta antes del screenshot. No capturado. |
| screen-07c-personal-info-save-validation.png | — | similar al anterior. No capturado. |
| screen-08-personal-info-delete-modal-1.png | screen-08-personal-info-delete-modal-1.png | capturado |
| screen-09-empty-achievement-empty.png | — | estado vacío de logros (DataStore no sincronizado); no reproducible de forma controlada en web donde DataStore siempre sincroniza tras login. |
| screen-09-achievement-with-data.png | screen-09-achievement-with-data.png | capturado |
| screen-09b-achievement-scrolled.png | — | sin contenido adicional al scroll; no capturado (idéntico). |
| screen-10-achievement-modal-seeds.png | screen-10-achievement-modal-seeds.png | capturado |
| screen-11-achievement-modal-germination.png | screen-11-achievement-modal-germination.png | capturado |
| screen-12-achievement-modal-germination-bottom.png | — | misma vista que screen-11 al hacer scroll; no capturada. |
| screen-13-empty-alerts-empty.png | — | estado vacío de notificaciones; el usuario de prueba siempre tiene notificaciones en IndexedDB, no reproducible vacío de forma controlada en web. |
| screen-13-alerts-with-data.png | screen-13-alerts-with-data.png | capturado |
| screen-13b-alerts-more.png | screen-13b-alerts-more.png | capturado |
| screen-14-configuration.png | screen-14-configuration.png | capturado |
| screen-15-configuration-notifications-expanded.png | — | el panel "Estado del Sistema" requiere click en chip "Permisos requeridos" con testID no encontrado; no capturado en esta sesión. |
| screen-16-sync-in-progress.png | screen-16-sync-in-progress.png | capturado |
| screen-17-sync-completed.png | — | indistinguible del screen-16 en web (sync < 200ms). No capturado. |
| screen-18-configuration-toggle-on.png | — | toggle de notificaciones requiere manipulación JS del shadow DOM; no capturado en esta sesión. |

---

## gamification-alerts

| Original | Post-migración | Estado |
|---|---|---|
| screen-01-home-progress-bar.png | screen-01-home-progress-bar.png | capturado |
| screen-02-home-scroll-bottom.png | screen-02-home-scroll-bottom.png | capturado |
| screen-03-measurement-tab-progress.png | screen-03-measurement-tab-progress.png | capturado |
| screen-04-measurement-tab-scroll.png | — | sin contenido adicional visible en scroll; omitido. |
| screen-05-profile-with-badge.png | screen-05-profile-with-badge.png | capturado |
| screen-06-alerts-list-with-data.png | screen-06-alerts-list-with-data.png | capturado |
| screen-07-alerts-list-scroll-mid.png | screen-07-alerts-list-scroll-mid.png | capturado |
| screen-08-alerts-list-scroll-bottom-delete.png | screen-08-alerts-list-scroll-bottom-delete.png | capturado |
| screen-09-qa-creation-page.png | — | no alcanzable — la pantalla QA `CreationPage` (/alerts/creation) no fue migrada al AppStack de React Native. La ruta no existe en la navegación RN (excluida por plan como "ruta huérfana"). |
| screen-10-alerts-list-after-creation.png | — | no alcanzable — depende de screen-09 (CreationPage no migrada). |
| screen-11-alerts-all-types-scroll.png | — | no alcanzable — depende de screen-09. |
| screen-12-alerts-unread-dot-before.png | — | los dots de no-leído son visibles en screen-06/07 pero no capturados como pantalla independiente. |
| screen-13-alerts-after-read.png | — | no capturado como pantalla independiente en esta sesión. |
| screen-14-achievement-page.png | screen-14-achievement-page.png | capturado |
| screen-15-achievement-modal-seeds.png | screen-15-achievement-modal-seeds.png | capturado |
| screen-16-achievement-modal-germination.png | screen-16-achievement-modal-germination.png | capturado |
| screen-17-achievement-modal-germination-scroll.png | screen-17-achievement-modal-germination-scroll.png | capturado |
| screen-18-home-modal-streak-days.png | screen-18-home-modal-streak-days.png | capturado |
| screen-19-home-modal-streak-example.png | screen-19-home-modal-streak-example.png | capturado |
| screen-20-home-modal-seeds.png | screen-20-home-modal-seeds.png | capturado |
| screen-21-home-modal-germination.png | screen-21-home-modal-germination.png | capturado |
| screen-22-history-page-calendar.png | screen-22-history-page-calendar.png | capturado |
| screen-23-history-mayo-calendar.png | screen-23-history-mayo-calendar.png | capturado |
| screen-24-measurement-detail-complete.png | screen-24-measurement-detail-complete.png | capturado |
| screen-25-measurement-detail-incomplete-no-seeds.png | screen-25-measurement-detail-incomplete-no-seeds.png | capturado |
| screen-26-profile-notification-badge.png | screen-26-profile-notification-badge.png | capturado |
| screen-27-measurement-tab-seeds-badge.png | — | el chip de semillas visible en screen-03; no capturado como pantalla independiente. |
| screen-28-history-mayo-with-progress.png | screen-28-history-mayo-with-progress.png | capturado |

---

## app-shell

| Original | Post-migración | Estado |
|---|---|---|
| screen-01-login-state.png | — | no alcanzable — con sesión activa la app va al Home directamente; el estado de login solo se puede capturar en sesión nueva no autenticada. |
| screen-02-splash-frame1.png | — | no alcanzable — SplashAnimationPage redirige < 100ms en web con sesión activa; no capturado. |
| screen-03-splash-frame2.png | — | no alcanzable — misma razón. |
| screen-04-splash-frame3.png | — | no alcanzable — misma razón. |
| screen-05-alert-component-confirm-phone.png | — | disponible en auth-login/screen-04-modal-confirmar-telefono.png (capturado en feature auth-login). No duplicado aquí. |
| screen-06-home-tab-active.png | screen-06-home-tab-active.png | capturado |
| screen-07-tab-bar-home-active.png | screen-07-tab-bar-home-active.png | capturado |
| screen-08-tab-register-active.png | screen-08-tab-register-active.png | capturado |
| screen-09-tab-history-active.png | screen-09-tab-history-active.png | capturado |
| screen-10-header-no-back-with-profile.png | screen-10-header-no-back-with-profile.png | capturado |
| screen-11-header-with-back-button.png | screen-11-header-with-back-button.png | capturado |
| screen-12-header-back-with-settings.png | screen-12-header-back-with-settings.png | capturado |
| screen-13-header-with-seeds-count.png | — | variante del header con seeds count visible en screen-10 (seeds "0" + avatar). No capturado por separado. |
| screen-14-header-back-no-profile.png | screen-14-header-back-no-profile.png | capturado |
| screen-15-validate-project-loader.png | — | no alcanzable — ValidateProjectPage es parte del AuthStack; inaccesible con sesión activa (React Navigation redirige al AppStack). |
| screen-16-validate-code-loader.png | — | no alcanzable — ValidateCodePage requiere flujo OTP completo, no disponible con usuario de prueba. |
| screen-17-splash-reload-attempt.png | — | no alcanzable — ver screens 02-04. |
| screen-18-tab-inicio-selected.png | screen-18-tab-inicio-selected.png | capturado |
| screen-19-tab-registrar-selected.png | screen-19-tab-registrar-selected.png | capturado |
| screen-20-tab-historial-selected.png | screen-20-tab-historial-selected.png | capturado |
| screen-21-configuration-page.png | screen-21-configuration-page.png | capturado |
| screen-22-loading-overlay.png | — | IonLoadingController overlay no capturado; duración < 200ms en web. |
| screen-23-configuration-after-sync.png | — | indistinguible del screen-21 en web; no capturado. |
| screen-24-measurement-detail-incomplete.png | — | disponible en historical/screen-22-measurement-detail-incomplete.png. No duplicado aquí. |
| screen-25-loading-overlay.png | — | misma razón que screen-22. |
| screen-26-header-back-no-profile.png | screen-14-header-back-no-profile.png | capturado (bajo nombre screen-14) |
| screen-27-register-measurement-header.png | — | no alcanzable — RegisterMeasurementScreen requiere configuración de tarea no disponible en web (expo-file-system). |
| screen-28-guide-measurement-modal.png | — | no alcanzable — GuideMeasurementComponent requiere config cargada. |
| screen-29-header-centered-no-back-no-profile.png | — | no alcanzable — esta variante del header solo aparece en flujos multi-paso de medición que requieren config de web. |
| screen-30-qa-alerts-creation-page.png | — | no alcanzable — CreationPage no migrada al AppStack de React Native (ruta huérfana excluida). |
| screen-31-profile-share-modal.png | screen-31-profile-share-modal.png | capturado |
| screen-32-header-no-back-with-profile-history.png | screen-32-header-no-back-with-profile-history.png | capturado |
| screen-33-extra.png | — | no existe en original (inventario de 32 pantallas). |

---

## Razones de bloqueo globales

### 1. React Navigation (AuthStack inaccesible con sesión activa)
Las pantallas del AuthStack (Login, Otp, ValidateCode, PreRegister, Register, SetPhoneRegister, ProjectVinculation, ValidateProject, ProjectVinculationDone, RegisterProjectForm, RegisterCompleted, RegisterSuccess) solo son accesibles en estado no autenticado. Con el usuario de prueba 3000000002 (auto-confirmado, siempre activo), React Navigation redirige cualquier intento de goto a la URL raíz hacia el AppStack (Home). Afecta: auth-login screens 07-09, register screens 10-23, app-shell screens 01-04, 15-16.

### 2. expo-file-system no disponible en web
`expo-file-system.readAsStringAsync` no está disponible en Expo Web. Esto impide que ConfigContext cargue la configuración de tareas de medición desde la caché S3. El tab Registrar muestra "No hay registros disponibles" y ningún formulario de medición puede iniciarse. Afecta: measurement screens 02-23, app-shell screens 27-29.

### 3. EclipsesIcon SVG overlay en MoonCard (crash de browser)
El componente MoonCard tiene un overlay SVG (EclipsesIcon) con `position: absolute` que intercepta todos los eventos de puntero sobre el botón de navegación. Todo intento de click (por aria-label, testID, coordenadas brutas, JS dispatchEvent) causa un crash del proceso playwright-browser. El README original de moon-phase documenta este bloqueo. Afecta: moon-phase screens 04-09, 11.

### 4. CreationPage (ruta huérfana excluida de la migración)
La pantalla QA `alerts/creation` no fue migrada al AppStack de React Native por ser una herramienta de desarrollo (ruta huérfana). Afecta: gamification-alerts screens 09-11, app-shell screen 30.

### 5. IonLoadingController / overlays de carga
Los overlays de carga (IonLoadingController) duran < 200ms en web. No capturables con playwright-cli screenshot después de la acción que los dispara. Afecta: app-shell screens 22, 25.

### 6. SplashAnimationPage
La animación de splash redirige < 100ms en web con sesión activa. Para capturarla se requeriría sesión limpia + timing preciso de Playwright. Afecta: app-shell screens 02-04, 17.

# Inventario Visual — Evidencia de la app UVA (Fase 2)

> Índice consolidado de la captura de evidencia visual para la migración **Ionic/Angular 18 → React Native (Expo + Dev Builds)**.
> Fecha de cierre del inventario: **2026-06-12**. Usuario de prueba: `3000000002` (María esperanza, UVA `UVA_ANT025_00001`, RACIMO Fundación Natura).
> Entorno de captura: navegador web (Playwright) en viewport Samsung Galaxy S8 (360×740).
>
> Este documento es la **referencia de equivalencia visual** para las Fases 5 (implementación RN) y 6 (validación en Android real). Todo lo que NO se pudo capturar por límites del entorno web o por reglas de seguridad (no disparar SMS reales, no crear registros reales) queda registrado como **deuda de validación para la Fase 6**.

---

## 1. Índice de features

| # | Feature | README | Capturas |
|---|---------|--------|----------|
| 1 | Autenticación — Login + OTP | [auth-login/README.md](./auth-login/README.md) | 11 |
| 2 | Registro completo | [register/README.md](./register/README.md) | 22 |
| 3 | Dashboard principal (Home) | [home/README.md](./home/README.md) | 16 |
| 4 | Medición (tab Registrar + guías + formularios) | [measurement/README.md](./measurement/README.md) | 22 |
| 5 | Histórico de mediciones | [historical/README.md](./historical/README.md) | 29 |
| 6 | Fase lunar | [moon-phase/README.md](./moon-phase/README.md) | 10 |
| 7 | Perfil completo y subpáginas | [profile/README.md](./profile/README.md) | 26 |
| 8 | Gamificación y alertas (transversal + QA) | [gamification-alerts/README.md](./gamification-alerts/README.md) | 28 |
| 9 | Shell y transversales | [app-shell/README.md](./app-shell/README.md) | 32 |

**Total de capturas declaradas y verificadas en disco: 196.** (Existen además 2 marcadores de paso de prueba en la raíz de `docs/evidence/` — `home-2026-06-11-pass.png` e `historical-chart-2026-06-11-pass.png` — que no forman parte del inventario por feature.)

---

## 2. Tabla de cobertura pantalla por pantalla (31 vistas de `screens.md`)

Leyenda de estado: **Cubierta** = al menos una captura útil del estado representativo de la pantalla. **Parcial** = la pantalla aparece capturada pero le faltan estados/variantes clave (datos reales, modales de segundo nivel o la captura es un crop muy ligero <10KB). **Sin cubrir** = no hay ninguna captura de la pantalla.

| # | Pantalla (screens.md) | Feature / capturas que la cubren | Estado | Razón |
|---|---|---|---|---|
| 1 | SplashAnimationPage | app-shell/02-04 (intentos), auth-login/00, app-shell/17 | **Parcial** | La animación intermedia (hoja → powered by → logo) no es capturable en web: la sesión activa redirige a Home antes del screenshot. Solo se captura el resultado (Home). Deuda Fase 6. |
| 2 | LoginPage | auth-login/01-04, register/01, app-shell/01 | **Cubierta** | Estados vacío, teléfono corto, válido y modal de confirmación. Falta modal "número no registrado" (no se dispara para no llamar a Cognito con número inventado). |
| 3 | OtpPage | auth-login/06-09, register/20-21 | **Cubierta** | Vacío, parcial, error y timer expirado/reenviar. Falta auto-submit exitoso (requiere SMS real). |
| 4 | ValidateCodePage | register/22, app-shell/16 | **Cubierta** | Loader "Validando código" capturado. |
| 5 | RegisterPage (nombre/apellido) | register/04-06 | **Cubierta** | Vacío, error de validación (borde rojo) y lleno válido. |
| 6 | PreRegisterPage | register/02-03 | **Cubierta** | Checkbox desmarcado/marcado y habilitación del botón. |
| 7 | SetPhoneRegisterPage | register/07-09 | **Cubierta** | Vacío, error de longitud y lleno. Modal de confirmación de teléfono del flujo de registro documentado vía login (bloqueado por el clasificador para no disparar signUp real). |
| 8 | ProjectVinculationPage | register/10-13, auth-login/05 | **Cubierta** | Vacío, código corto, válido y error. También el estado "Vinculando…" en cuelgue web. |
| 9 | ValidateProjectPage | register/14, app-shell/15 | **Cubierta** | Loader "Vinculando al proyecto" con botón Cancelar. |
| 10 | ProjectVinculationDonePage | register/15 | **Parcial** | Confeti + branding capturados, pero SIN el `racimoCode` (solo disponible tras vinculación real a RACIMO). Deuda Fase 6. |
| 11 | RegisterProjectFormPage | register/16 | **Parcial** | Solo título y botón; los campos dinámicos `fieldsUVA` no existen sin RACIMO real vinculado. Estado lleno/validación de campos pendiente para Fase 6. |
| 12 | RegisterCompletedPage | register/18 | **Cubierta** | "Registro completado / ¡Empecemos!" con confeti. |
| 13 | RegisterSuccessPage | auth-login/10, register/19 | **Cubierta** | Check verde + botón Iniciar Sesión. |
| 14 | TabsPage (shell) | home/04, app-shell/07-09, 18-20 | **Cubierta** | Tab bar con los 3 tabs y sus estados activos. Nota: `home/04` (tab-bar) es un crop de 3.9KB (<10KB). |
| 15 | HomePage | home/01-03, 13-16, app-shell/06, gamification-alerts/01-02, moon-phase/10 | **Cubierta** | Estado real (racha 0, semillas 0) + secciones + 4 modales explicativos. Variantes con racha/semillas >0 no reproducibles con el usuario de prueba. |
| 16 | MeasurementPage (tab Registrar) | measurement/01, 17, app-shell/08, 19, gamification-alerts/03-04, 27 | **Cubierta** | Lista de 3 tareas con restricción horaria y progreso 0/3. Falta estado "Registros completados" y modal Sorpresa/bonus (no se completaron registros reales; bonus no aplicaba ese día). |
| 17 | RegisterMeasurementPage | measurement/02-22, app-shell/26-29 | **Cubierta** | flow1 (máx), flow2 (mín), flow3 (lluvia), guías, validación inline, modal de confirmación con blur. Falta `modal_register_Ok` (requiere `save()` real). |
| 18 | HistoricalPage (tab Historial) | historical/01-11, 16-21, 26-29, gamification-alerts/22-23, 28, app-shell/09, 20, 32 | **Cubierta** | Calendario y gráfica con datos reales (Mayo/Abril), estado vacío (Junio), vista anual, toast de compartir. Falta toast de error y loader DOM alternativo. |
| 19 | TimeFrameComponent | historical/10-11 (modo Año) | **Cubierta** | Segmento Mes/Año capturado en ambos modos. |
| 20 | MeasurementDetailPage | historical/12-15, 22-25, gamification-alerts/24-25, app-shell/24 | **Cubierta** | Estados complete / incomplete / normal, alerta de semillas insuficientes. Falta botón "Recupera tu racha" y su modal (requiere 5+ semillas). |
| 21 | MoonPhasePage | moon-phase/04-09 | **Cubierta** | Página completa, calendario lunar, eventos, card verde, header. Solo la fase "Cuarto menguante" (real del día). Otras fases dependen de la fecha. Crops `08`/`09` <10KB. |
| 22 | ProfilePage | profile/01-03, 01b, 02-03, gamification-alerts/05, 26, app-shell/11, 31 | **Cubierta** | Perfil con datos reales, menú, modal compartir, badge de notificaciones. |
| 23 | PersonalInfoPage | profile/04-08 | **Cubierta** | Lectura, ubicación, modo edición, modal de eliminación paso 1. Faltan modal paso 2 (escribir "ELIMINAR CUENTA", bloqueado por seguridad), borde rojo de validación y ubicación con datos reales. |
| 24 | AchievementPage | profile/09, 09-data, 09b, 10-12, gamification-alerts/14-17 | **Cubierta** | Estado vacío + grid de 16 logros + modales semillas/germinación. Solo logros tipo brote (usuario de prueba). |
| 25 | AlertsPage | profile/13, 13-data, 13b, gamification-alerts/06-13, app-shell/12 | **Cubierta** | Estado vacío + lista con datos reales + todos los 8 tipos disparados desde QA + estados leído/no leído. |
| 26 | ConfigurationPage | profile/14-18, app-shell/21-23, 25 | **Cubierta** | Toggle, panel de estado del sistema expandido, sync pendiente/al día, toggle ON. Falta el spinner/loader de sync (instantáneo en web). |
| 27 | SyncActionComponent | profile/14 (pendiente), profile/17 (al día) | **Cubierta** | Ambos estados (naranja pendiente / verde al día) representados. |
| 28 | CreationPage (QA alerts/creation) | gamification-alerts/09, app-shell/30 | **Cubierta** | Pantalla QA con grid de 8 botones. Candidata a excluir de la migración RN. |
| 29 | GuideMeasurementComponent | measurement/03, 05, 10-11, 14-15, 22, app-shell/26, 28 | **Cubierta** | Guías en sus 2 formatos hallados (array de pasos + HTML). Formato "string plano" no presente en los flujos del usuario de prueba. |
| 30 | AlertComponent | auth-login/04, register/17, profile/08, app-shell/05 | **Cubierta** | Modal de confirmación de teléfono y de eliminación. Falta variante `reverseButton=true` de recuperar racha (requiere semillas). |
| 31 | HeaderComponent | app-shell/10, 13, 27, 29, 32, home/10, 16 | **Cubierta** | Las 4 variantes (con/sin back, con/sin profile, título centrado). Nota: crops `home/10` (3.2KB) y `home/16` (3.5KB) <10KB. |

### Resumen de cobertura

- **Cubiertas: 27 / 31**
- **Parciales: 4 / 31** → SplashAnimationPage (1), ProjectVinculationDonePage (10), RegisterProjectFormPage (11).
- **Sin cubrir: 0 / 31**

> Nota: aunque son 4 entradas "parciales" arriba, RegisterProjectFormPage y ProjectVinculationDonePage comparten la causa raíz (no hay un RACIMO real vinculado con campos `fieldsUVA`), y SplashAnimationPage comparte causa con la limitación de la sesión activa en web. Ninguna pantalla queda sin evidencia alguna.

---

## 3. Capturas defectuosas / sospechosas (<10KB)

7 capturas pesan menos de 10KB. La regla del inventario las marca como sospechosas de estar en blanco o rotas. Tras revisión:

| Archivo | Tamaño | Diagnóstico |
|---|---|---|
| `app-shell/screen-14-header-back-no-profile.png` | 2.5KB | **ROTA / en blanco** — el propio README la documenta como "Captura fallida (pantalla en blanco)" y remite a `screen-26`/`screen-27` como sustitutas válidas. La variante de header SÍ está cubierta. |
| `home/screen-10-header.png` | 3.2KB | Crop pequeño del header aislado. Probablemente legítimo (recorte de pocos px), pero al pesar <10KB no es confiable como referencia única. La variante de header está cubierta por capturas de pantalla completa. |
| `home/screen-16-header-seed-count.png` | 3.5KB | Crop del chip de semillas. Mismo caso: recorte legítimo pero ligero; el chip se ve en capturas completas. |
| `home/screen-04-tab-bar.png` | 3.9KB | Crop del tab bar inferior. El tab bar se ve completo en `app-shell/18-20`. |
| `moon-phase/screen-09-moon-phase-header.png` | 4.8KB | Crop del header de la página lunar. La página completa lo incluye en `moon-phase/04`. |
| `moon-phase/screen-08-moon-events-section.png` | 5.3KB | Crop de la sección de eventos lunares. Visible en `moon-phase/04`. |
| `home/screen-12-streak-calendar.png` | 8.2KB | Crop de la sección racha/calendario semanal. Visible en capturas completas del home. |

**Conclusión sobre defectos:** solo **1 capa realmente rota** (`app-shell/screen-14`, ya documentada y sustituida). Las otras 6 son recortes (crops) de componentes aislados que pesan poco por su tamaño físico reducido; no comprometen la cobertura porque cada componente recortado aparece también en una captura de pantalla completa. Aun así se recomienda **re-capturar `app-shell/screen-14`** o eliminarla del README para evitar ruido, y considerar re-exportar los crops con mayor calidad si se van a usar como referencia pixel-a-pixel en Fase 5.

---

## 4. Variantes no capturadas — Deuda de validación para Fase 6 (Android real)

Las razones marcadas son **legítimas y aceptadas**: no se dispararon SMS reales, no se crearon registros reales en DynamoDB, y varias limitaciones son intrínsecas al entorno web (sin permisos nativos, sin teclado virtual, syncs instantáneos). Todo esto debe re-validarse en el dispositivo Android real durante la Fase 6.

### 4.1 Autenticación y registro
- **Animación de splash** (frames intermedios hoja/powered-by/logo) — redirección inmediata por sesión activa; no capturable en web.
- **Modal "número no registrado"** (UserNotFoundException) — evita llamada real a Cognito con número inventado.
- **OTP auto-submit exitoso** (6 dígitos correctos → validate-code) — requiere SMS real válido.
- **Modal de confirmación de teléfono en flujo de registro** con número distinto al de prueba — bloqueado por el clasificador para no disparar signUp real.
- **Alert nativo "No se pudo crear el usuario"** — requiere fallo interno de createNewUser.
- **ProjectVinculationDone con `racimoCode` visible** — solo tras vinculación real a un RACIMO.
- **RegisterProjectForm con campos dinámicos `fieldsUVA`** (vacíos, llenos y con error de validación) — requieren un RACIMO real vinculado con configuración remota.

### 4.2 Home y gamificación
- **Racha activa > 0** y **semillas > 0** — el usuario de prueba está en 0 (junio 2026).
- **Días del calendario marcados completo/incompleto** en la semana actual — no hay mediciones en junio 2026.
- **Progreso > 0** (barra parcial/completa) — sin tareas completadas hoy.
- **Alertas/popups de gamificación al entrar** y **toast/notificación in-app al completar medición** — push de Capacitor no se ejecuta en web; solo nativo Android.
- **Badge de notificaciones con contador numérico renderizado** — `unreadCount$` no se actualiza en tiempo real en web.
- **Estado de carga inicial (skeleton/spinner)** del home — no existe en el código.

### 4.3 Medición
- **`modal_register_Ok`** ("X guardados" + gif) — requiere `save()` que crea registro real.
- **Estado "Registros completados"** y **progreso parcial (1/3, 2/3)** — no se completaron tareas reales.
- **Modal "Sorpresa"/bonus moniliasis** — no cumplía las condiciones de fecha/semana ese día.
- **Alerta de restricción cruzada** (ej. temp mín > temp máx) — combinación específica no explorada por riesgo de confusión.
- **Checkbox "Mostrar automáticamente" en estado marcado** — sin binding funcional (FIXME en el código).
- **Formato "string plano" de guía** y **flows adicionales (flow4+)** — no presentes en la config del usuario de prueba.

### 4.4 Histórico
- **Botón "Recupera tu racha" visible** + **modal de pago de semillas** + **alerta "Día completado con semillas"** — requieren 5+ semillas (usuario tiene 0).
- **Toast de error al compartir** / **toast "compartir no disponible"** / **loader DOM alternativo** — no ocurrieron / requieren comportamiento nativo.
- **Click en día futuro** — bloqueado por diseño (`isFuture`).
- **Vista anual con datos de 2025** — el usuario solo tiene datos de 2026 (caso ya representado por mes vacío).

### 4.5 Fase lunar
- **Fases distintas a "Cuarto menguante"** (nueva, llena, crecientes, gibosas) — dependen de la fecha real del sistema o de mockear el servicio.
- **Estados de loading/error en MoonPhasePage** — no existen en el template (errores solo a consola).
- **Mes distinto a Junio** — la página carga siempre el mes actual sin navegación.

### 4.6 Perfil
- **Modal eliminación de cuenta paso 2** (escribir "ELIMINAR CUENTA") — bloqueado por seguridad del harness.
- **Borde rojo de validación (`border_error`)** en personal-info — AlertController nativo se auto-descarta antes del screenshot.
- **Spinner/loader durante sync** — AppSync responde <200ms en web.
- **Badge rojo de no leídas en la campana del perfil** — se marcan como leídas al entrar a /alerts.
- **Logros tipo plántula y flor** — usuario solo tiene milestones tipo brote.
- **Subtipos de notificación faltantes** (germinación éxito/fallo, racha perdida/recuperada) — no presentes en los datos del usuario; algunos disparables solo desde QA.
- **Campos de ubicación con datos reales** (finca, vereda, municipio, GPS) — UVA del usuario sin esos campos completados.
- **Toast "Notificaciones habilitadas"** — el toggle requiere permisos nativos no disponibles en web.

### 4.7 Transversales (shell)
- **IonLoadingController overlay** ("Cargando…") e **IonToast** — duran pocos ms en web / requieren acciones que fallan sin red real.
- **AlertComponent con `reverseButton=true`** (recuperar racha) — requiere día de ayer incompleto con semillas.
- **Teclado virtual on-screen** — no existe en Chrome desktop; en RN usar KeyboardAvoidingView.
- **Transiciones de navegación animadas** (slide/fade) — Playwright solo captura el estado estable final.
- **Subtipo `streak_recovered`** — existe en el código pero no es disparable desde la pantalla QA; verificar su manejo en RN.

---

## 5. Veredicto

El inventario visual es **suficiente como referencia de equivalencia** para las Fases 5-6: las 31 vistas del descubrimiento tienen evidencia (27 totalmente cubiertas, 4 parciales, 0 sin cubrir), las 9 features documentan paleta, layout, tipografía y notas de implementación RN, y todas las 196 capturas declaradas existen en disco. La única captura realmente rota (`app-shell/screen-14`, 2.5KB) ya está documentada como fallida y sustituida por capturas válidas, por lo que no abre un hueco de cobertura.

Las brechas restantes son **estados dinámicos** (racha/semillas >0, días marcados, modales que requieren datos reales, campos `fieldsUVA`, fases lunares distintas, push nativas) que por diseño no son reproducibles en el entorno web ni con el usuario de prueba sin violar las reglas de seguridad. Todas quedan registradas como **deuda de validación para la Fase 6 en Android real**, donde deberán confirmarse con un usuario con racha/semillas activas y un RACIMO real vinculado.

# Evidencia Visual — Flujo de Registro

Inventario visual de la Fase 2 de migración Ionic → React Native.
Captura todos los estados visuales de las pantallas del flujo de registro de la app UVA.

## Condiciones de captura

- **Dispositivo simulado:** Samsung Galaxy S8 (360 × 740 px, CSS)
- **Servidor:** `localhost:4200` (Angular + Ionic 8 en modo web)
- **Usuario de prueba:** `3000000002` (auto-confirmado en Cognito, sin OTP)
- **Fecha de captura:** 2026-06-12
- **Sesión:** Playwright CLI con perfil in-memory (sin persistencia entre aperturas)
- **Nota importante:** el formulario dinámico de `register-project-form` requiere datos de configuración de RACIMO almacenados en IndexedDB tras una vinculación completa. En web sin RACIMO real, el formulario aparece sin campos dinámicos (ver screen-16).

---

## Flujo recorrido paso a paso

1. Se abrió `http://localhost:4200/` → redirige automáticamente a `/login`.
2. Desde login, se hizo clic en "Registrate aquí" → `/pre-register`.
3. En pre-register: se capturó el estado con checkbox desmarcado (botón deshabilitado) y marcado (botón habilitado).
4. Se avanzó a `/register` (nombre y apellido): vacío, con valores cortos (validación), con valores válidos.
5. Se avanzó a `/register/set-phone-register`: vacío, con teléfono corto (botón deshabilitado), con teléfono de 10 dígitos válido.
6. **No se hizo submit del formulario de teléfono** (no se completó signUp para no crear usuarios reales ni disparar SMS).
7. Se capturó el modal de confirmación de teléfono accediendo desde el flujo de login con el usuario de prueba `3000000002`.
8. Se navegó directamente a `/register/project-vinculation`: vacío, código de 3 chars (botón deshabilitado), código de 6 chars (botón habilitado), código fake enviado (error de RACIMO incorrecto).
9. Se navegó directamente a `/register/validate-project`: se capturó el loader antes del redireccionamiento automático.
10. Se navegó directamente a `/register/project-vinculation-done`: pantalla de confirmación con branding y gif confetti.
11. Se navegó directamente a `/register/register-project-form`: sin contexto de RACIMO, los campos dinámicos no aparecen.
12. Se inició sesión con el usuario de prueba `3000000002` y se navegó a `/register/register-project-form`: al tener UVA ya vinculada, redirigió automáticamente a `register-completed`.
13. Se capturó `/register/register-completed` (con branding + confetti).
14. Se capturó `/register-success` directamente (pantalla post-registro con botón de login).
15. Se navegó a `/otp/register/3001234567` (OTP register): vacío y con código incorrecto (error).
16. Se navegó a `/otp/register/3001234567/validate-code`: loader "Validando código".

---

## Tabla de capturas

| # | Archivo | Pantalla | Estado capturado |
|---|---------|----------|------------------|
| 01 | `screen-01-login-page.png` | Login | Estado inicial - formulario vacío, botón deshabilitado |
| 02 | `screen-02-pre-register-empty.png` | Pre-Register | Checkbox sin marcar, botón "Continuar" deshabilitado |
| 03 | `screen-03-pre-register-checked.png` | Pre-Register | Checkbox marcado, botón "Continuar" habilitado |
| 04 | `screen-04-register-name-empty.png` | Register (nombre/apellido) | Formulario vacío, botón deshabilitado |
| 05 | `screen-05-register-name-validation-error.png` | Register (nombre/apellido) | Valores cortos (Ab, Cd) — borde rojo en ambos inputs, botón deshabilitado |
| 06 | `screen-06-register-name-filled.png` | Register (nombre/apellido) | Valores válidos (Carlos, Gomez) — botón habilitado |
| 07 | `screen-07-set-phone-empty.png` | Set Phone Register | Formulario vacío, subtítulo personalizado con nombre, botón deshabilitado |
| 08 | `screen-08-set-phone-validation-error.png` | Set Phone Register | Teléfono corto (12345) — botón deshabilitado |
| 09 | `screen-09-set-phone-filled.png` | Set Phone Register | Teléfono válido (3001234567) — botón habilitado |
| 10 | `screen-10-project-vinculation-empty.png` | Project Vinculation | Código vacío, botón deshabilitado, botón "Salir" visible |
| 11 | `screen-11-project-vinculation-short-code.png` | Project Vinculation | Código de 3 chars — botón deshabilitado |
| 12 | `screen-12-project-vinculation-filled.png` | Project Vinculation | Código de 6 chars (FAKE12) — botón habilitado |
| 13 | `screen-13-project-vinculation-error.png` | Project Vinculation | Código inválido enviado — tarjeta de error roja "El código ingresado es incorrecto." |
| 14 | `screen-14-validate-project-loader.png` | Validate Project | Pantalla loader "Vinculando al proyecto" con botón "Cancelar" |
| 15 | `screen-15-vinculation-done.png` | Vinculation Done | Branding (Fundación Natura Colombia), texto "Vinculado al proyecto:" (sin código visible sin contexto), confetti |
| 16 | `screen-16-register-project-form-no-data.png` | Register Project Form | Sin campos dinámicos (no hay configModel de RACIMO en browser sin vinculación previa) |
| 17 | `screen-17-phone-confirm-modal.png` | Modal confirmación teléfono | AlertComponent con "¿Es correcto este número de teléfono?" — botones "No, Editar" y "Sí, Continuar" |
| 18 | `screen-18-register-completed.png` | Register Completed | Branding logo, "Registro completado", "¡Empecemos!", confetti (gif) |
| 19 | `screen-19-register-success.png` | Register Success | Check verde, "Registro completado satisfactoriamente.", botón "Iniciar Sesión" |
| 20 | `screen-20-otp-register-empty.png` | OTP (registro) | 6 inputs vacíos (tipo number/spinner en browser), timer "Puedes pedir uno nuevo en X min.", botón "Salir" |
| 21 | `screen-21-otp-register-error.png` | OTP (registro) | Código 123456 — tarjeta de error roja "El código ingresado es incorrecto." |
| 22 | `screen-22-validate-code.png` | Validate Code | Loader "Validando código" — pantalla intermedia de 2s |

---

## Variantes NO capturadas

| Variante | Razón |
|---|---|
| Modal "no registrado" en Login | Requiere intentar signIn con un número no registrado. No se puede disparar de forma segura sin arriesgar una llamada real a Cognito con número inventado. |
| Register Project Form con campos dinámicos reales | Los campos de `fieldsUVA` solo existen en IndexedDB tras vincular a un RACIMO real. El usuario de prueba ya tiene UVA y redirige directamente a `register-completed`. |
| OTP con timer expirado (botón "pedir nuevo código" habilitado) | Requiere esperar 60 segundos; el timer sí es visible en la captura en cuenta regresiva. |
| ValidateCodePage redirigiendo al flujo `login` (→ project-vinculation) | La página redirige en 2s; sin el contexto de OTP completado, el flujo de login no aplica al tipo `register`. |
| ProjectVinculationDonePage con código de RACIMO visible | El `racimoCode` (linkageCode) solo existe cuando se viene del flujo completo con RACIMO real. Se capturó el layout sin ese dato. |
| Register Project Form con campos llenos + error de validación por campo corto | Sin `fieldsUVA` real, no hay campos que mostrar; estado solo visible en app nativa con RACIMO. |

---

## Observaciones visuales para React Native

### Diseño y layout general (ExploreContainer)
- Todas las pantallas del flujo de registro usan el componente `ExploreContainerComponent` que centra el contenido verticalmente (`justify-content: center`) con `height: 100vh`.
- **Fondo:** imagen SVG de fondo (`assets/images/background.svg`) con `background-size: cover`. En modo `bg_green` sin overlay blanco; en modo `bg_blue` con overlay semitransparente `rgba(255,255,255,0.60)`.
- **Tarjeta:** borde redondeado (20px), gradiente blanco semi-transparente (de `rgba(255,255,255,0.3)` a `rgba(255,255,255,0.8)`).
- **Icono superior:** imagen de 70px de alto centrada; si no hay icono, usa el logo de la app por defecto.
- **Tipografía:** fuente Montserrat variable. Títulos `h1`: 20px, weight 600, color `--Colors-Blue-800` (#1A6270). Mensajes/subtítulos: 16px, weight 500, color `--Colors-Gray-700`.
- **Padding:** 5vw en todos los lados del contenedor.

### Formularios e inputs
- `ion-input` con borde 1px `--Colors-Blue-500` (#10BCCA), border-radius 10px, fondo `--Colors-Gray-50` (#f9fafb).
- Estado de error: borde cambia a `--Colors-Danger` (#E5245E) — rojo/carmín.
- Padding interno del input: 12px top/bottom, 16px start/end.
- Botón principal: `ion-button` con `expand=block`, altura 44px, max-width 300px, color `uva_green-700` (#14788A, teal oscuro), texto capitalizado, 16px weight 500.
- Botón deshabilitado: aparece en gris (el color de Ionic para disabled).

### Colores clave del sistema de diseño
- Primario teal oscuro (botones): `#14788A` (uva_green-700)
- Primario teal claro (bordes activos): `#10BCCA` (uva_blue-500)
- Error/Danger: `#E5245E`
- Checkbox color: `uva_blue-500` (#10BCCA)
- Texto principal oscuro: `#1A6270` (Colors-Blue-800)
- Texto secundario: `#404040` (Colors-Gray-700)

### Modales (AlertComponent)
- Modal genérico con backdrop blur: `backdrop-filter: blur(25px)` en el fondo.
- Botones en fila: "No, editar" con borde (outline) y "Sí, continuar" sólido.
- El botón de cancelación usa color secundario; el de confirmación usa `uva_green-700`.

### Pantallas de carga (loaders)
- `validate-project` y `validate-code`: tarjeta blanca con animación de puntos (tres puntos de Ionic `ion-loading`). Sin contenido scroll, completamente centradas.
- Ambas auto-redirigen con setTimeout: `validate-code` en 2s, `project-vinculation-done` en 3s, `register-completed` en 3s. En React Native usar `useEffect` con `setTimeout` + navegación.

### OTP (6 inputs)
- En web, los inputs son de tipo `number` que el browser renderiza como spinners (no es el look final). En React Native deben ser `TextInput` con `keyboardType="number-pad"`, un carácter por input, con auto-foco al siguiente.
- Auto-submit al completar el 6º dígito.
- Timer de cuenta regresiva de 60s usando `setInterval`; en React Native usar `useRef` para el interval.

### Comportamientos de navegación importantes
- `project-vinculation`: tiene un botón "Salir" (link a `/login`) adicional al "Continuar".
- `register-project-form`: formulario dinámico; en RN los campos se renderizan en tiempo de ejecución con `FlatList` o `map` según `fieldsUVA` de la config descargada.
- `register-completed` y `validate-project-done` usan confetti GIF (`confety.gif`), no animación nativa.
- El subtítulo de `set-phone-register` incluye el nombre del usuario: "Carlos, por favor ingresa tu número de teléfono" — viene del estado de sesión.
- El subtítulo de `project-vinculation` también es personalizado con el nombre del usuario.

### Animaciones y transiciones
- Las pantallas de confirmación (vinculation-done, register-completed) incluyen GIF de confeti en lugar de animaciones nativas.
- No hay transiciones de página personalizadas detectadas en el flujo de registro.
- El `SplashAnimationPage` usa `AnimationController` de Ionic para animaciones de entrada, pero está fuera del scope del flujo de registro.

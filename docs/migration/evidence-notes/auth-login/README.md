# Evidencia visual — Flujo Autenticación: Login + OTP

> Fase 2 de la migración Ionic/Angular → React Native (Expo + Dev Builds).
> Capturas de referencia para equivalencia visual. Viewport: Samsung Galaxy S8 (360×740).

---

## Condiciones de captura

- **Usuario de prueba:** `3000000002` (Cognito auto-confirmado, sin OTP real).
- **Fecha de captura:** 2026-06-11.
- **Dev server:** `http://localhost:4200` (Angular 18 + Ionic 8).
- **Workaround web:** tras confirmar el teléfono, el flujo queda colgado en "Vinculando al proyecto" (DataStore no puede obtener tokens Cognito en el browser). Se usa `goto` directo a `/app/tabs/home` para continuar.
- **OTP:** la pantalla OTP se alcanzó vía `goto` a `/otp/login/3000000002` directamente, sin disparar un SMS real.

---

## Flujo recorrido paso a paso

1. Se recargó `/` (raíz) para capturar el splash. La sesión ya estaba activa, por lo que el splash redirigió inmediatamente a `/app/tabs/home` (captura `screen-00`).
2. Se navegó a `/login` para capturar la pantalla de login en estado vacío (`screen-01`).
3. Se escribió "123" en el campo de teléfono para verificar la validación de longitud mínima; el botón "Continuar" permanece deshabilitado (`screen-02`).
4. Se escribió "3000000002" — el botón se habilita y cambia de color (`screen-03`).
5. Se hizo clic en "Continuar" — se abrió el modal de confirmación de teléfono (`screen-04`).
6. Se confirmó con "Sí, Continuar" — la app navega a `register/project-vinculation` y queda colgada en "Vinculando al proyecto" (`screen-05`).
7. Se navegó via `goto` a `/otp/login/3000000002` — pantalla OTP vacía con temporizador en cuenta regresiva (`screen-06`).
8. Se ingresaron "1", "2", "3" en los primeros tres campos — avance automático de foco, los tres primeros dígitos visibles (`screen-07`).
9. Se intentó enviar un código incorrecto (6 dígitos inventados) — se mostró la tarjeta de error en rojo (`screen-08`).
10. Se esperó a que el temporizador llegara a 0 — aparece el botón "Reenviar código" en lugar del texto del contador (`screen-09`).
11. Se navegó via `goto` a `/register-success` — pantalla de confirmación de registro satisfactorio con botón "Iniciar Sesión" (`screen-10`).

---

## Tabla de capturas

| #   | Archivo                                     | Pantalla                                        | Descripción                                                                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00  | `screen-00-splash.png`                      | Home (post-splash)                              | El splash redirigió a Home porque la sesión ya estaba activa. Muestra el estado inicial de la pantalla de inicio tras autenticación. La pantalla splash real dura aprox. 2–3 s con animaciones y no es capturabale en su estado intermedio sin timing exacto.                                                                                       |
| 01  | `screen-01-login-vacio.png`                 | LoginPage — estado inicial vacío                | Fondo degradado teal (`#10BCCA`→`#14788A`), tarjeta blanca centrada, logo UVA, título "Hola de nuevo 👋", campo `tel` con placeholder `XXXXXXXXXX`, botón "Continuar" deshabilitado (gris), texto de ayuda, enlace "Registrate aquí".                                                                                                               |
| 02  | `screen-02-login-telefono-corto.png`        | LoginPage — validación longitud mínima          | Teléfono "123" (3 dígitos, minLength=10): botón "Continuar" permanece deshabilitado (mismo aspecto gris). No hay mensaje de error visible en la UI — la validación es silent (solo bloquea el botón).                                                                                                                                               |
| 03  | `screen-03-login-telefono-valido.png`       | LoginPage — teléfono válido (10 dígitos)        | Teléfono "3000000002" completo: botón "Continuar" se habilita y cambia a color `uva_green-700` (`#14788A`), texto en blanco.                                                                                                                                                                                                                        |
| 04  | `screen-04-modal-confirmar-telefono.png`    | LoginPage — modal de confirmación               | `AlertComponent` superpuesto sobre la pantalla de login (fondo detrás se torna semitransparente). Texto: "¿Es correcto este número de teléfono: **3000000002**?". Dos botones: "No, Editar" (borde azul, sin relleno) y "Sí, Continuar" (relleno teal `#10BCCA`). `backdropDismiss: false`.                                                         |
| 05  | `screen-05-vinculando-proyecto.png`         | ProjectVinculationPage — estado "colgado" (web) | Pantalla simplificada: logo, texto "Vinculando al proyecto", spinner animado (pequeño, solo visible en movimiento), botón "Cancelar". Fondo degradado teal igual que login. Estado real de cuelgue web documentado (DataStore no puede sincronizar tokens Cognito en el browser; en la app nativa funciona).                                        |
| 06  | `screen-06-otp-vacio.png`                   | OtpPage — estado vacío con temporizador         | Tarjeta blanca. Título "Verifica tu teléfono". Instrucción con el número de teléfono. 6 inputs de 1 dígito c/u separados por guiones bajos, todos vacíos. Texto "¿No has recibido ningún código? Puedes pedir uno nuevo en 0:52 min." Botón/texto "Salir".                                                                                          |
| 07  | `screen-07-otp-parcialmente-llenado.png`    | OtpPage — 3 dígitos ingresados                  | Campos 1, 2, 3 rellenados con "1", "2", "3". El foco avanza automáticamente al siguiente campo en cada dígito. El cuarto campo tiene el foco activo (spinner de number input visible en web). Temporizador avanzando (0:12 min).                                                                                                                    |
| 08  | `screen-08-otp-error-codigo-incorrecto.png` | OtpPage — tarjeta de error                      | Los 6 campos aparecen vacíos (limpiados tras el error). Tarjeta de error con fondo blanco y borde: título en rojo/pinkish "El código ingresado es incorrecto." subtítulo "Por favor, inténtalo de nuevo o pide un nuevo código." Temporizador sigue corriendo (0:21 min). No hay botón de submit visible (solo se envía al completar el 6° dígito). |
| 09  | `screen-09-otp-reenviar-codigo.png`         | OtpPage — temporizador a cero, botón reenviar   | Cuando el temporizador llega a 0: desaparece el texto contador y aparece el botón "Reenviar código" (relleno teal). El campo OTP aparece con el foco en el primer input. Texto de ayuda "¿No has recibido ningún código?" sin el contador.                                                                                                          |
| 10  | `screen-10-register-success.png`            | RegisterSuccessPage                             | Fondo degradado claro (variante más clara del teal). Tarjeta blanca. Icono de check verde con confeti. Título "Registro completado satisfactoriamente." Subtítulo "Inicia sesión para empezar a usar UVA app". Botón "Iniciar Sesión" (`uva_green-700`). Sin botón de back. Navega a `/login` con `replaceUrl:true`.                                |

---

## Variantes no capturadas

| Variante                                                             | Razón                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pantalla splash (animación real)                                     | La animación dura ~2–3 s con tres fases (hoja, "powered by", logo MakeSens) y `setInterval` de 100ms. En el intento de captura la sesión ya estaba activa, por lo que el splash redirigió inmediatamente a Home. Requeriría limpiar completamente la sesión de Cognito y timing exacto para capturar el frame de animación intermedio.                            |
| Login — botón "Continuar" en estado loading/spinner                  | No existe: la pantalla no tiene loading explícito; el UX va directo al modal de confirmación.                                                                                                                                                                                                                                                                     |
| Modal "El número no se encuentra registrado" (UserNotFoundException) | No capturable de forma segura: requeriría un número no registrado en Cognito, lo que dispararía una llamada real al backend. Se documenta por código: muestra "El número **{phone}** no se encuentra registrado. ¿Quieres registrarte?" con botones "No" / "Sí, registrame".                                                                                      |
| ValidateCodePage ("Validando código")                                | Pantalla intermedia con `loader.gif` y `setTimeout` de 2000ms. Al navegar via `goto` directamente a la ruta `otp/login/3000000002/validate-code`, la pantalla redirige antes de que se pueda capturar (el timeout de 2s transcurre instantáneamente en la navegación directa). Solo alcanzable en el flujo completo de OTP exitoso, que requiere código SMS real. |
| OtpPage — auto-submit al 6° dígito (éxito)                           | No capturable sin código SMS real válido. El auto-submit navega a `validate-code` al completar 6 dígitos.                                                                                                                                                                                                                                                         |
| OtpPage — alert nativo "No se pudo crear el usuario"                 | Solo ocurre si `createNewUser` falla internamente; no reproducible sin manipular el backend.                                                                                                                                                                                                                                                                      |
| PreRegisterPage (bienvenida + T&C)                                   | No forma parte del flujo de login/OTP estrictamente; es el inicio del flujo de registro. Capturado en feature independiente de registro.                                                                                                                                                                                                                          |
| SetPhoneRegisterPage (teléfono en registro)                          | Parte del flujo de registro, no de login/OTP.                                                                                                                                                                                                                                                                                                                     |
| ProjectVinculationPage — error de código incorrecto                  | Parte del flujo de vinculación post-login, no del flujo login/OTP puro. Tiene su propia tarjeta de error inline.                                                                                                                                                                                                                                                  |

---

## Notas visuales para implementacion en React Native

### Colores de token

| Token                               | Hex       | Uso                                                                                                                                                        |
| ----------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uva_green-700` / `Colors-Blue-700` | `#14788A` | Fondo de header en Home, botón "Continuar" habilitado, botón "Sí, Continuar" en modal, botón "Iniciar Sesión" en RegisterSuccess, botón "Reenviar código". |
| `uva_blue-500` / `Colors-Blue-500`  | `#10BCCA` | Tinte del degradado de fondo en login/OTP/splash. Color de acento del modal (botón primario).                                                              |
| `Colors-Danger`                     | `#E5245E` | Texto de error en la tarjeta OTP ("El código ingresado es incorrecto.").                                                                                   |
| Blanco                              | `#FFFFFF` | Tarjeta central en todas las pantallas auth, texto en botones de color.                                                                                    |

### Degradado de fondo (pantallas de autenticación)

El fondo de todas las pantallas del flujo auth (login, OTP, vinculación, splash) es un degradado vertical de `#10BCCA` (teal claro, arriba) a `#14788A` (teal oscuro, abajo). En React Native usar `LinearGradient` de Expo.

### Tarjeta central

Las pantallas de auth usan un contenedor `app-explore-container` que resulta en una tarjeta con:

- Fondo blanco.
- Bordes redondeados (aprox. 16px).
- Sombra ligera.
- Padding interno de ~24px.
- Centrada verticalmente en la pantalla.
- Ancho ~90% del viewport (324px en 360px de ancho).

### Botón principal

- Estado deshabilitado: fondo gris neutro (aprox. `#A3A3A3`), texto blanco, sin ripple ni interacción.
- Estado habilitado: fondo `#14788A`, texto blanco, efecto ripple al pulsar.
- `expand="block"`: ocupa el 100% del ancho de la tarjeta.
- No hay loading spinner dentro del botón; la transición al siguiente estado es inmediata.

### Campo de teléfono

- `type="tel"`, `maxlength=10`.
- Borde redondeado, color de borde gris claro en reposo.
- Sin prefijo de país visible en el input (el +57 se añade internamente al llamar Cognito).
- Validación: `minLength(10)` y `maxLength(10)`. Ningún mensaje de error inline — solo el botón se deshabilita.

### Modal de confirmación de teléfono

- Implementado como `ion-modal` con `AlertComponent` (no `ion-alert` nativo).
- Ocupa solo la parte inferior/central, no pantalla completa.
- Fondo detrás del modal no desaparece, solo se oscurece levemente.
- `backdropDismiss: false` — no se puede cerrar tocando fuera.
- Botón secundario ("No, Editar"): outline, color de borde teal.
- Botón primario ("Sí, Continuar"): relleno teal.

### OTP — inputs de 6 dígitos

- 6 inputs individuales de 1 caracter cada uno.
- Borde inferior (estilo "underline", no caja completa).
- Auto-avance de foco al ingresar cada dígito (`onDigitsChange`).
- Al completar el 6° dígito, se auto-envía sin botón de submit.
- Solo acepta dígitos (`^\d*$`).
- Al limpiar tras error, todos los campos se vacían y el foco regresa al primero.

### Temporizador OTP

- Cuenta regresiva de 60 segundos, formato `M:SS`.
- Mientras corre: texto "Puedes pedir uno nuevo en {M:SS} min." (gris claro).
- Al llegar a 0: el texto desaparece y aparece el botón "Reenviar código".
- El botón "Reenviar código" reinicia el timer a 60s y re-envía el SMS (en producción).
- `setInterval` + `ChangeDetectorRef.detectChanges()` — en RN usar `setInterval` + `setState` o una solución con `useEffect`.

### Pantalla "Vinculando al proyecto"

- Logo centrado.
- Texto "Vinculando al proyecto".
- Spinner de carga (gif animado en Ionic; en RN usar `ActivityIndicator`).
- Botón "Cancelar" siempre visible (navega a `/login`).
- Esta pantalla es el punto donde el usuario queda colgado en web pero en nativo continúa (DataStore sincroniza y navega a `app/tabs/home`).

### Tipografía

- Fuente global: `Montserrat` (sans-serif).
- Título de tarjeta: ~20px bold.
- Subtítulo: ~14px regular.
- Texto de ayuda/párrafo: ~12–13px, color gris neutro.
- Texto de error OTP: ~14px bold, color `#E5245E`.

### Animaciones y gestos

- **Splash:** animaciones CSS Ionic (`AnimationController`) — hoja que cae, fade-in de "powered by", fade-in del logo MakeSens. En RN usar `Animated` o `react-native-reanimated`.
- **Modal de confirmación:** entrada con slide-up (behavior por defecto de Ionic modal). En RN usar `react-native-modal` o `BottomSheet`.
- **Transición de pantallas:** fade o slide-horizontal estándar de Ionic. En RN configurar con React Navigation `screenOptions`.
- **Botón deshabilitado→habilitado:** cambio de color sin animación (reactivo al estado del formulario).
- No hay gestos swipe-to-go-back explícitos configurados en el flujo de auth (no se usa `IonBackButton` en login/OTP).

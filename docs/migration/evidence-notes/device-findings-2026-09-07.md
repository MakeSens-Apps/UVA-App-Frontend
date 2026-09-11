# Hallazgos device Redmi Note 10S (Android 13, MIUI 14, 1080x2400 @440dpi) — 2026-09-07

## F-01 Login: franja gris vertical en el borde derecho (~40px) — el fondo no cubre el ancho completo. Captura 04-now.png. Severidad: ALTA (visible en la primera pantalla).

## F-02 Splash nativo muestra el icono placeholder de Expo (círculos/grid), no el splash de UVA. mobile/assets/splash-icon.png / icon.png son plantillas. Severidad: ALTA (identidad de marca).

## F-03 expo-notifications: "Custom sound 'default' not found in native app" al arrancar. Canal configurado con sound:'default' como archivo. Severidad: MEDIA.

## F-04 DataStore arranca antes del login → 7 modelos x3 subscriptionError "Connection failed" + "NoValidAuthTokens: No federated jwt". Verificar si el original también lo hace (comportamiento preexistente) o si es regresión de orden de arranque. Severidad: MEDIA (ruido / posible retraso de sync).

## F-05 Warnings "Amplify has not been configured" x7 antes de Amplify.configure(): algún módulo llama a Amplify en import-time. Severidad: BAJA.

## F-06 Tab bar (Inicio/Registrar/Historial) queda DEBAJO de la barra de navegación de Android (3 botones): las etiquetas se solapan con los botones del sistema. Falta safe-area inset inferior en el tab bar con edge-to-edge (targetSdk 36 / RN 0.85). Captura 05-home.png. Severidad: ALTA. Reportado por el usuario ("el menú aparece debajo de los botones").

## F-07 Primer arranque post-login: FileNotFoundException leyendo racimos/ANT025/config.json antes de que termine la descarga (carrera lectura vs download). La app se recupera sola (config.json existe después). Severidad: BAJA.

## OK Home: fecha, racha, calendario semanal, semilla SVG, progreso 0 de 3, MoonCard "Cuarto menguante" con imagen. Sin franja gris (F-01 es específico de Login).

## Recorrido del usuario (frames flow/001-021, 19:19-19:22)

## F-08 RegisterMeasurement: los dígitos escritos se ven RECORTADOS (solo la mitad inferior del "5" y del "0"): el TextInput por dígito tiene height/lineHeight insuficiente en Android; el texto queda centrado abajo y cortado. Frame 009. Original screen-06: dígitos completos. Severidad: ALTA (el usuario no puede verificar lo que escribió).

## F-09 RegisterMeasurement + Guía: se perdió el formato enriquecido del texto en nativo: subtítulo "Registros de **temperatura** y **humedad** <verde>máxima</verde>", labels "**Temperatura** máxima" con "Temperatura" en naranja, pasos de la guía con negritas (ADJ-MAX/MIN., MAX). En device todo sale plano. En web (r2/r3) se dio PIXEL OK → sospechar rama nativa de RichText/varTokenResolver o que el config trae HTML y nativo lo renderiza como texto plano. Frames 005/007 vs originales screen-03/screen-06. Severidad: MEDIA.

## F-10 RegisterMeasurement: faltan las flechas verdes ↑ a la derecha de cada tarjeta (Temperatura/Humedad) del original; el icono "i" de "¿Cómo ver este dato?" es un cuadrado azul en vez del círculo del original. Severidad: BAJA.

## F-11 Guía de medición: el sheet ocupa toda la pantalla y el botón X queda DEBAJO de la barra de estado (frame 005); en el original es un bottom-sheet con el header visible detrás y la X bajo el status bar. "Entendido" queda bajo la barra de navegación (misma causa que F-06). Severidad: ALTA (la X casi no se puede tocar).

## OK Validación de rango: "¿Estás seguro de este dato? La temperatura max no puede ser mayor a 38 °C" aparece al escribir 50 (frame 009), igual que el original screen-07.

## OK Lista de tareas (frame 014): restricción "Disponible hasta las 08:00" en 2 tareas a las 8:16, tarea de la tarde habilitada, iconos emoji como el original.

## OK Historial vista Año (frame 018): 12 meses, cabecera Tem/Hum/Acu, navegación 2025/2026/2027. Valores vacíos (sin datos sincronizados aún; F-04 sync pre-login puede retrasarlo). Sin franja gris.

## Frame 021 negro = pantalla apagada por el usuario (SCREEN_OFF en logcat 19:22:48), NO un crash. Cero FATAL/AndroidRuntime en toda la sesión.

# Ficha de Google Play — UVA App (`com.makesens.appuva`)

Material y respuestas para completar la publicación en Play Console.

> **UVA App es un producto exclusivo de MakeSens.** Fundación Natura e ISAGEN no
> participan del producto, no lo operan y **no reciben ningún dato**. Cualquier
> mención o logo de esas organizaciones dentro de la app es un remanente a
> eliminar — ver [issue #57](https://github.com/MakeSens-Apps/UVA-App-Frontend/issues/57).

| Dato | Valor |
|---|---|
| `applicationId` | `com.makesens.appuva` |
| Organización en Play Console | `4727280100437498477` |
| Build de referencia | `V2.2.11` — `versionCode` 178830096, `targetSdk` 36 |
| Commit | `71a7a9c` |

---

## 1. Recursos gráficos

Todo generado y verificado contra los requisitos de Play.

| Archivo | Tamaño | Requisito | Estado |
|---|---|---|---|
| `graficos/icono-512.png` | 512×512 | 512×512 PNG | ✅ aplanado sobre blanco, sin transparencia |
| `graficos/grafico-funciones-1024x500.png` | 1024×500 | 1024×500 | ✅ |
| `screenshots/01-inicio.png` | 1080×1920 | 9:16, 320–3840 px | ✅ |
| `screenshots/02-registrar-medicion.png` | 1080×1920 | 9:16 | ✅ |
| `screenshots/03-historial.png` | 1080×1920 | 9:16 | ✅ |
| `screenshots/04-perfil.png` | 1080×1920 | 9:16 | ✅ |
| `screenshots/05-guia-medicion.png` | 1080×1920 | 9:16 | ✅ |

Son 5 capturas: dentro del rango de 2 a 8 que exige Play. Todas en 1080×1920,
que es 9:16 exacto. Ninguna contiene marca de terceros.

**Cómo se generaron.** Capturas reales de la app corriendo (build de `www/`,
usuario de prueba `3000000002`, RACIMO ANT025) con Playwright en viewport
360×640 y `deviceScaleFactor` 3. No son mockups.

### Textos sugeridos para cada captura

1. **Inicio** — "Tu racha y tus registros del día, de un vistazo."
2. **Registrar medición** — "Registra temperatura, humedad y lluvia en minutos."
3. **Historial** — "Consulta tu historial por mes o por año."
4. **Perfil** — "Tus logros, tus semillas y tu progreso."
5. **Guía de medición** — "Guías paso a paso para tomar cada dato correctamente."

### Limitación conocida de las capturas

La cuenta de prueba **no tiene mediciones registradas**, así que varias pantallas
muestran estados vacíos: "Progreso: 0 de 3", "0 Registros", y la racha aparece
como "Tienes Días de racha" sin número. Son capturas honestas, pero comercialmente
flojas.

No generé datos ficticios porque eso significaría escribir en el backend de
**producción**. Si quieren capturas con datos, hay dos caminos limpios:

- Usar una cuenta real de un colaborador activo (con su permiso), o
- Registrar mediciones de prueba en el ambiente `develop` y capturar ahí.

La pantalla **"Tus logros" quedó descartada**: sin logros desbloqueados se ve
como un fondo verde vacío.

---

## 2. Detalles de acceso para el revisor de Google

**Verificado**: inicié sesión con estas credenciales y llegué a la pantalla principal.

```
Número de teléfono:  3000000002
Contraseña:          no se requiere
```

La app **no pide contraseña**: la pantalla de acceso solo solicita el número de
teléfono. Internamente usa el número como usuario y como contraseña
(`signIn({ username: phone, password: phone })`).

`3000000002` está en la lista de usuarios de prueba
(`src/app/core/services/auth/test-users.service.ts`), lo que hace dos cosas:
**omite la verificación por SMS (MFA)** y levanta la restricción horaria de las
mediciones. El revisor **no necesita recibir ningún SMS**.

### Instrucciones para pegar en Play Console (español)

```
La app solo pide el número de teléfono; no usa contraseña.

1. Abrir la app y esperar la pantalla de bienvenida.
2. En "Por favor ingresa tu número de teléfono", escribir: 3000000002
3. Tocar "Continuar".
4. En el cuadro de confirmación, tocar "Sí, Continuar".
5. La app vincula automáticamente la cuenta al proyecto de prueba y entra a
   la pantalla principal. Puede tardar hasta 60 segundos.

Esta cuenta es de prueba y omite la verificación por SMS, por lo que no se
requiere recibir ningún código.
```

### Instrucciones en inglés (por si el revisor las necesita)

```
The app only asks for a phone number; there is no password.

1. Open the app and wait for the welcome screen.
2. Where it says "Por favor ingresa tu número de teléfono", enter: 3000000002
3. Tap "Continuar" (Continue).
4. In the confirmation dialog, tap "Sí, Continuar" (Yes, Continue).
5. The app automatically links the account to a test project and opens the
   home screen. This can take up to 60 seconds.

This is a test account that bypasses SMS verification, so no code is needed.
```

> **Antes de enviar**: confirmar que la cuenta `+573000000002` sigue activa en el
> pool de Cognito de producción. Yo la validé contra el backend real, pero conviene
> que no la borren mientras la ficha esté en revisión.

---

## 3. Clasificación de contenido (IARC)

### Sobre la autorización

**No puedo darte esa autorización, y no debería.** Aceptar los Términos y
Condiciones de la IARC es la firma de un acuerdo legal en nombre de MakeSens.
Eso lo tiene que hacer una persona con capacidad de obligar a la empresa —
representante legal o quien tenga poder delegado para ello. Ni yo ni un análisis
del código pueden sustituir esa decisión.

Lo que sí puedo darte son las respuestas al cuestionario de contenido,
fundamentadas en lo que la app realmente hace.

### Respuestas propuestas (todas verificadas contra el código)

| Pregunta | Respuesta | Por qué |
|---|---|---|
| Violencia | **No** | La app solo captura datos de clima |
| Violencia sexual o desnudez | **No** | — |
| Lenguaje soez | **No** | Todo el texto es fijo y redactado por MakeSens |
| Sustancias controladas | **No** | — |
| Juegos de azar / apuestas simuladas | **No** | La gamificación son rachas y logros, sin apuesta ni azar |
| Miedo / terror | **No** | — |
| Compras dentro de la app | **No** | No hay ningún SDK de pagos |
| Publicidad | **No** | No hay SDK de anuncios (verificado en `package.json`) |
| Comparte ubicación con otros usuarios | **No** | Ver sección 4 |
| Permite interacción entre usuarios | **No** | No hay chat, comentarios ni perfiles públicos |

### El único punto que requiere tu criterio

**Contenido generado por usuarios.** Técnicamente los usuarios sí generan
contenido: las mediciones. Pero **no se comparten con otros usuarios dentro de
la app** — no hay feed, ni comentarios, ni perfiles visibles entre personas. Cada
quien ve su propio historial.

Existe la función "Compartir" del reporte ambiental, pero exporta una imagen
**hacia afuera** de la app (WhatsApp, redes), no la publica dentro de ella.

Mi lectura es que la respuesta correcta es **No**, porque IARC pregunta por
contenido intercambiado *entre usuarios dentro de la app*. Confírmalo antes de
marcarlo: si respondes "Sí" te va a exigir declarar mecanismos de moderación
que la app no tiene.

---

## 4. Seguridad de los datos

Auditado sobre el código, no sobre supuestos. Fuente: `src/API.ts` (esquema
GraphQL), `AndroidManifest.xml` y `package.json`.

### Qué recopila

| Categoría Play | Dato | Dónde vive | Obligatorio |
|---|---|---|---|
| Info personal → Nombre | `Name`, `LastName` | `User` | Sí |
| Info personal → Teléfono | `PhoneNumber` | `User` (y Cognito) | Sí |
| Info personal → Correo | `Email` | `User` | **No**, opcional |
| Actividad en la app → Interacciones | `screenName`, `action`, `duration`, `sessionID` | `AppUsageEvent` | Sí |
| Actividad en la app → Otros | Mediciones, logros, rachas, semillas | `Measurement`, `UserProgress`, `GamificationEvent` | Sí |

### Ubicación: la respuesta es **NO**

Esto es lo más importante de esta sección, porque es fácil equivocarse.

**La app no recopila la ubicación del dispositivo.** Evidencia:

- **No hay permisos de ubicación en el Manifest.** Ni `ACCESS_FINE_LOCATION` ni
  `ACCESS_COARSE_LOCATION`. Sin ese permiso, Android no permite leer el GPS.
- **No está instalado `@capacitor/geolocation`** ni ningún plugin equivalente.
- **Nunca se llama a `getCurrentPosition()`** ni a ninguna API de geolocalización.

Sí existen campos `latitude`, `longitude` y `altitude`, pero pertenecen a la
entidad **UVA** (la estación de monitoreo, no la persona) y **los escribe el
usuario a mano** en un formulario de "Información personal"
(`personal-info.page.ts:243`). Son las coordenadas del sitio de medición, tecleadas
por quien lo administra, no una lectura del sensor del teléfono.

> **Punto de criterio tuyo:** Play pregunta por datos que la app recopila, sin
> distinguir del todo entre "leído del sensor" y "escrito por el usuario". Mi
> recomendación es declarar **No** en Ubicación y, si quieren ser conservadores,
> declarar esas coordenadas bajo *Info personal → Otros* explicando que son la
> ubicación de una estación de monitoreo ingresada manualmente. Declarar
> "Ubicación precisa" sería incorrecto y además obligaría a justificar un permiso
> que la app no tiene.

### Cifrado en tránsito: **Sí**

Todo el tráfico va contra AWS Amplify — AppSync (GraphQL), Cognito (identidad) y
S3 (archivos). Los tres exponen únicamente endpoints HTTPS/TLS; no hay endpoint
en texto plano. No hay ningún servidor propio fuera de AWS.

### Borrado de datos: **Sí, desde la app**

Existe borrado de cuenta dentro de la app: Perfil → Información personal →
eliminar cuenta, con confirmación escribiendo literalmente `ELIMINAR CUENTA`
(`personal-info.page.ts:330`). Ejecuta `deleteUser()` de Amplify Auth.

> **Verificar con backend antes de responder.** `deleteUser()` elimina la cuenta
> de **Cognito**. Si los registros de DynamoDB (`User`, `UVA`, `Measurement`,
> `AppUsageEvent`) se borran también depende de que exista un trigger o proceso en
> el backend, y eso no se puede determinar desde el código del frontend. Play
> pregunta si el usuario puede solicitar el borrado de **sus datos**, no solo de su
> cuenta. Si el backend no los purga, hay que declarar un procedimiento manual y
> publicar un correo de contacto para solicitudes de borrado.

### Compartir con terceros: **No**

- **No hay ningún SDK de terceros.** Verificado en `package.json`: sin Firebase,
  sin Analytics, sin Crashlytics, sin Sentry, sin AdMob, sin redes sociales.
- La analítica de uso (`AppUsageEvent`) es propia y va al backend de MakeSens en AWS.
- **AWS es un procesador de datos por encargo**, no un tercero receptor. Play no
  exige declararlo como "compartido con terceros".
- **Fundación Natura e ISAGEN no reciben ningún dato.** No hay integración, ni
  endpoint, ni exportación hacia ellos en ninguna parte del código.

La única salida de datos hacia afuera es voluntaria y la inicia el usuario:
compartir el reporte ambiental como imagen a otra app de su teléfono.

---

## 5. Público objetivo y contenido

**Grupo de edad: 13+ (adolescentes y adultos).** Correcto.

**¿Podría atraer a niños aunque no esté dirigida a ellos? → No.**

Razones para responder No:

- El acceso exige un número de teléfono propio y quedar vinculado a un RACIMO,
  que es un proyecto gestionado por una organización. Un niño no se inscribe solo.
- El contenido es instrumental: leer un termohigrómetro, registrar milímetros de
  lluvia. No hay personajes, ni narrativa, ni nada de temática infantil.
- No hay publicidad ni compras dentro de la app.

> **Sé consciente del matiz**: la app sí tiene gamificación con emojis, colores
> vivos, "semillas" y rachas. Un revisor podría señalarlo. La defensa es sólida —
> es un mecanismo de adherencia para colaboradores de campo adultos, un patrón
> común en apps de productividad y salud — pero si el formulario te deja
> justificar la respuesta, vale la pena escribir exactamente eso.

---

## 6. Archivo de desofuscación (`mapping.txt`)

**No existe, y no es un olvido: la app no ofusca código.**

En `android/app/build.gradle:43` está `minifyEnabled false`. Con la minificación
apagada, R8 no corre, no renombra clases y **no genera ningún `mapping.txt`**. No
hay nada que subir.

Los stack traces de fallos van a llegar a Play Console ya legibles, con nombres
de clase reales. Sube el archivo solo si algún día activan R8.

> Activar `minifyEnabled true` reduciría el APK y ofuscaría el código, pero en
> una app Capacitor exige reglas de ProGuard cuidadosas (reflexión de plugins,
> Amplify, DataStore) y puede romper la app en runtime de formas difíciles de
> depurar. **No lo cambies en el camino a esta publicación.** Es un trabajo
> aparte, con pruebas en dispositivo.

---

## 7. El aviso sobre el `versionCode`

**La advertencia de Google es genérica y en este caso no aplica.** Los números:

| | |
|---|---|
| `versionCode` actual | 178.830.096 |
| Máximo de Android (int32) | 2.147.483.647 |
| Margen restante | 1.968.653.551 |
| Consumo anual | 3.153.600 |
| **Años hasta el tope** | **≈ 624 (año 2650)** |

El CI genera el `versionCode` como `unix_timestamp / 10`
(`.github/workflows/build-android-bundle.yml`). Crece con el reloj, no con la
cantidad de publicaciones: **3,15 millones por año, sin importar cuántas versiones
saquen.** El tope está a seis siglos. No hay riesgo de quedarse sin números.

### Lo que sí es un costo real

1. **Es irreversible.** Play exige `versionCode` estrictamente creciente. Al haber
   publicado con 178 millones, **nunca podrán volver a números pequeños** para
   esta ficha. Si alguien prefería un esquema legible (1, 2, 3…), esa puerta se
   cerró al subir el primer bundle.
2. **No dice nada.** Ver `178830096` no permite saber a qué versión corresponde.
   El `versionName` (2.2.11) es el único dato legible.
3. **Colisión teórica.** Dos builds lanzados dentro de la misma ventana de 10
   segundos producirían el mismo número. Improbable, pero posible en dos tags
   pusheados a la vez.

### Recomendación

**No cambies nada antes de esta publicación.** El esquema funciona, el margen es
enorme y tocarlo ahora solo agrega riesgo a una entrega que ya está lista.

Si más adelante quieren algo legible, el reemplazo natural — manteniendo el
crecimiento — es **minutos desde una época propia**:

```bash
VERSION_CODE=$(( ($(date +%s) - 1704067200) / 60 ))   # minutos desde 2024-01-01
```

Da números mucho más chicos, sigue siendo monótono y elimina la colisión de 10
segundos. **Pero solo sirve si arrancan una ficha nueva**, porque cualquier valor
así sería *menor* que 178 millones y Play lo rechazaría. Para `com.makesens.appuva`
ya están comprometidos con el esquema actual — que, insisto, alcanza hasta el año
2650.

---

## Resumen: qué falta para poder enviar

| # | Punto | Estado |
|---|---|---|
| 1 | Recursos gráficos | ✅ Listos en este folder |
| 2 | Acceso para el revisor | ✅ Verificado — texto listo para pegar |
| 3 | IARC — respuestas de contenido | ✅ Propuestas |
| 3 | IARC — **aceptar T&C legales** | ⛔ **Requiere autorización de MakeSens** |
| 4 | Seguridad de datos | ⚠️ Listo, salvo confirmar el borrado en backend |
| 5 | Público objetivo | ✅ 13+, no dirigida a niños |
| 6 | `mapping.txt` | ✅ No existe ni corresponde |
| 7 | `versionCode` | ✅ Sin riesgo real — no tocar |
| — | Marca de Natura/ISAGEN en la app | ⚠️ [issue #57](https://github.com/MakeSens-Apps/UVA-App-Frontend/issues/57) |
| — | Prueba de edge-to-edge en dispositivo | ⚠️ Pendiente (`targetSdk` 36) |

**Bloqueantes reales: dos.** La aceptación de los T&C de la IARC, que necesita una
persona con capacidad legal en MakeSens, y confirmar con backend si el borrado de
cuenta purga también los datos en DynamoDB.

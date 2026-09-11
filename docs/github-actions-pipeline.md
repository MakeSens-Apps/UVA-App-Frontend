# GitHub Actions — pipeline de CI/CD (React Native)

Este documento describe, a nivel de proceso, el pipeline de CI/CD para la app RN en `mobile/`. Los workflows en sí viven en `.github/workflows/` y son la fuente de verdad para nombres exactos de jobs, triggers y pasos — este documento no los repite literalmente porque están en evolución activa durante el cierre de la migración Ionic→RN; donde haga falta el detalle exacto, "ver workflow" apunta a ese directorio.

## Qué corre en el pipeline

El pipeline tiene, conceptualmente, dos responsabilidades separadas:

1. **CI de calidad** — lint + tests en cada cambio a `mobile/`: `npm run lint` y `npm run test:ci` (Jest) contra Node 22, con `npm ci` a partir de `mobile/package-lock.json`. Este job bloquea el merge si falla. Ver el workflow correspondiente en `.github/workflows/` (filtra por cambios bajo `mobile/**`).
2. **Build y release Android** — genera el binario nativo Android a partir del código RN:
   - `npm ci` en `mobile/`
   - `npx expo prebuild --platform android` (Continuous Native Generation — regenera `mobile/android/`, que no está versionado)
   - Firma inyectada durante el prebuild vía config plugin, usando el keystore y credenciales de secrets (ver `docs/release-workflow.md`)
   - Compilación con **Gradle** (`./gradlew assembleRelease` o `./gradlew bundleRelease` según el artefacto pedido — APK o AAB)
   - Publicación del artefacto firmado (como artifact de GitHub Actions, y opcionalmente subida directa a Google Play — ver más abajo)

No hay ningún paso de **EAS Build** ni **EAS Submit** en este pipeline: todo el build nativo corre dentro del runner de GitHub Actions con Gradle.

## Secrets y variables

| Nombre | Tipo | Uso |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | Secret | Keystore de firma de release, codificado en base64; se decodifica a `.jks` en el runner. |
| `KEYSTORE_PASSWORD` | Secret | Password del keystore. |
| `KEY_ALIAS` | Secret | Alias de la llave dentro del keystore. |
| `KEY_PASSWORD` | Secret | Password de la llave. |
| `PLAY_SERVICE_ACCOUNT_JSON` | Secret | Credenciales de cuenta de servicio de Google Play (Play Developer API), usadas solo si la subida automática está habilitada. |
| `PLAY_DEPLOY_ENABLED` | Variable | Interruptor: si no está activa, el AAB queda solo como artifact de GitHub Actions (subida manual a Play); si está activa, el workflow además publica en Play Console. |
| `PLAY_DEVELOPER_ID` | Variable o secret | Opcional. Número largo tras `/developers/` en la URL de Play Console. Con `PLAY_APP_ID` forma el enlace directo al track interno que lleva la notificación de Slack. Hoy están cargados como secrets; el workflow acepta cualquiera de las dos formas. |
| `PLAY_APP_ID` | Variable o secret | Opcional. Número largo tras `/app/` en la URL de la app en Play Console. |
| `PLAY_INTERNAL_TEST_URL` | Variable | Opcional. Enlace "Únete en la web" de Testing → Internal testing → Testers; botón "Unirse a la prueba interna" en Slack. |

Ver `docs/release-workflow.md` para el flujo completo de versionado y firma, y `README-PIPELINE.md` para la identidad de la app en Google Play (`applicationId`, organización, consola).

## Artifacts

- **CI de lint/test**: no genera artifacts, solo el resultado pasa/falla del job.
- **Build Android**: publica el APK y/o AAB generado como artifact descargable desde la ejecución del workflow en GitHub Actions. Los nombres de artifact y la política de retención se definen en el workflow — ver `.github/workflows/`.

## Notificaciones

Ambos workflows avisan a Slack (éxito/fallo) con `SLACK_WEBHOOK_URL`. El workflow del AAB manda dos mensajes: uno al terminar el build (bundle firmado, enlace al artifact) y otro desde el job `deploy-play` cuando la versión queda publicada en el canal interno de Play, con botones "Ver versión interna en Play Console" (enlace directo al track si están definidas `PLAY_DEVELOPER_ID` y `PLAY_APP_ID`), "Unirse a la prueba interna" (`PLAY_INTERNAL_TEST_URL`) y el run de Actions. Si la subida falla, el mensaje de error recuerda que el AAB firmado sigue en el artifact para subirlo a mano. Detalle en `docs/slack-integration.md`.

## Troubleshooting

### El job de lint/test no se dispara

Los workflows de CI para `mobile/` suelen estar filtrados por `paths: mobile/**` — un cambio que solo toca archivos fuera de `mobile/` (por ejemplo, solo `docs/`) no dispara ese job. Confirmar el filtro exacto en `.github/workflows/`.

### `expo prebuild` falla en CI

Revisar que `mobile/app.json` y los config plugins en `mobile/plugins/` sean válidos (`npx expo config --type public` local reproduce la resolución de configuración). Un fallo de prebuild en CI casi siempre reproduce localmente con `npx expo prebuild --platform android --clean`.

### Gradle falla en `assembleRelease`/`bundleRelease` en CI pero funciona local

Verificar que los cuatro secrets de firma (`ANDROID_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) estén configurados en el repositorio/organización de GitHub y que el keystore decodificado coincida con el usado en local (mismo SHA-256 — ver `README-PIPELINE.md`).

### Gradle falla con `403 Forbidden` al descargar de Maven Central

Maven Central rechaza de forma intermitente a los runners de GitHub (visto el 2026-09-11 con `gson-2.9.1.pom` al resolver `com.facebook.react.settings`), sobre todo con varios builds del mismo repo en paralelo. Ambos workflows envuelven Gradle en `gradle_retry` (3 intentos, esperas de 45 s y 90 s), así que un 403 aislado se recupera solo. Si los tres intentos fallan, relanzar el run; el caché de Gradle del run anterior reduce el número de descargas.

Política de concurrencia por rama: el workflow del APK cancela el run anterior cuando llega un push nuevo (`build-apk-<ref>`, `cancel-in-progress: true`); el del AAB no cancela, porque cada build de producción puede terminar subido a Play, y se serializa (`build-aab-<ref>`).

### La subida a Play falla o no se ejecuta

Confirmar que `PLAY_DEPLOY_ENABLED` está en el estado esperado y que `PLAY_SERVICE_ACCOUNT_JSON` tiene permisos vigentes en Play Console para la app `com.makesens.appuva`.

`ENOENT: no such file or directory, open 'aab/**/mapping.txt'` (visto el 2026-09-11): la acción `r0adkll/upload-google-play` no expande globs en `mappingFile`. El job resuelve las rutas reales del AAB y del `mapping.txt` con `find` en el paso "Locate AAB and mapping.txt" antes de subir; si ese paso falla, el artifact no trae alguno de los dos archivos.

## Ver también

- `docs/release-workflow.md` — versionado, firma y subida a Play en detalle
- `docs/android-build.md` — cómo reproducir el build localmente
- `README-PIPELINE.md` — resumen operativo e identidad de la app en Google Play
- `.github/workflows/` — definición exacta de cada workflow

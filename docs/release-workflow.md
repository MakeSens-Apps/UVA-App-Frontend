# Workflow de releases — UVA App (React Native)

El release se construye con **`expo prebuild` + Gradle en GitHub Actions**. No hay EAS Build ni EAS Submit en este flujo: el AAB/APK se compila nativamente en el runner de Actions y se firma con un keystore inyectado desde secrets.

```
Desarrollo → app.json (version/versionCode) → expo prebuild → Gradle (assembleRelease/bundleRelease) → artifact firmado → (opcional) subida a Play
```

## Versionado

- **`version`** (Version Name, visible al usuario) y **`android.versionCode`** viven en `mobile/app.json`, bajo la clave `expo`. No se generan dinámicamente en CI (a diferencia del pipeline Ionic anterior, que sobrescribía `versionCode` con un timestamp) — se bumpean a mano en el repo antes de cada release.
- **`versionCode` de referencia**: el último publicado en Google Play Console es **178830096**. Cualquier release nuevo debe declarar un `versionCode` **mayor** a ese valor en `app.json` — Play rechaza subidas con `versionCode` igual o menor al último publicado. Al momento de escribir esto, `app.json` ya declara `178830097`; verificar el valor vigente en Play Console antes de cada release (ver enlace de la organización en la sección de identidad de la app, abajo).
- El `applicationId` (`com.makesens.appuva`) y el resto de identidad de la app en Play están documentados en `README-PIPELINE.md`, sección "Identidad de la App en Google Play" — no se repite aquí para evitar que las dos copias diverjan.

## Firma del release

El keystore de producción no se versiona en texto plano en el repo. El flujo en CI:

1. El keystore `.jks` se guarda como secret de GitHub **codificado en base64**: `ANDROID_KEYSTORE_BASE64`.
2. En el job de build, el workflow decodifica ese secret a un archivo `.jks` temporal.
3. Un config plugin de Expo (ver `mobile/plugins/`) inyecta la configuración de firma (`signingConfigs.release` en el `android/app/build.gradle` generado) durante `expo prebuild`, leyendo la ruta del keystore y las credenciales desde variables de entorno.
4. Las credenciales del keystore se leen de tres secrets adicionales:
   - `KEYSTORE_PASSWORD`
   - `KEY_ALIAS`
   - `KEY_PASSWORD`

Estos son los mismos nombres de secret que usaba el pipeline Ionic anterior (mismo keystore, misma identidad de firma — el keystore no está atado al `applicationId`, ver `README-PIPELINE.md`), con la adición de `ANDROID_KEYSTORE_BASE64` como mecanismo de transporte del archivo binario hacia el runner de Actions (antes el `.jks` se versionaba directamente en `android/keys/`, lo cual ya no aplica porque `android/` es generado por `expo prebuild` y no se commitea).

Para reproducir la firma en local, exportar las mismas variables antes de correr `expo prebuild` (ver `docs/android-build.md`).

## Subida a Google Play

La subida a Play está **preparada pero no forzada por defecto**:

- `PLAY_SERVICE_ACCOUNT_JSON` — secret con las credenciales de la cuenta de servicio de Google Play (Play Developer API), usado si el paso de publicación está habilitado.
- `PLAY_DEPLOY_ENABLED` — variable (no secret) que actúa como interruptor: cuando no está activada, el workflow genera y publica el AAB firmado como artifact de GitHub Actions únicamente (descarga manual, igual que el flujo anterior); cuando está activada, el workflow además sube el AAB a Play (pista interna/cerrada/producción según cómo esté configurado el paso, ver el workflow).
- `PLAY_DEVELOPER_ID`, `PLAY_APP_ID`, `PLAY_INTERNAL_TEST_URL` — variables opcionales para que la notificación de Slack del despliegue enlace directo al track interno de Play Console y al enlace de inscripción de testers (ver `docs/github-actions-pipeline.md`).

Ver `.github/workflows/` para la implementación exacta (nombres de jobs y de pasos pueden ajustarse; esta guía describe el proceso y los contratos de secrets/variables, no el YAML literal).

## Cómo cortar un release

1. Actualizar `version` y `android.versionCode` en `mobile/app.json` (versionCode estrictamente mayor al último publicado).
2. Verificar que `npx tsc --noEmit` y `npx jest --ci` están en verde en `mobile/`.
3. Mergear a la rama que dispara el build de release (ver el trigger configurado en el workflow correspondiente).
4. El workflow compila el AAB firmado con Gradle y lo deja disponible como artifact; si `PLAY_DEPLOY_ENABLED` está activo, además lo sube a Play usando `PLAY_SERVICE_ACCOUNT_JSON`.
5. Si la subida es manual, descargar el AAB desde Artifacts y subirlo en Play Console.

## Diferencias clave respecto al pipeline Ionic anterior

| Aspecto | Ionic (antes) | RN (ahora) |
|---|---|---|
| Generación de la carpeta nativa | `android/` versionado en git, sincronizado con `npx cap sync` | `android/` generado por `expo prebuild` (CNG), no versionado |
| Backend / config de entorno | `amplify pull` headless en cada build | `amplifyconfiguration.json` (fuera del repo) + `EXPO_PUBLIC_*` |
| `versionCode` | Sobrescrito en CI vía timestamp (`sed`/`awk` sobre `build.gradle`) | Fijo en `app.json`, bumpeado a mano por release |
| Keystore | Archivo `.jks` versionado en `android/keys/` | Secret `ANDROID_KEYSTORE_BASE64`, decodificado en CI |
| Build tool | Gradle sobre `android/` versionado | Gradle sobre `android/` generado por `expo prebuild` |
| Orquestador de build cloud | Ninguno (todo en Actions) | Ninguno — **sin EAS** |
| Subida a Play | Manual siempre | Manual por defecto; automatizable con `PLAY_SERVICE_ACCOUNT_JSON` + `PLAY_DEPLOY_ENABLED` |

## Ver también

- `docs/android-build.md` — comandos de build local y en CI
- `docs/github-actions-pipeline.md` — pipeline de CI/CD completo (lint/test + build + release)
- `README-PIPELINE.md` — identidad de la app en Google Play y resumen operativo

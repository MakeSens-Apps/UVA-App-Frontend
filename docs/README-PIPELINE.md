# 🚀 Pipeline de GitHub Actions - UVA App (React Native)

Resumen operativo del pipeline de CI/CD para la app RN en la raíz del repo. Para el detalle completo ver `docs/github-actions-pipeline.md` (proceso de CI/CD) y `docs/release-workflow.md` (versionado, firma y release).

## 📦 Qué hace el pipeline

1. **CI de calidad** (bloquea merge): `npm run lint` + `npm run test:ci` (Jest), en cada push/PR.
2. **Build Android** (Gradle, sin EAS): `expo prebuild --platform android` genera `android/` (no versionado), un config plugin de Expo inyecta la firma de release durante el prebuild, y Gradle compila `assembleRelease` (APK) o `bundleRelease` (AAB) según el artefacto pedido.
3. **Publicación**: el APK/AAB firmado se sube como artifact de GitHub Actions. La subida a Google Play es manual por defecto, y automatizable si `PLAY_DEPLOY_ENABLED` está activo (ver más abajo).

Los nombres exactos de jobs y triggers viven en `.github/workflows/` — este documento no los fija porque están en evolución activa.

## 🔐 Secrets y variables necesarias

Configurar en **Settings → Secrets and variables → Actions**:

| Nombre                      | Tipo     | Para qué sirve                                                                                    |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | Secret   | Keystore de firma (`.jks`) codificado en base64.                                                  |
| `KEYSTORE_PASSWORD`         | Secret   | Password del keystore.                                                                            |
| `KEY_ALIAS`                 | Secret   | Alias de la llave de firma.                                                                       |
| `KEY_PASSWORD`              | Secret   | Password de la llave.                                                                             |
| `PLAY_SERVICE_ACCOUNT_JSON` | Secret   | Cuenta de servicio de Google Play (Play Developer API), solo si se habilita la subida automática. |
| `PLAY_DEPLOY_ENABLED`       | Variable | Interruptor de subida automática a Play (`true`/`false` según convención del workflow).           |

Ver `docs/release-workflow.md` para el flujo completo de cómo se usan estos secrets durante `expo prebuild` + Gradle.

## 🔢 Versionado

`version` y `android.versionCode` se declaran en `app.json` (no se generan dinámicamente en CI, a diferencia del pipeline Ionic anterior que sobrescribía el `versionCode` con un timestamp). El último `versionCode` publicado en Google Play es **178830096** — cualquier release nuevo debe declarar un valor estrictamente mayor en `app.json`, o Play rechaza la subida. Ver `docs/release-workflow.md` para el procedimiento de bump antes de cada release.

## 📱 Identidad de la App en Google Play

> ⚠️ La ficha original `com.makesens.uvaapp` fue **cerrada por Google** por falta de
> actualizaciones durante 6 meses. Ese `applicationId` quedó quemado: no se puede
> reutilizar ni existe ruta de actualización para los usuarios instalados.

| Dato                               | Valor                                                                |
| ---------------------------------- | -------------------------------------------------------------------- |
| `applicationId` actual             | `com.makesens.appuva`                                                |
| `applicationId` anterior (quemado) | `com.makesens.uvaapp`                                                |
| ID de organización en Play Console | `4727280100437498477`                                                |
| Consola                            | <https://play.google.com/console/u/0/developers/4727280100437498477> |

### Firma

El keystore (`android/keys/keystore.jks`) **no está atado a un package ni a una
organización**: es solo un par de llaves. El mismo keystore firma la ficha nueva sin
cambios. Alias y contraseñas se inyectan desde secrets del CI vía `signing.properties`
(ver `signingConfigs.release` en `android/app/build.gradle`), nunca desde el repo.

Al ser una ficha nueva, Play fija su llave de firma en la **primera subida**. Verificar
que los secrets del keystore sigan accesibles tras el cambio de organización.

### Dónde vive el package

Cambiar el `applicationId` implica tocar estos archivos en conjunto:

- `android/app/build.gradle` — `namespace` y `applicationId`
- `android/app/src/main/AndroidManifest.xml` — atributo `package`
- `android/app/src/main/res/values/strings.xml` — `package_name` y `custom_url_scheme`
- `android/app/src/main/java/com/makesens/appuva/MainActivity.java` — declaración `package` (y la ruta del archivo)

> La subida a Play es **manual**: el pipeline solo genera el AAB firmado y lo publica
> como artifact de GitHub Actions. No hay integración con la Play Developer API.

> **Nota RN (post-migración)**: en el proyecto React Native, `android/` es generado por
> `expo prebuild` y no se versiona; el keystore se distribuye a CI como secret
> `ANDROID_KEYSTORE_BASE64` en lugar de un archivo en `android/keys/`, y la firma se
> inyecta vía config plugin de Expo en vez de `signing.properties` a mano. La subida a
> Play sigue siendo manual por defecto, pero ahora está preparada para automatizarse con
> `PLAY_SERVICE_ACCOUNT_JSON` + `PLAY_DEPLOY_ENABLED`. Ver `docs/release-workflow.md`
> para el flujo vigente; esta sección se conserva tal cual documenta la decisión
> original de identidad de la app en Play.

> **Keystore fuera del repo (2026-09-11)**: el keystore ya no vive en el historial de
> git — se purgó con `docs/migration/scripts/purge-keystore.sh` como parte del cutover. La única fuente
> vigente es el secret de CI `ANDROID_KEYSTORE_BASE64`.

---

## 🚀 Comandos rápidos

### Build local (reproduce el pipeline)

```bash
npm ci
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease   # APK
./gradlew bundleRelease     # AAB
```

Ver `docs/android-build.md` para el detalle y troubleshooting.

### Ver estado de workflows

```bash
gh run list --limit=5
```

### Descargar artifacts

```bash
gh run download [RUN_ID] --dir ./artifacts
```

## 📬 Integración con Slack

Si el pipeline conserva notificaciones a Slack (build exitoso/fallido), la configuración del webhook está en `docs/slack-integration.md`. Confirmar en el workflow vigente si ese paso sigue presente tras la migración a Gradle.

## 📚 Documentación adicional

- **Pipeline de CI/CD completo**: [`docs/github-actions-pipeline.md`](docs/github-actions-pipeline.md)
- **Workflow de release (versionado, firma, Play)**: [`docs/release-workflow.md`](docs/release-workflow.md)
- **Build Android local**: [`docs/android-build.md`](docs/android-build.md)
- **Documentación del proyecto**: [`README.md`](README.md)

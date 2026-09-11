# Compilación Android — React Native (Expo prebuild + Gradle)

La app RN no usa EAS Build. El binario Android se genera con **`expo prebuild`** (Continuous Native Generation, CNG) y se compila con **Gradle** directamente, tanto en local como en GitHub Actions. `android/` es un directorio **generado**: no se versiona a mano y se regenera en cada build limpio.

## Requisitos

- Node.js 20+ y npm
- Java 17 (Temurin recomendado)
- Android SDK (vía Android Studio, o `sdkmanager` en CI)
- El keystore de firma de release (fuera del repo — ver `docs/release-workflow.md`)

## Compilación rápida (local)

```bash
npm install

# Genera android/ desde app.json + plugins/*.js
npx expo prebuild --platform android --clean

cd android
chmod +x gradlew

# APK debug (sin firma de release, útil para probar en un dispositivo/emulador)
./gradlew assembleDebug

# APK release (firmado — requiere el keystore configurado, ver más abajo)
./gradlew assembleRelease

# AAB release para Google Play (firmado)
./gradlew bundleRelease
```

## Firma de release

La firma **no vive en `android/app/build.gradle` a mano**: se inyecta durante `expo prebuild` mediante un config plugin de Expo que escribe la configuración de `signingConfigs.release` a partir de un keystore y credenciales provistas por variables de entorno/secrets (ver `docs/release-workflow.md` para el detalle de qué variables espera y de dónde salen en CI). En local, exportar esas mismas variables antes de correr `expo prebuild` reproduce la misma firma que usa CI.

> Ver el plugin correspondiente en `plugins/` para el mecanismo exacto de inyección — es responsabilidad de otro frente de trabajo de esta migración y puede evolucionar; esta guía describe el proceso a nivel operativo.

## ABIs nativas y compatibilidad de dispositivos en Google Play

El AAB de producción y el APK universal de preview no llevan las mismas ABIs nativas:

- **AAB** (`bundleRelease`, workflow `build-android-bundle.yml`): 4 ABIs — `armeabi-v7a,arm64-v8a,x86,x86_64` — vía `EXPO_ANDROID_ARCHITECTURES` en el paso de `expo prebuild` de ese workflow. Google Play sirve _splits_ por ABI desde el AAB, así que esto no cambia el tamaño de descarga por dispositivo, solo el tamaño del propio AAB subido.
- **APK universal** (`assembleRelease`, workflow `build-android.yml`, usado para QA/preview): 2 ABIs — `armeabi-v7a,arm64-v8a` — el default de `plugins/withReleaseArchitectures.js`. Un APK universal sí empaqueta todas las ABIs en un solo archivo, así que se mantiene acotado a las que corren en un dispositivo real.

Relacionado, `plugins/withAndroidOptionalFeatures.js` marca `android.hardware.wifi` y `android.hardware.touchscreen` como `android:required="false"` en el `AndroidManifest.xml` generado. Google Play usa los `<uses-feature>` del manifest para filtrar qué dispositivos pueden ver/instalar la app; `android.hardware.wifi` queda implícito como requerido en cuanto una dependencia nativa (`@react-native-community/netinfo`) agrega el permiso `ACCESS_WIFI_STATE`, y `android.hardware.touchscreen` lo asume requerido Play por defecto salvo que se declare lo contrario. Ninguna de las dos es una dependencia real de la app (la app Ionic anterior llegaba a esos mismos dispositivos sin declararlas), así que declararlas como opcionales restaura compatibilidad sin tocar código de runtime.

## Dónde quedan los artefactos generados

- **APK debug**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **APK release**: `android/app/build/outputs/apk/release/app-release.apk`
- **AAB release** (Google Play): `android/app/build/outputs/bundle/release/app-release.aab`

## En GitHub Actions

El pipeline reproduce los mismos pasos: `npm ci` → `expo prebuild --platform android` (con las variables de firma tomadas de GitHub Secrets) → `./gradlew assembleRelease` o `./gradlew bundleRelease` según el workflow. Ver `.github/workflows/` para la definición exacta de cada job (nombres y triggers pueden cambiar; esta guía no los fija) y `docs/github-actions-pipeline.md` / `docs/release-workflow.md` para el detalle de secrets y versión.

## Solución de problemas comunes

### `expo prebuild` falla o genera un `android/` inconsistente

Correr con `--clean` para borrar cualquier `android/` previo antes de regenerar:

```bash
npx expo prebuild --platform android --clean
```

### `JAVA_HOME` inválido / Gradle no encuentra el JDK

Verificar que `JAVA_HOME` apunte a un JDK 17 (`java -version` debe reportar 17.x). En macOS con Homebrew: `brew install openjdk@17` y exportar `JAVA_HOME="$(/usr/libexec/java_home -v17)"`.

### El release no está firmado / Gradle falla en `assembleRelease`/`bundleRelease`

Confirmar que las variables de entorno de firma están exportadas **antes** de `expo prebuild` (el plugin las lee en tiempo de generación, no en tiempo de compilación de Gradle). Ver `docs/release-workflow.md`.

### `versionCode` rechazado por Google Play

`app.json` (`expo.android.versionCode`) debe ser mayor que el último `versionCode` publicado en Play Console. Ver `docs/release-workflow.md` para el valor de referencia actual.

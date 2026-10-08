# AGENTS.md: guía para personas y agentes

Convenciones comunes (idioma, commits, PRs, issues y control de integración): skill `racimo-harness:convenciones` y [GUIA.md del harness](https://github.com/MakeSens-Apps/racimo-harness/blob/main/GUIA.md). Este archivo agrega lo propio de este repositorio. El contexto técnico (estructura, servicios y convenciones de código) está en [.claude/CLAUDE.md](.claude/CLAUDE.md).

## Qué es este repositorio

App móvil **UVA** para Android: Ionic 8 + Angular 18 (componentes standalone) + Capacitor 6, con backend AWS Amplify Gen 1 (Cognito por teléfono, AppSync y DataStore). En `develop` la app es Ionic/Angular; la rama `feature/ionic-to-react-native` es una migración que no está integrada.

## Ramas, builds y publicación

| Rama o evento | Qué corre en GitHub Actions |
|---|---|
| push a `feature/**`, `fix/**`, `hotfix/**` y PR hacia `develop` o `main` | `build-android.yml`: APK de debug contra el entorno Amplify `develop` y aviso en Slack |
| push a `develop` | Igual (APK de debug) |
| push a `test` o `main` | APK de debug y APK de release |
| tags `v*.*.*`, releases, push a `main` o manual | `build-android-bundle.yml`: AAB **firmado de producción** |

Reglas para personas y agentes:

- **Nadie publica la app ni ejecuta builds de release o firmados.** Ni `gh workflow run`, ni `npm run android:prod*` / `android:bundle`, ni `./gradlew assembleRelease` / `bundleRelease` / `publish*`, ni `eas build` / `eas submit` / `fastlane` (este repo no usa EAS; el guard bloquea `eas` igual), ni `amplify push` / `npm run amplify-push`. Tampoco se crean tags ni releases.
- **Cada push a `feature/**` compila un APK en Actions** (consume minutos y avisa en Slack). Abrir o actualizar un PR dispara otra corrida (`pull_request`). Hoy el build está roto por causa ajena ([#65](https://github.com/MakeSens-Apps/UVA-App-Frontend/issues/65): `setup-android@v3` no encuentra el paquete `tools`): se declara y no se trata como regresión del ticket. Agrupa los pushes: haz todos los commits en local y publica **una o dos veces por PR**. No hagas pushes de prueba ni dispares builds para obtener un APK: el APK de la evidencia se compila en local.
- Los PRs van a `develop`. Los agentes nunca integran (GUIA §6).

## Comandos verificados en local

Verificados el 2026-10-07 en `develop` (c7de93e) con macOS, Node 24.21, npm 11.19, JDK 17 (Homebrew `openjdk@17`) y Gradle 8.14 del sistema. La CI usa Node 20.

| Paso | Comando | Resultado en `develop` |
|---|---|---|
| Instalar | `npm ci` | OK (unos 15 s). No cambies el lockfile sin motivo |
| Configuración local | `src/amplifyconfiguration.json` (ignorado por git) | **Obligatorio para compilar** (`src/main.ts` lo importa). Ver "Configuración sintética" abajo |
| Lint | `npm run lint` | **En rojo conocido en develop** ([#66](https://github.com/MakeSens-Apps/UVA-App-Frontend/issues/66)): 15 errores y 10 avisos preexistentes en 10 archivos. No es una regresión del ticket; solo no agregues errores nuevos (`npx eslint <archivos tocados>`) |
| Pruebas | `npm run test:ci` | **En rojo conocido en develop** ([#66](https://github.com/MakeSens-Apps/UVA-App-Frontend/issues/66)): `karma.conf.js` no registra el navegador `ChromeHeadlessCI` |
| Pruebas (alternativa que corre) | `npx ng test --no-watch --browsers=ChromeHeadlessLinux` | Corre 6 pruebas; 5 fallan en develop (#66) |
| Build web | `npm run build` | OK (unos 20 s) con la configuración local |
| Servidor web | `npm start -- --port $PORT` | OK (`ng serve`); solo para revisar en el navegador |
| APK de debug | `npx cap sync android` y luego `JAVA_HOME=<JDK 17> gradle -p android assembleDebug` o `cd android && ./gradlew assembleDebug` | OK (1 a 2 min). Sale en `android/app/build/outputs/apk/debug/app-debug.apk` (27 MB) |

Las dos formas pasan el guard desde racimo-harness v1.0.1; las tareas de release (`assembleRelease`, `bundleRelease`, `publish*` y sus abreviaturas) quedan bloqueadas. `gradle -p android` usa el Gradle del sistema (`brew install gradle`). Para `./gradlew`, el repo no versiona `android/gradle/wrapper/gradle-wrapper.jar` (lo ignora la regla `*.jar`): la primera vez, en `android/`, `gradle wrapper --gradle-version 8.2.1` (la CI hace lo mismo con 8.5). No cambia archivos versionados.

### Configuración sintética

Para compilar sin tocar el backend real, crea `src/amplifyconfiguration.json` con valores de ejemplo. No copies el archivo real de otro clon ni ejecutes `amplify pull`:

```json
{
  "aws_project_region": "us-east-1",
  "aws_cognito_region": "us-east-1",
  "aws_user_pools_id": "us-east-1_EXAMPLE00",
  "aws_user_pools_web_client_id": "exampleclientid000000000000",
  "aws_appsync_graphqlEndpoint": "https://example.invalid/graphql",
  "aws_appsync_region": "us-east-1",
  "aws_appsync_authenticationType": "AMAZON_COGNITO_USER_POOLS",
  "aws_mobile_analytics_app_id": "00000000000000000000000000000000",
  "aws_mobile_analytics_app_region": "us-east-1"
}
```

Sin `aws_mobile_analytics_app_id`, Amplify Analytics lanza `NoAppId` al arrancar. Con esta configuración la app arranca, no encuentra sesión y muestra la pantalla de inicio de sesión ("Hola de nuevo"), que es la pantalla base para la evidencia sin datos.

## Evidencia en el emulador

Requisitos: Android SDK con `adb`, `emulator` y `aapt2`, un AVD, JDK 17 y `ffmpeg`. Pasos con `android.sh` del plugin (GUIA §3):

1. Compila el APK de debug en local (tabla de arriba). Nunca dispares un build de Actions para obtenerlo.
2. `android.sh start <n> [avd]`: arranca siempre con `-read-only -no-snapshot` (el AVD no se modifica) y GPU por software (`--gpu host` solo si hace falta).
3. `android.sh install <n> <apk>` y `android.sh launch <n>` (usa `am start`). `install` rechaza builds de release y un paquete que el AVD ya tenía, porque puede ser la app real con una sesión.
4. `android.sh shot <n> <vista> light|dark` y `android.sh record <n> <vista> <s>` en segundo plano mientras manejas la app con `android.sh input`.
5. `android.sh stop <n>` al terminar.

Lo que se aprendió en la prueba en seco (F0-12d, #63):

- Con GPU del host, en un AVD Android 16 (`Medium_Phone_API_36.0`), `screencap` y el WebView salen en blanco. Por eso `android.sh` usa GPU por software por defecto.
- Los AVD de esta máquina tienen instalada la app real (firma de producción). Nunca la abras; lo ideal es un AVD dedicado a agentes, sin la app real (lo crea una persona en Android Studio).
- La pantalla de inicio de sesión usa colores propios: en oscuro se ve igual que en claro.
- Nunca escribas teléfonos ni códigos reales: si un flujo requiere sesión, usa datos sintéticos y decláralo.

## Seguridad

- No leas ni cites `.env*`, keystores (`*.jks`, `*.keystore`), `android/app/signing.properties` ni `amplify/team-provider-info.json`.
- No uses credenciales de AWS para compilar ni para capturas: la configuración sintética basta.
- Datos de personas, UVAs y RACIMOS: siempre sintéticos en pruebas, capturas y ejemplos.

<!-- racimo-harness:perfil:inicio (lo escribe sync-repo-layer.sh del repo racimo-harness; no lo edites a mano) -->
## Perfil del harness

Claves fijas que lee el harness de Claude (`/racimo-harness:ticket`, `doctor`). Flujo completo: [GUIA.md del harness](https://github.com/MakeSens-Apps/racimo-harness/blob/main/GUIA.md).

| Clave | Valor |
|---|---|
| Rama base | `develop` |
| Cuenta de gh | `jlsaco` |
| Instalar | `npm ci` (y `src/amplifyconfiguration.json` sintético, ver "Configuración sintética") |
| Verificar (en orden) | `npm run build`; APK de debug: `npx cap sync android` y `gradle -p android assembleDebug` (o `cd android && ./gradlew assembleDebug`). Verificación conocida en rojo, ver #66: `npm run lint` y `npm run test:ci` fallan en `develop` antes de cualquier ticket; no es una regresión del ticket, solo no agregues errores nuevos (`npx eslint <archivos tocados>`) |
| Check de CI | `📱 Build APK` (`build-android.yml`, en cada push a `feature/**`: agrupa los pushes). Roto por causa ajena hasta #65: se declara, no se trata como regresión |
| Tipo de evidencia | móvil (emulador Android con `android.sh`: claro y oscuro, GIF con screenrecord) |
| Servidor local | `npm start -- --port $PORT` (solo para revisar en el navegador; la evidencia es del emulador) |
| Despliegues prohibidos | builds de release y firmados (`./gradlew assembleRelease`/`bundleRelease`/`publish*`, cualquier tarea de firma o subida), `npm run android:prod*`, `npm run android:bundle`, `npm run amplify-push`, `amplify push`, `gh workflow run` (build-android-bundle firma producción), tags y releases |
<!-- racimo-harness:perfil:fin -->

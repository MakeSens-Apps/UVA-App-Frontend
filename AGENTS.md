# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# AGENTS.md: guía para personas y agentes

Convenciones comunes (idioma, commits, PRs, issues y control de integración): skill `racimo-harness:convenciones` y [GUIA.md del harness](https://github.com/MakeSens-Apps/racimo-harness/blob/main/GUIA.md). Este archivo agrega lo propio de este repositorio y prevalece si hay diferencias. El contexto técnico (estructura, servicios y convenciones de código) está en [.claude/CLAUDE.md](.claude/CLAUDE.md) y el de negocio (RACIMO, UVA, mediciones y gamificación) en [CLAUDE.md](CLAUDE.md).

## Qué es este repositorio

App móvil **UVA** para Android: **React Native 0.85 + Expo SDK 56** (Dev Client, sin EAS), TypeScript estricto y React Navigation, con backend AWS Amplify Gen 1 (Cognito por teléfono, AppSync y DataStore offline-first). La app vive en la raíz del repo.

- La migración desde Ionic/Angular se hizo en `feature/ionic-to-react-native` (PR [#58](https://github.com/MakeSens-Apps/UVA-App-Frontend/pull/58)) y se cerró con [#67](https://github.com/MakeSens-Apps/UVA-App-Frontend/issues/67). El código Ionic ya no está en el árbol: queda en el tag `pre-cutover-2026-09-11` y en los tags `V2.x` (producción V2.2.5 a V2.2.11). No se construye sobre él.
- Estado, hallazgos y pendientes de la migración: `docs/migration/verification.md` (documento vivo) y `docs/migration/plan.md`.
- La app escribe en el backend UVA (mediciones, UVAs, usuarios y la telemetría `AppUsageEvent` que lee el dashboard RACIMO). Cambiar un modelo de DataStore o el `screenName` de la telemetría afecta datos de personas reales: decláralo en el PR.

## Ramas, builds y publicación

| Evento | Qué corre en GitHub Actions |
|---|---|
| push a cualquier rama | `mobile-ci.yml`, check **`Typecheck + Lint + Jest (Node 22)`**: `npm ci`, `typecheck`, `lint` y `test:ci` |
| push a `feature/**`, `fix/**`, `hotfix/**` o `develop` | `build-android.yml`, check **`📱 Build APK`**: `amplify pull` del entorno `develop`, `expo prebuild` y `assembleDebug` (APK de debug), con aviso en Slack. **Ignora los pushes que solo cambian `docs/**` o archivos `*.md`** |
| push a `test` o `main` | Igual, con el entorno `test` o `main`, y además el APK de release |
| push de un tag `V*.*.*` / `v*.*.*`, o a mano (`workflow_dispatch`) | `build-android-bundle.yml`: AAB **firmado de producción** y, si la variable `PLAY_DEPLOY_ENABLED` está activa, subida a Google Play |

Ningún workflow escucha `pull_request`: los checks del PR son las corridas por push sobre el SHA de la cabeza. Por eso integrar a `develop` solo compila el APK de debug y avisa a Slack; nada se publica en Play.

Reglas para personas y agentes:

- **Nadie publica la app ni ejecuta builds de release o firmados.** Ni `gh workflow run`, ni `npm run build:android:*` (por dentro llama a `assembleRelease` / `bundleRelease`), ni `./gradlew assembleRelease` / `bundleRelease` / `publish*`, ni `eas build` / `eas submit` (este repo no usa EAS), ni `amplify push`. Tampoco se crean tags ni releases: un tag `V*.*.*` dispara el AAB de producción.
- **Nunca `npm run android` ni `npx expo run:android`**: compilan e **instalan en el dispositivo conectado** y aceptan `--variant release`. El APK de debug se compila con Gradle (tabla de comandos) y se instala con `android.sh`.
- **Cada push a `feature/**` corre los dos workflows** (el APK tarda unos 18 min, consume minutos y avisa en Slack). Agrupa los pushes: todos los commits en local y **uno o dos pushes por PR**. El **último push del PR debe tocar código** (no solo `docs/` o `*.md`); si no, `📱 Build APK` no corre sobre la cabeza y el PR queda sin ese check. Nunca hagas pushes de prueba para obtener un APK: se compila en local.
- Los PRs van a `develop` con squash merge. Excepción decidida en #67: #58 (y el PR de #67 hacia `feature/ionic-to-react-native`) se integran con **merge commit**, para conservar la historia de la migración y los tags de producción como antecesores de `develop`. Los agentes nunca integran (GUIA §6).

## Comandos verificados en local

Verificados el 2026-10-08 en `feature/67-close-react-native-migration` (React Native, con `develop` integrado) en macOS, con Node 22.16 (la versión de la CI es 22), npm 10.9, JDK 17 (Homebrew `openjdk@17`, `JAVA_HOME=/opt/homebrew/opt/openjdk@17`) y el Android SDK en `~/Library/Android/sdk` (`ANDROID_HOME`).

| Paso | Comando | Resultado |
|---|---|---|
| Instalar | `npm ci` | OK. No cambies el lockfile sin motivo; si hace falta, `npm install` y revisa el diff |
| Configuración local | `amplifyconfiguration.json` en la **raíz** (ignorado por git) | Obligatorio para Metro, `expo prebuild` y el APK: `src/data/amplify-bootstrap/amplify-config.ts` hace `require('../../../amplifyconfiguration.json')`. Jest no lo necesita (usa `src/__tests__/__mocks__/amplify-config-mock.json`). Ver "Configuración sintética" |
| Tipos | `npm run typecheck` | OK, 0 errores |
| Lint | `npm run lint` | OK, 0 errores (hay avisos heredados; no agregues errores). `.claude/` está excluido: es la capa del harness, no código de la app |
| Pruebas | `npm run test:ci` | OK: 61 suites, 1120 pruebas, con cobertura. `npm test` corre lo mismo sin cobertura |
| Generar `android/` | `npx expo prebuild --no-install --platform android` | OK. `android/` no se versiona y se regenera entero (`--clean` lo borra antes). Lo nativo se cambia con un config plugin en `plugins/`, nunca a mano en `android/` |
| APK de debug | `cd android && ./gradlew assembleDebug` | OK. Sale en `android/app/build/outputs/apk/debug/app-debug.apk`. El wrapper lo genera `expo prebuild`. El guard deja pasar `assembleDebug` y bloquea las tareas de release y firma |
| Servidor de JS (Metro) | `npx expo start --port 8081` | OK. El APK de debug carga el JS desde Metro, y **en el emulador lo pide a `10.0.2.2:8081`** (el puerto 8081 de la máquina): `adb reverse` hacia otro puerto no alcanza, así que Metro debe escuchar en 8081 (comprueba antes que esté libre). En un teléfono por USB, `adb -s <serial> reverse tcp:8081 tcp:8081` |

### Configuración sintética

Para compilar sin tocar el backend real, crea `amplifyconfiguration.json` en la raíz con valores de ejemplo. No copies el archivo real de otro clon ni ejecutes `amplify pull` (la única excepción es "Probar contra develop", más abajo):

```json
{
  "aws_project_region": "us-east-1",
  "aws_cognito_region": "us-east-1",
  "aws_user_pools_id": "us-east-1_EXAMPLE00",
  "aws_user_pools_web_client_id": "exampleclientid000000000000",
  "aws_appsync_graphqlEndpoint": "https://example.invalid/graphql",
  "aws_appsync_region": "us-east-1",
  "aws_appsync_authenticationType": "AMAZON_COGNITO_USER_POOLS",
  "aws_user_files_s3_bucket": "example-bucket-invalid",
  "aws_user_files_s3_bucket_region": "us-east-1"
}
```

Con esta configuración la app arranca, no encuentra sesión y muestra la pantalla de inicio de sesión, que es la pantalla base para la evidencia sin datos.

## Evidencia en el emulador

Requisitos: Android SDK con `adb`, `emulator` y `aapt2`, un AVD, JDK 17 y `ffmpeg`. Pasos con `android.sh` del plugin (GUIA §3):

1. Compila el APK de debug en local (tabla de arriba) y levanta Metro con `serve.sh` en el puerto 8081 (`npx expo start --port 8081`, ver la tabla). Nunca dispares un build de Actions para obtenerlo.
2. `android.sh start <n> [avd]`: arranca siempre con `-read-only -no-snapshot` (el AVD no se modifica) y GPU por software. Con GPU por software, la app React Native sale en negro en el AVD Android 15 (`UVA_API35`, verificado el 2026-10-08): ahí usa `--gpu host`.
3. `android.sh install <n> <apk>` y `android.sh launch <n>`. `install` rechaza builds de release y un paquete que el AVD ya tenía.
4. `android.sh shot <n> <vista> light|dark` y `android.sh record <n> <vista> <s>` en segundo plano mientras manejas la app con `android.sh input`.
5. `android.sh stop <n>` al terminar.

Cuidados:

- **El paquete del APK de debug es el mismo que el de producción (`com.makesens.appuva`).** Instalarlo en un AVD o teléfono que tenga la app real la reemplaza y puede borrar su sesión y sus mediciones sin sincronizar. Usa solo un AVD sin la app real (lo crea una persona en Android Studio); si `install` se niega, pide uno en el issue. Nunca abras, desinstales ni limpies la app que ya estaba.
- Nunca escribas teléfonos ni códigos reales: si un flujo requiere sesión, usa datos sintéticos y decláralo. La única excepción son las cuentas de prueba `+5730000000NN` de `src/data/auth/test-users.ts`, y solo contra develop con el procedimiento "Probar contra develop". Lo que exige SIM (OTP real) o un RACIMO real lo prueba una persona.

## Probar contra develop

**Cuándo.** Solo cuando un ticket necesita comprobar de punta a punta, con datos de develop, lo que ve el campesino: iniciar sesión, la vinculación a un RACIMO o los cambios que hace el dashboard RACIMO (por ejemplo, corregir o deshabilitar una UVA). Para todo lo demás, incluida la evidencia de pantallas sin datos, sigue valiendo la "Configuración sintética". El procedimiento es **solo para develop**: nunca `test`, `main` ni producción.

**Requisitos.**

- **Autorización permanente** (product owner, 2026-10-13, #77): cualquier agente puede ejecutar el `amplify pull` de **develop** de este procedimiento, solo en local. El archivo que genera no se versiona, no se abre ni se cita, y se borra al terminar. Nunca se hace pull de `test`, `main` ni producción.
- Credenciales de AWS de la cuenta MakeSens en `us-east-1`, con el perfil que indique la persona responsable. Solo se usan para leer: `amplify pull` y listados.
- Un AVD sin la app real (ver "Evidencia en el emulador") y lo de la tabla de comandos.
- La cuenta de agentes **`+573000000010`** ("Agente Prueba"). Existe solo en el pool de develop, está en la lista de prueba de la app (`src/data/auth/test-users.ts`) y entra sin código SMS. No uses la cuenta de revisión de Play (`+573000000002`): en develop ya tiene una UVA en otro RACIMO. Si la cuenta de agentes no entra, comenta en el issue y detente: un agente no crea cuentas ni por la app ni por comandos de administración.
- Para vincular la cuenta: el código del RACIMO de prueba del dashboard ("Prueba dashboard"). Lo da el orquestador; no se escribe en el repo, ni en PRs, issues o evidencias. Nunca se vincula a un RACIMO real.

**Pasos.** `<n>` es el número del ticket, `<raíz>` la ruta absoluta de tu worktree y `<tmp>` la ruta absoluta de una carpeta nueva y vacía fuera del repo (por ejemplo, en tu scratchpad). Escribe las rutas completas en cada comando: en un agente, el directorio y las variables del shell no se conservan entre llamadas.

1. **Configuración de develop**, en `<tmp>`. Así el pull no toca los archivos versionados de `amplify/`:

   ```bash
   mkdir -p <tmp> && (cd <tmp> && AWS_REGION=us-east-1 AMPLIFY_CLI_DISABLE_BROWSER_AUTH=true npx -y @aws-amplify/cli@12.14.4 pull \
     --amplify '{"projectName":"UVA","appId":"d2l8hh51bqhq16","envName":"develop"}' \
     --providers '{"awscloudformation":{"configLevel":"project","useProfile":true,"profileName":"<perfil>"}}' \
     --frontend '{"frontend":"javascript","framework":"react-native","config":{"SourceDir":"src","DistributionDir":"/","BuildCommand":"npm run-script build","StartCommand":"npm run-script start"}}' \
     --yes)
   ```

   El `cd` va entre paréntesis para que el shell no quede dentro de `<tmp>`, que el paso 3 borra. `appId` y `projectName` son los de `.github/workflows/build-android.yml`. Deja el archivo en `<tmp>/src/amplifyconfiguration.json`. Nunca lo abras, imprimas ni cites.

2. **Comprueba que es develop sin imprimir valores.** Estos comandos solo muestran el nombre del recurso al que apunta el archivo:

   ```bash
   node -p "require('<tmp>/amplify/.config/local-env-info.json').envName"   # develop
   aws appsync list-graphql-apis --profile <perfil> --region us-east-1 --output json \
     | node -e 'const c=require(process.argv[1]);const l=JSON.parse(require("fs").readFileSync(0,"utf8")).graphqlApis;const a=l.find(x=>x.uris.GRAPHQL===c.aws_appsync_graphqlEndpoint);console.log(a?a.name:"no-encontrada")' <tmp>/src/amplifyconfiguration.json   # UVAv2-develop
   aws cognito-idp list-user-pools --max-results 60 --profile <perfil> --region us-east-1 --output json \
     | node -e 'const c=require(process.argv[1]);const l=JSON.parse(require("fs").readFileSync(0,"utf8")).UserPools;const p=l.find(x=>x.Id===c.aws_user_pools_id);console.log(p?p.Name:"no-encontrado")' <tmp>/src/amplifyconfiguration.json   # termina en -develop
   ```

   Si alguno no dice develop, borra `<tmp>`, no sigas y comenta en el issue.

3. **Copia el archivo a la raíz y borra la carpeta temporal:** `cp <tmp>/src/amplifyconfiguration.json <raíz>/ && rm -rf <tmp>`. Comprueba que git lo ignora: `git -C <raíz> check-ignore amplifyconfiguration.json`. Nunca lo agregues a un commit.

4. **APK, Metro y emulador**, con los pasos de "Evidencia en el emulador". Levanta Metro **después** de copiar el archivo: Metro lo empaqueta en el JS. Si Metro ya corría con la configuración sintética, reinícialo con `--clear`. El APK de debug pide el JS a Metro, así que no hace falta recompilarlo al cambiar de configuración.

5. **Inicia sesión** con `android.sh input`. Para encontrar cada control, `adb -s <serial> exec-out uiautomator dump /dev/tty` lista los `testID` de React Native como `resource-id`, con sus `bounds`. El `<serial>` está en `.claude/evidence/<n>/android-serial`.
   - Toca `phone-input`, escribe el número sin `+57` (`android.sh input <n> text 3000000010`), cierra el teclado (`android.sh input <n> keyevent KEYCODE_BACK`) y toca `submit-button`. `android.sh input` no acepta espacios: en `text`, cada espacio se escribe `%s`.
   - En el diálogo de confirmación, toca "Sí, Continuar". No aparece la pantalla del código SMS.
   - Si la cuenta ya tiene UVA, la app pasa por "Vinculando al proyecto" y llega a Inicio. Si no tiene, pide el código del RACIMO: escribe el de "Prueba dashboard" en `code-input` y toca `submit-button`. La app muestra "¡Vinculación exitosa! Vinculado al proyecto: Prueba dashboard" y luego pide los datos de ubicación de la UVA: complétalos con valores sintéticos (`android.sh input <n> text Finca%sde%sprueba`, y lo mismo con `Vereda%sde%sprueba` y `Municipio%sde%sprueba`), cerrando el teclado entre campos porque tapa el siguiente.
   - Después de vincularla por primera vez, la app llega a Inicio, pero "Perfil > Información personal" sale vacío hasta que la app se reinicia: cierra tu build (`adb -s <serial> shell am force-stop com.makesens.appuva`, sin borrar datos) y ábrela con `android.sh launch <n>`. La sesión se conserva y la app entra directo a Inicio. Ahí "Información personal" muestra la UVA (finca, vereda y municipio).
   - Si la primera vez aparece "System UI isn't responding", toca "Wait". Los avisos de desarrollo de la parte de abajo se cierran con su X.

6. **Comprueba el RACIMO sin imprimir valores.** La app guarda el código del RACIMO vinculado en su almacenamiento local, que también tiene la sesión. Con el build de debug se compara así, en una carpeta `<tmp2>` nueva fuera del repo y de `.claude/evidence/` (la evidencia se publica), que se borra en el mismo comando. Se copian también los archivos `-wal` y `-shm`, porque las escrituras recientes pueden estar solo ahí. El código va en mayúsculas, como lo guarda la app:

   ```bash
   mkdir -p <tmp2> \
     && for f in RKStorage RKStorage-wal RKStorage-shm; do adb -s <serial> exec-out run-as com.makesens.appuva cat databases/$f > <tmp2>/$f 2>/dev/null; done \
     && sqlite3 <tmp2>/RKStorage "select count(*) from catalystLocalStorage where key = 'session_racimoLinkCode' and value = '<CÓDIGO>';"; rm -rf <tmp2>
   ```

   Debe imprimir `1`. Cualquier otra salida (0, vacío o un error) quiere decir que no se pudo comprobar o que la cuenta está en otro RACIMO: no sigas, comenta en el issue y detente.

7. **Al terminar**, `android.sh stop <n>` (el AVD arranca en solo lectura, así que la sesión y los datos locales se descartan) y `serve.sh stop <n>`. **Borra `amplifyconfiguration.json` de la raíz** y vuelve a la configuración sintética. Metro guarda en su caché una copia transformada del archivo: levántalo una vez con la configuración sintética y `--clear` (`serve.sh start <n> metro 8081 -- npx expo start --port 8081 --clear`) y apágalo. La vinculación de la cuenta queda guardada en develop: la próxima vez la app pasa directo a Inicio.

**Cuidados.**

- La configuración real, el código del RACIMO y los datos de develop no salen en commits, PRs, issues, comentarios, evidencias ni logs. Las capturas se toman solo del RACIMO de prueba, y el número de la cuenta se difumina si aparece en pantalla.
- Develop es compartido: no registres mediciones ni cambies datos más allá de lo que el ticket pide comprobar.
- La cuenta de agentes, su UVA y "Prueba dashboard" los comparten todos los agentes. Si el ticket los cambia (por ejemplo, deshabilita o corrige la UVA o el RACIMO), al terminar déjalos como estaban (habilitados y con datos sintéticos) y decláralo en la evidencia. Dos tickets no usan la cuenta al mismo tiempo: el orquestador los ordena.
- Las cuentas de prueba saltan la restricción de horario de las tareas en "Registros", así que esa parte no se ve igual que la ve un campesino. Si el ticket depende de ella, la comprueba una persona.

## Seguridad

- **El repositorio es público.** Todo lo que se versiona, y todo PR, issue o comentario, lo puede leer cualquiera: solo datos sintéticos y ningún detalle explotable.
- No leas ni cites `.env*`, keystores (`*.jks`, `*.keystore`), `signing.properties`, `amplify/team-provider-info.json` ni un `amplifyconfiguration.json` real. Las credenciales de firma viven solo en los secrets de GitHub Actions. El keystore se purgó de la historia en el cutover: no lo reintroduzcas ni reescribas la historia compartida (`feature/ionic-to-react-native` se integra con merge, sin rebase).
- No uses credenciales de AWS para compilar ni para capturas: la configuración sintética basta. La única excepción es "Probar contra develop": solo lectura (`amplify pull` y listados), solo develop.
- Datos de personas, UVAs y RACIMOS: siempre sintéticos en pruebas, capturas y ejemplos (IDs `00000000-0000-4000-8000-…`).

<!-- racimo-harness:perfil:inicio (lo escribe sync-repo-layer.sh del repo racimo-harness; no lo edites a mano) -->
## Perfil del harness

Claves fijas que lee el harness de Claude (`/racimo-harness:ticket`, `doctor`). Flujo completo: [GUIA.md del harness](https://github.com/MakeSens-Apps/racimo-harness/blob/main/GUIA.md).

| Clave | Valor |
|---|---|
| Rama base | `develop` |
| Cuenta de gh | `jlsaco` |
| Instalar | `npm ci` (y `amplifyconfiguration.json` sintético en la raíz, ver "Configuración sintética") |
| Verificar (en orden) | `npm run typecheck`, `npm run lint`, `npm run test:ci`; APK de debug: `npx expo prebuild --no-install --platform android` y `cd android && ./gradlew assembleDebug` (`android/` lo genera `expo prebuild` y no se versiona). Nunca `npm run build:android:*` (compila release) ni `npm run android`/`expo run:android` (instala en el dispositivo conectado) |
| Check de CI | `Typecheck + Lint + Jest (Node 22)` y `📱 Build APK` (los dos corren por push y el harness espera los dos en verde; Build APK no corre si el push solo cambia documentación, así que el último push del PR debe tocar código) |
| Tipo de evidencia | móvil (emulador Android con `android.sh`: APK de debug con el JS servido por Metro, claro y oscuro, GIF con screenrecord; el paquete de debug es el de producción, así que solo en un AVD sin la app real) |
| Servidor local | `npx expo start --port 8081` (Metro, siempre en el puerto 8081 y no en el de `port.sh`: en el emulador el APK de debug pide el JS a `10.0.2.2:8081`, el 8081 de la máquina. Comprueba antes que el 8081 esté libre: `serve.sh start <n> metro 8081 -- npx expo start --port 8081` se detiene si está ocupado, y ese proceso no se mata. Solo para un teléfono por USB: `adb -s <serial> reverse tcp:8081 tcp:8081`) |
| Despliegues prohibidos | builds de release y firmados (`./gradlew assembleRelease`/`bundleRelease`/`publish*`, cualquier tarea de firma o subida), `npm run build:android:*`, `npm run android` y `expo run:android` (compilan e instalan en el dispositivo conectado y aceptan `--variant release`), `eas *`, `amplify push`, `gh workflow run` (build-android-bundle firma producción y sube a Play), tags `V*.*.*` y releases (disparan el AAB) |
<!-- racimo-harness:perfil:fin -->

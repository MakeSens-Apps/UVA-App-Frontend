# Discovery — Build System e Infraestructura de Desarrollo (UVA App)

> Fase 1 de la migración Ionic/Angular → React Native (Expo + Development Builds).
> Documento de solo lectura. Todas las afirmaciones llevan referencia `archivo:línea`.
> Stack actual: Angular 18 (standalone) + Ionic 8 + Capacitor 6, Android-only, AWS Amplify v6
> (DataStore/Cognito/AppSync/S3). `applicationId = com.makesens.uvaapp`.

---

## 0. Índice

1. Scripts de `package.json`
2. Scripts de shell (`scripts/*.sh`)
3. Scripts de Amplify referenciados (ESTADO: faltantes)
4. `angular.json` (builders, budgets, assets, estilos, configuraciones)
5. `tsconfig*.json`
6. `ionic.config.json` y `capacitor.config.ts`
7. Carpeta `android/` (gradle, signing, manifest, recursos, SDK)
8. Recursos de íconos/splash
9. Testing (karma + spec files)
10. Husky / ESLint / Prettier / EditorConfig / Browserslist
11. CI/CD (GitHub Actions) y documentación de proceso
12. Amplify (configuración de entornos)
13. Inconsistencias y archivos faltantes detectados
14. **Mapa de reemplazo hacia Expo + Development Builds** (OBLIGATORIO)
15. Resumen de riesgos

---

## 1. Scripts de `package.json`

Definidos en `package.json:8-29`. Metadata: `name: "UVA"`, `version: "0.0.1"`, `author: "Ionic Framework"`, `private: true` (`package.json:2-7`). **No hay campo `engines`** (verificado), por lo que la versión de Node no está fijada en el `package.json`; sólo se fija Node 20 en CI y en `setup-dev-environment.sh:68`.

| Script | Comando (`package.json`) | Qué hace realmente |
|---|---|---|
| `ng` | `ng` (`:9`) | Passthrough al CLI de Angular. |
| `start` | `ng serve` (`:10`) | Dev server Angular (config por defecto `development`, `angular.json:86`). |
| `build` | `ng build` (`:11`) | Build con `defaultConfiguration: production` (`angular.json:71`). Salida a `www/` (`angular.json:21`). |
| `watch` | `ng build --watch --configuration development` (`:12`) | Build incremental sin optimizar. |
| `test` | `ng test` (`:13`) | Karma con `karma.conf.js` (`angular.json:100`). |
| `test:dev` | `ng test --browsers=ChromeHeadlessCI` (`:14`) | Launcher `ChromeHeadlessCI` **NO definido** en `karma.conf.js` (ver §9/§13). |
| `test:ci` | `ng test --no-watch --browsers=ChromeHeadlessCI` (`:15`) | Igual; launcher inexistente. |
| `lint` | `eslint . --ext .ts` (`:16`) | ESLint sobre todo el repo (con `.eslintignore`). |
| `lint:fix` | `eslint --fix . --ext .ts` (`:17`) | ESLint con autofix. |
| `update-graphql` | `npx @aws-amplify/cli codegen` (`:18`) | Regenera tipos/queries GraphQL desde el backend Amplify. |
| `format` | `prettier --write 'src/**/*.{js,ts,html,css}'` (`:19`) | Formatea `src/`. |
| `build-android-debug` | `ionic capacitor build android --prod --no-open && cd android && ./gradlew assembleDebug` (`:20`) | Build prod web → sync Capacitor → `gradlew assembleDebug`. Único script que usa `./gradlew`. |
| `amplify-modelgen` | `node amplify/scripts/amplify-modelgen.js` (`:21`) | **El archivo NO existe** (§3/§13). |
| `amplify-push` | `node amplify/scripts/amplify-push.js` (`:22`) | **El archivo NO existe** (§3/§13). |
| `android:setup` | `./scripts/setup-android.sh` (`:23`) | Ver §2. |
| `android:build` | `./scripts/build-android.sh` (`:24`) | Ver §2. |
| `android:bundle` | `./scripts/build-bundle.sh` (`:25`) | Ver §2. |
| `android:full` | `npm run android:setup && npm run android:build` (`:26`) | Setup + build APK. |
| `android:prod` | `./scripts/build-production.sh` (`:27`) | Ver §2. |
| `android:prod-safe` | `./scripts/build-production-safe.sh` (`:28`) | Ver §2. |

No existe script `prepare` (verificado), pese a que `husky` es devDependency (`package.json:90`); ver §10.

### Dependencias relevantes para el build (`package.json:30-106`)
- Capacitor 6 + plugins nativos (`@capacitor/*`, `:40-53`): app, clipboard, device, filesystem, haptics, keyboard, local-notifications, network, preferences, share, splash-screen, status-bar; sólo plataforma `@capacitor/android` (`:40`) — **no hay `@capacitor/ios`**.
- Angular 18 + Ionic 8 (`:31-54`). AWS: `aws-amplify ^6.8.2` (`:56`), `@aws-amplify/datastore ^5.0.60` (`:39`).
- Tooling Android: `cordova-res ^0.15.4` (`:59`), `@capacitor/assets ^3.0.5` (`:79`), `@capacitor/cli ^6.1.2` (`:80`).
- Testing: Karma + Jasmine + launchers Chrome/Firefox (`:93-103`).

---

## 2. Scripts de shell (`scripts/`)

Existen 6 (verificado): `setup-android.sh`, `build-android.sh`, `build-bundle.sh`, `build-production.sh`, `build-production-safe.sh`, `setup-dev-environment.sh`. **NO existen** `scripts/amplify-pull.sh` ni `scripts/trigger-pipeline.sh` pese a estar documentados (§11/§13).

Todos los scripts de build hardcodean toolchain macOS/Apple Silicon: `JAVA_HOME="/opt/homebrew/opt/openjdk@17"` y `ANDROID_HOME="$HOME/Library/Android/sdk"` (`build-android.sh:6-9`, `build-bundle.sh:6-9`, `build-production.sh:5-9`, `build-production-safe.sh:5-9`, `setup-android.sh:22-25`).

### `setup-android.sh` (53 líneas)
- Verifica/instala Homebrew, OpenJDK 17 y Gradle vía `brew` (`:6-19`).
- `npm run build` (`:31`) → `npx cap sync android` (`:35`) → `npx @capacitor/assets generate` (`:39`).
- Parche de íconos: reemplaza `@mipmap/ic_launcher_*` → `@drawable/ic_launcher_*` con `sed -i ''` (BSD macOS) en `ic_launcher.xml` e `ic_launcher_round.xml` (`:42-48`).

### `build-android.sh` (23 líneas)
- `cd android` (`:12`) → `gradle assembleDebug` (`:15`) → `gradle assembleRelease` (`:18`). Usa **`gradle` del sistema, NO `./gradlew`**.
- Salidas: `app-debug.apk` y `app-release-unsigned.apk` (`:22-23`) — release **sin firmar** localmente.

### `build-bundle.sh` (20 líneas)
- `cd android` → `gradle bundleRelease` (`:15`). Salida: `app-release.aab` (`:19`).

### `build-production.sh` (50 líneas)
- Lee entorno de `amplify/.config/local-env-info.json` con `grep`/`cut` (`:12`).
- `amplify env checkout main` (`:16`) → `amplify pull --yes` (`:18`) → `npm run build` (`:22`) → `npx cap sync android` (`:25`) → `gradle assembleDebug` (`:31`) → `assembleRelease` (`:34`) → `bundleRelease` (`:37`).
- **No restaura el entorno**: deja el proyecto apuntando a `main` (`:50`).

### `build-production-safe.sh` (50 líneas)
- Igual pero guarda `ORIGINAL_ENV` (`:12`) y restaura con `amplify env checkout $ORIGINAL_ENV` + `amplify pull --yes` (`:38-40`). Sólo `assembleRelease` + `bundleRelease` (`:30-34`).

### `setup-dev-environment.sh` (312 líneas)
- Bootstrap macOS/Linux (`:34-45`). Instala Node 20 (`:68`/`:71`), Git, CLIs globales `@ionic/cli @capacitor/cli @angular/cli @aws-amplify/cli` (`:111`).
- `npm install` (`:177`), `npx cap sync` (`:207`).
- Intenta `npm run prepare` para Husky sólo si existe, con `|| true` (`:218-219`) — no hace nada (no hay `prepare`).
- Indica obtener `src/amplifyconfiguration.json` con `amplify pull --appId [APP_ID] --envName dev` (`:189-199`).

---

## 3. Scripts de Amplify referenciados (ESTADO: FALTANTES)

`package.json:21-22` invoca `node amplify/scripts/amplify-modelgen.js` y `node amplify/scripts/amplify-push.js`. **El directorio `amplify/scripts/` no existe** (verificado con `ls`/`find`). Bajo `amplify/` sólo hay `cli.json`, `team-provider-info.json` y `amplify/.config/{project-config,local-aws-info,local-env-info}.json`. Los scripts npm `amplify-modelgen`/`amplify-push` **fallarían**. La generación real se hace vía Amplify CLI (`amplify pull`, `update-graphql`→`npx @aws-amplify/cli codegen`).

---

## 4. `angular.json`

Builder de build: `@angular-devkit/build-angular:browser` (`angular.json:19`) — **builder webpack clásico (no esbuild/application)**.
- `outputPath: www` (`:21`), `index: src/index.html` (`:22`), `main: src/main.ts` (`:23`), `polyfills: src/polyfills.ts` (`:24`), `tsConfig: tsconfig.app.json` (`:25`), `inlineStyleLanguage: scss` (`:26`).
- Assets: `src/assets` → `assets` (`:27-33`). Estilos globales: `src/global.scss` y `src/theme/variables.scss` (`:34`). Sin scripts globales (`:35`).

### `production` (`:38-58`)
- **Budgets**: `initial` warning/error = **7mb/7mb** (`:41-44`); `anyComponentStyle` 8kb/8kb (`:45-49`). El presupuesto inicial de 7 MB es muy alto → bundle pesado (Ionic+Amplify).
- `fileReplacements`: `environment.ts` → `environment.prod.ts` (`:51-56`). `outputHashing: all` (`:57`).
- **No** activa serviceWorker, AOT explícito ni budgets de lazy chunks.

### `development` (`:59-66`)
- `buildOptimizer:false`, `optimization:false`, `vendorChunk:true`, `extractLicenses:false`, `sourceMap:true`, `namedChunks:true`.

### `ci` (`:67-69`)
- Sólo `progress:false`.

### `serve` (`:73-87`)
- Builder `dev-server`; `defaultConfiguration: development` (`:86`).

### `test` (`:94-118`)
- Builder `karma`, `main: src/test.ts`, `karmaConfig: karma.conf.js` (`:97-100`).

### `lint` (`:119-124`)
- Builder `@angular-eslint/builder:lint`, patrones `src/**/*.ts` y `src/**/*.html` (`:122`).

CLI: `schematicCollections:["@ionic/angular-toolkit"]`, `analytics:false` (`:128-130`). Páginas/componentes nuevos = standalone SCSS (`:8-12,132-138`).

---

## 5. `tsconfig*.json`

### `tsconfig.json` (raíz)
- `strict:true` + flags estrictos: `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch` (`:15-18`).
- `target:es2022`, `module:es2020`, `moduleResolution:node`, `lib:["es2018","dom"]` (`:25-28`).
- `experimentalDecorators:true`, `useDefineForClassFields:false`, `esModuleInterop:true`, `resolveJsonModule:true`, `skipLibCheck:true` (`:22,29-32`).
- **Paths** (`:33-43`): `@app/*`→`src/app/*`, `@components/*`, `@pages/*`, `@assets/*`→`src/app/pages/*`(¡apunta a pages!), `@environment/*`, `@shared/*`→`src/app/shared/*`, `@service/*`→`src/app/services/*`, `@interfaces/*`. `@app/` usado en `src/app/app.component.ts` y otros (verificado). Varios alias apuntan a rutas que pueden no existir tal cual.
- `angularCompilerOptions`: `strictInjectionParameters`, `strictInputAccessModifiers`, `strictTemplates` = true (`:45-50`).

### `tsconfig.app.json`
- Extiende raíz; `types:[]`; `files: src/main.ts, src/polyfills.ts` (`:3-11`).

### `tsconfig.spec.json`
- Extiende raíz; `types:["jasmine","node"]`, `module:CommonJS`, `allowJs:true`; incluye `src/**/*.spec.ts` (`:4-13`).

---

## 6. `ionic.config.json` y `capacitor.config.ts`

- `ionic.config.json`: `name:"UVA"`, integración `capacitor:{}`, `type:"angular-standalone"` (`:2-6`).
- `capacitor.config.ts`: `appId:'com.makesens.uvaapp'`, `appName:'UVA'`, `webDir:'www'` (`:4-6`). No define `server`/`plugins`/`android`; `bundledWebRuntime` comentado (`:7`).

---

## 7. Carpeta `android/`

### Top-level Gradle
- `android/build.gradle`: AGP **8.2.1** (`:10`), `com.google.gms:google-services:4.4.0` (`:11`), repos google+mavenCentral (`:5-6,21-22`), `apply from: variables.gradle` (`:18`).
- `android/variables.gradle`: **minSdk 22, compileSdk 35, targetSdk 35** (`:2-4`); appcompat 1.6.1, core 1.12.0, coreSplashScreen 1.0.1, cordovaAndroidVersion 10.1.1 (`:5-15`).
- `android/gradle/wrapper/gradle-wrapper.properties`: Gradle **8.2.1** (`:3`). **`gradle-wrapper.jar` NO presente** (verificado: en `android/gradle/wrapper/` sólo existe `.properties`). Por eso CI regenera el wrapper (§11/§13).
- `android/gradle.properties`: `org.gradle.jvmargs=-Xmx1536m`, `android.useAndroidX=true` (`:12,22`). Sin `parallel`/Jetifier.
- `android/settings.gradle`: incluye `:app` y `:capacitor-cordova-android-plugins`, aplica `capacitor.settings.gradle` (`:1-5`).
- `android/capacitor.settings.gradle` (autogenerado): incluye 12 módulos Capacitor → `node_modules/@capacitor/*` (`:2-44`).

### `android/app/build.gradle`
- `namespace`/`applicationId` = **`com.makesens.uvaapp`** (`:4,7`). SDK via rootProject.ext (35/22/35) (`:5,8,9`).
- **`versionCode 8`, `versionName "2.1.7"`** (`:10-11`).
- `signingConfigs.release` (`:21-39`): 3 rutas — Android Studio injected (`:23-28`); `app/signing.properties` si existe (`:29-37`); ninguna → sin firmar. **`signing.properties` NO existe** (verificado); lo crea CI (§11).
- `buildTypes.release` (`:41-50`): **`minifyEnabled false`**, `proguard-rules.pro` (vacío de reglas), firma sólo si `storeFile != null` (`:46-48`).
- Deps: appcompat, coordinatorlayout, core-splashscreen, `:capacitor-android`, `:capacitor-cordova-android-plugins`, JUnit/Espresso (`:59-69`).
- `apply from: capacitor.build.gradle` (`:71`); aplica `google-services` **sólo si existe `google-services.json`** (`:73-80`). **`google-services.json` NO existe** (verificado) → push Firebase no aplicado.
- `android/app/capacitor.build.gradle` (autogen): `source/targetCompatibility = VERSION_17` (`:4-7`); 12 `implementation project(':capacitor-*')` (`:11-24`).
- `android/debug-signing.gradle`: task de diagnóstico `debugSigning` (no participa del build normal).

### `AndroidManifest.xml`
- `package="com.makesens.uvaapp"` (`:2`).
- `<application>`: `allowBackup=true`, `icon=@mipmap/ic_launcher`, `roundIcon=@mipmap/ic_launcher_round`, `theme=@style/AppTheme` (`:3-9`).
- `MainActivity`: `launchMode=singleTask`, `exported=true`, theme `AppTheme.NoActionBarLaunch`, intent-filter MAIN/LAUNCHER (`:10-22`).
- `FileProvider` authority `${applicationId}.fileprovider`, `@xml/file_paths` (`:24-31`).
- **Permisos** (`:35-49`): `SYSTEM_ALERT_WINDOW`, `INTERNET`, `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM` + `USE_EXACT_ALARM`, `WAKE_LOCK`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.

### Recursos `res/`
- `values/strings.xml`: `app_name=UVA`, `title_activity_main=UVA`, `package_name`/`custom_url_scheme`=`com.makesens.uvaapp` (`:3-6`). El custom URL scheme es el applicationId (no un deep-link dedicado).
- `values/styles.xml`: `AppTheme` con `windowOptOutEdgeToEdgeEnforcement=true` (workaround Android 15, `:13-14`); `AppTheme.NoActionBarLaunch` parent `Theme.SplashScreen`, `background=@drawable/splash` (`:28-30`).
- `xml/file_paths.xml`: `external-path` y `cache-path` con `path="."` (`:3-4`).
- `MainActivity.java` en paquete por defecto **`io.ionic.starter`** (`android/app/src/main/java/io/ionic/starter/MainActivity.java`), NO `com.makesens.uvaapp` — inconsistencia del template.
- Tests Android de plantilla: `ExampleUnitTest.java`/`ExampleInstrumentedTest.java` en `com.getcapacitor.myapp` (verificado).
- Generados ignorados en git: `config.xml`, `capacitor.config.json`, `capacitor.plugins.json`, `assets/public` (`android/.gitignore`).

### Keystore
- `android/keys/keystore.jks` **existe y ESTÁ versionado en git** (`git ls-files` lo confirma). El `.gitignore` de Android tiene `*.jks`/`*.keystore` **comentados** → el keystore de release queda en el repo. Riesgo de seguridad (§13/§14).

---

## 8. Recursos de íconos/splash

- Fuente única en `resources/`: **`resources/splash.png` (2732×2732 RGBA)** (verificado con `file`). **No existe `resources/icon.png`** (verificado) ni `assets/` raíz como fuente.
- Android generado: `drawable/splash.png` es **320×480** (verificado); `mipmap-*` con íconos por densidad (ldpi→xxxhdpi) + `mipmap-anydpi-v26/{ic_launcher,ic_launcher_round}.xml` (adaptive). Múltiples carpetas drawable port/land y night.
- Generación delegada a `npx @capacitor/assets generate` (`setup-android.sh:39`; CI `build-android.yml:118`, `build-android-bundle.yml:198`) + parche `sed` `@mipmap`→`@drawable` (`setup-android.sh:42-48`).

---

## 9. Testing

### `karma.conf.js` (53 líneas)
- Frameworks `jasmine` + `@angular-devkit/build-angular` (`:4`); plugins chrome/firefox/jasmine-html/coverage-istanbul (`:5-12`).
- Reporters `progress`+`kjhtml` (`:21`); coverage Istanbul a `../coverage` (`:16-20`).
- Browsers: `ChromeHeadlessLinux`+`FirefoxHeadless` (`:26`), launchers custom (`:27-42`). `singleRun:true` (`:43`).
- **Clave**: `files` restringido a **un único spec**: `gamification.service.spec.ts` con `type:'service'` (`:44-51`). La config activa **sólo corre 1 test**, no la suite.
- **`ChromeHeadlessCI` no definido** aquí, aunque `package.json:14-15` lo usa → `test:dev`/`test:ci` fallarían.

### `karma.minimal.conf.js` (24 líneas)
- Sólo `jasmine`, mismo `gamification.service.spec.ts` (`:4-6`), launcher `ChromeHeadlessCustom` (`:7-21`). **No referenciado** por scripts ni `angular.json` (config huérfana).

### `src/test.ts`
- Bootstrap estándar: `zone.js/testing` + `getTestBed().initTestEnvironment` (`:3-14`).

### Cantidad/cobertura de `.spec.ts`
- **57 archivos `.spec.ts`** en `src/` (verificado `find | wc -l`). Cubren componentes (alert, areachart, calendar, calendar/day, environmental-report, header, moon-card, progress-bar, explore-container, app.component), páginas (auth login/otp/validate-code/register + 7 sub-páginas, tabs, splash, measurement+guide+register, moon-phase, profile+sub-páginas, historical), y servicios (auth, session, app-minimize, api ×5, storage configuration-app/s3/file-system + datastore ×6, view gamification/moon-phase/setup/setup-racimo, notification).
- **57 specs existen pero Karma sólo ejecuta 1** (gamification). No hay evidencia de que la suite completa pase. ESLint ignora specs (`.eslintrc.json:4`, `.eslintignore`).

---

## 10. Husky / ESLint / Prettier / EditorConfig / Browserslist

### Husky — declarado pero NO configurado
- `husky ^9.1.6` devDependency (`package.json:90`), pero **no existe `.husky/`** (verificado) ni script `prepare`. **No hay git hooks activos**. `setup-dev-environment.sh:215-223` intenta `npm run prepare` con `|| true` (no-op).

### ESLint (`.eslintrc.json`, 181 líneas)
- Parser `@typescript-eslint/parser`, `ignorePatterns:["projects/**/*","*.spec.ts"]` (`:3-4`).
- Reglas clave: `quotes` single warn (`:12`); `no-unused-vars` error (`:19`); `explicit-function-return-type` error (`:25`); `no-console` warn permitiendo warn/error (`:33`); `no-non-null-assertion` error (`:50`); `no-explicit-any` error (`:64`); `curly` all (`:68`); `semi` always (`:60`); `no-floating-promises` error (`:100`); `no-misused-promises` error (`:103`); `explicit-module-boundary-types` error (`:106`); `naming-convention` camelCase/PascalCase (`:109-114`); **`jsdoc/require-jsdoc` error** para FunctionDeclaration y MethodDefinition (`:122-133`).
- Overrides `*.ts`: extiende `eslint:recommended`+`@angular-eslint/recommended`+template inline+`jsdoc/recommended`, `parserOptions.project: tsconfig.json` (`:135-174`). Sufijos `Page`/`Component`, selector `app` (`:151-172`).
- Override `*.html`: `@angular-eslint/template/recommended` (`:175-179`).
- `.eslintignore`: `src/models/models`, `node_modules/`, `build/`, `*.spec.ts`, `**/*.test.ts`, `src/models/index.d.ts`.

### Prettier (`.prettierrc`): `singleQuote:true`, `trailingComma:"all"`.
### EditorConfig (`.editorconfig`): `indent_style=space`, `indent_size=2`, `insert_final_newline=true`; `*.ts` quote single.
### Browserslist (`.browserslistrc`): Chrome/ChromeAndroid ≥79, Firefox ≥70, Edge ≥79, Safari/iOS ≥14. Irrelevante en RN.

---

## 11. CI/CD — GitHub Actions y documentación de proceso

**3 workflows** en `.github/workflows/` (verificado): `build-android.yml`, `build-android-bundle.yml`, `test-secrets.yml`. **No hay workflow de lint/test unitario** — la CI sólo compila Android.

### `build-android.yml` (APK, 362 líneas)
- Triggers: push a `feature/**`,`fix/**`,`hotfix/**`,`develop`,`test`,`main`; PR a `develop`/`main` (`:3-15`).
- Env: `AMPLIFY_APP_ID: d2l8hh51bqhq16`, `JAVA_VERSION:17`, `NODE_VERSION:20`, `AWS_REGION:us-east-1` (`:18-22`).
- Flujo: checkout → Node 20 (cache npm) → Java 17 temurin → **Android SDK api-level 33, build-tools 33.0.0, ndk 23.1.7779620** (`:45-50`) → AWS creds → `npm ci` + CLIs globales (`:60-62`) → entorno Amplify por rama (`:64-76`) → **`amplify pull` headless** con JSON inline (`:78-102`) → `npm run build` (`:107`) → `cap sync` + `@capacitor/assets generate --android` (`:115-118`) → **regenera wrapper si falta** (`gradle wrapper --gradle-version 8.5`, `:120-137`) → `assembleDebug` siempre + `assembleRelease` sólo main/test (`:143-168`) → artifacts (debug+release, retención 30/90 días, `:198-206`) → Slack (`:208-313`) → summary (`:315-343`). Job `notify` (`:344-362`).
- Nota: regenera wrapper a **8.5**, mientras el proyecto declara **8.2.1** (`gradle-wrapper.properties:3`) — inconsistencia.

### `build-android-bundle.yml` (AAB firmado, 764 líneas)
- Triggers: `workflow_dispatch` con inputs `environment`/`version_name`/`version_code` (`:5-23`); `release: published` (`:26-27`); push tags `V*.*.*`/`v*.*.*` y rama `main` (`:29-35`).
- Versionado (`:50-127`): VERSION_NAME desde release/tag/manual/auto (`1.0.YYYYMMDDHHMM`); **VERSION_CODE auto = `timestamp/10`** (cambia cada 10s), fallback `/100` si supera 2147483647 (`:79-97`).
- `npm ci` (`:169`); `amplify pull` headless `framework:angular` (`:171-186`); `npm run build --prod` (`:188-192`); `cap sync`+assets+regenera wrapper a **8.2.1** (`:194-217`).
- **"Update Android version"** (`:219-401`): reescribe `versionCode`/`versionName` en `android/app/build.gradle` con 3 métodos (sed→awk→línea-a-línea), backup y verificación; aborta si corrompe.
- **"Setup Production Signing"** (`:403-492`): usa **keystore versionado** `android/keys/keystore.jks` (`:408`), valida secrets `KEYSTORE_PASSWORD`/`KEY_ALIAS`/`KEY_PASSWORD` (`:422-444`), valida con `keytool` (`:450-456`), **crea `android/app/signing.properties`** → `../keys/keystore.jks` (`:460-465`).
- Build: `./gradlew bundleRelease` (fallback `gradle`) sólo si existe `signing.properties` (`:494-553`); sube `app-release.aab` (90 días, `:555-561`); Slack (`:563-679`); summary (`:680-715`); **verificación de firma** del AAB con `unzip`/META-INF y opcional `bundletool` (`:717-763`).

### `test-secrets.yml` (139 líneas)
- `workflow_dispatch` manual (`:3-4`). Verifica keystore del repo + secrets, intenta recrear keystore desde `KEYSTORE_BASE64` (`:70-106`).

### Secrets requeridos (de los workflows)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (Amplify pull headless).
- `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` (firma AAB); `KEYSTORE_BASE64` (sólo `test-secrets.yml`).
- `SLACK_WEBHOOK_URL` (notificaciones).

### Documentación de proceso
- `README-PIPELINE.md`: describe el pipeline; **referencia archivos inexistentes** `scripts/amplify-pull.sh` (`:11,116`) y `scripts/trigger-pipeline.sh` (`:13,138`). Mapeo rama→entorno (`:166-176`).
- `docs/github-actions-pipeline.md`: workflows, secrets, entornos, artifacts, troubleshooting.
- `docs/release-workflow.md`: releases/tags y versionado semántico; menciona secret `KEYSTORE_BASE64` (`:103`) y `docs/android-signing.md` (**no existe**).
- `docs/android-build.md`: guía de scripts `android:*`.
- `docs/slack-integration.md`: configuración del webhook Slack.
- Otros: `docs/arquitectura.md` y demás docs de migración (`architecture/components/native-plugins/build-system`).
- **No hay** despliegue automático a Google Play (sin Fastlane ni `upload-google-play`): el AAB se sube **manualmente** a Play Console (`docs/release-workflow.md:133-147`).

---

## 12. Amplify — entornos

- `amplify/.config/project-config.json`: `projectName:UVAV2`, frontend javascript/ionic, `DistributionDir:www`, `BuildCommand:npm run-script build` (`:5-15`).
- `amplify/.config/local-env-info.json`: `envName:"develop"` (entorno local activo) (`:3`).
- `amplify/team-provider-info.json`: entorno `develop`, region `us-east-1`, `AmplifyAppId:d2l8hh51bqhq16`, cuenta `913045965320` (`:1-13`). El CI usa también `test`/`main`, no presentes localmente.
- `src/amplifyconfiguration.json` y `src/aws-exports.js` **existen** (verificado); `src/main.ts:18-21` hace `Amplify.configure(config)` importando `./amplifyconfiguration.json`; comentario `// Configurar Amplify sin DataStore` (`:17`).

---

## 13. Inconsistencias / archivos faltantes (verificado)

1. **`amplify/scripts/amplify-modelgen.js` y `amplify-push.js` no existen** → scripts npm rotos (`package.json:21-22`).
2. **`scripts/amplify-pull.sh` y `scripts/trigger-pipeline.sh` no existen** pese a documentarse (`README-PIPELINE.md:11-13`).
3. **`docs/android-signing.md` no existe** (referenciado en `docs/release-workflow.md:248`).
4. **Husky sin hooks**: `.husky/` ausente y sin `prepare` → no hay validación pre-commit.
5. **Karma sólo corre 1 spec** (`karma.conf.js:44-51`); 57 specs no se ejecutan juntos. `karma.minimal.conf.js` huérfano.
6. **`ChromeHeadlessCI` no definido** en `karma.conf.js`, pero `test:dev`/`test:ci` lo usan.
7. **`gradle-wrapper.jar` ausente**; CI lo regenera (versiones distintas: 8.5 APK vs 8.2.1 AAB).
8. **`MainActivity.java` en `io.ionic.starter`**, no `com.makesens.uvaapp`.
9. **`google-services.json` ausente** → Firebase/push Android no aplicado (`android/app/build.gradle:73-80`).
10. **Keystore (`android/keys/keystore.jks`) versionado en git** (gitignore con `*.jks` comentado) — secreto de firma en el repo.
11. **`signing.properties` no existe localmente**; firma de release sólo en CI o Android Studio.
12. **`minifyEnabled false`** en release (`android/app/build.gradle:43`) → sin minificación/ofuscación.
13. Scripts locales asumen **macOS Apple Silicon** (`/opt/homebrew`) y **`gradle` global** (no `./gradlew`).
14. Íconos: sólo `resources/splash.png`, **sin `resources/icon.png`**.

---

## 14. Mapa de reemplazo hacia Expo + Development Builds (OBLIGATORIO)

> Destino: React Native con **Expo + Development Builds (Dev Client)**, **EAS Build** para CI, React Navigation. Se preserva la lógica TS; se reemplaza UI, navegación, integración nativa y build system. Mantener `applicationId = com.makesens.uvaapp`.

### 14.1 Scripts de `package.json`
| Ionic actual | Equivalente Expo |
|---|---|
| `start` (`ng serve`) | `expo start --dev-client` (Metro contra el dev build) |
| `build` (`ng build`) | No hay web; el "build" pasa a nativo: `eas build` o `npx expo run:android`. JS lo empaca Metro |
| `android:setup` (`setup-android.sh`) | `npx expo prebuild --platform android` (genera/regenera `android/` desde `app.json`/config plugins) |
| `android:build` (`gradle assembleDebug/Release`) | Local: `npx expo run:android --variant release`. Cloud: `eas build -p android --profile preview` (APK) |
| `android:bundle` (`gradle bundleRelease`) | `eas build -p android --profile production` (AAB firmado) |
| `android:prod`/`android:prod-safe` | Perfiles EAS con env vars (`eas.json`→`production`) apuntando al backend `main`; la lógica "checkout/pull/restore" de Amplify CLI se sustituye por env vars por perfil |
| `build-android-debug` (`./gradlew assembleDebug`) | `npx expo run:android` |
| `amplify-modelgen`/`amplify-push` | Sin cambio funcional (siguen siendo Amplify CLI); `amplify/` se preserva. Hoy están rotos (§3) |
| `lint`/`format`/`test` | Mantener ESLint/Prettier; reemplazar Karma/Jasmine por **Jest + RN Testing Library** (14.7) |

### 14.2 Config: `capacitor.config.ts`/`angular.json` → `app.json`/`app.config.js` + `eas.json`
- `appId/appName/webDir` (`capacitor.config.ts:4-6`) → `app.json`: `expo.android.package="com.makesens.uvaapp"`, `expo.name="UVA"`, `expo.slug`.
- Permisos del manifest (`AndroidManifest.xml:35-49`) → `expo.android.permissions` o **config plugins**: `POST_NOTIFICATIONS`/`SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM` (plugin de notificaciones), `WAKE_LOCK`, `SYSTEM_ALERT_WINDOW`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`. `INTERNET` es default.
- `FileProvider`/`file_paths.xml` (`:24-31`) → `expo-file-system`/`expo-sharing` proveen su propio FileProvider.
- Budgets/`fileReplacements` de `angular.json` (§4): sin equivalente directo; Metro + `eas.json` profiles reemplazan optimización y selección de entorno. El budget de 7 MB deja de aplicar; vigilar tamaño con `expo export`.
- `tsconfig` paths (`tsconfig.json:33-43`) → `tsconfig.json` RN + resolver de Metro/`babel-plugin-module-resolver`. Conservar `strict` y flags.

### 14.3 `android/` y `prebuild`
- **CNG recomendado**: borrar el `android/` actual (template Ionic/Capacitor) y regenerar con `npx expo prebuild`. Migrar manualmente sólo lo no expresable en config: `windowOptOutEdgeToEdgeEnforcement` (`styles.xml:13-14`) → config plugin; splash → `expo-splash-screen`.
- `variables.gradle` SDK (22/35/35, `:2-4`) → los fija la versión de Expo SDK; ajustar con `expo-build-properties` para paridad.
- AGP/Gradle 8.2.1 → gestionados por Expo; el **`gradle-wrapper.jar` faltante (§13.7) deja de ser problema** (prebuild lo regenera).
- `MainActivity.java` en `io.ionic.starter` (§13.8) → prebuild lo genera bajo `com.makesens.uvaapp` (problema eliminado).

### 14.4 `applicationId`, `versionCode`, `versionName`
- `applicationId "com.makesens.uvaapp"` (`android/app/build.gradle:7`) → `expo.android.package`.
- `versionName "2.1.7"` (`:11`) → `expo.version`.
- `versionCode 8` (`:10`) → `expo.android.versionCode`, **o** `eas.json` con `"autoIncrement": true` (reemplaza la lógica `timestamp/10` de `build-android-bundle.yml:79-97` y la reescritura sed/awk de `:219-401`, que se eliminan).

### 14.5 Firma (signing)
- Hoy: keystore versionado en git (`android/keys/keystore.jks`, §13.10) + `signing.properties` generado en CI (`build-android-bundle.yml:460-465`) desde secrets.
- Destino: **EAS Managed Credentials**. **Reusar el keystore actual** (subirlo con `eas credentials`) para no romper actualizaciones en Play. Quitar el `.jks` del repo y de la historia git. Los secrets pasan a EAS (no `signing.properties`). `signingConfigs` de `build.gradle:21-39` se elimina.

### 14.6 Íconos y splash
- Hoy: `resources/splash.png` (2732×2732) único; íconos por `@capacitor/assets`; parche `sed` `@mipmap`→`@drawable` (`setup-android.sh:42-48`).
- Destino: `app.json` → `expo.icon` (1024×1024 — **falta crear `icon.png`, §13.14**), `expo.android.adaptiveIcon` (`foregroundImage`/`backgroundColor`/`monochromeImage`), y **`expo-splash-screen`**. El splash 2732×2732 sirve de fuente. prebuild genera todas las densidades; el parche `sed` desaparece.

### 14.7 Testing
- Hoy: Karma+Jasmine, 57 specs pero sólo 1 corriendo (§9). `karma.conf.js`/`karma.minimal.conf.js`/`src/test.ts` se eliminan.
- Destino: **Jest** (`jest-expo`) + **@testing-library/react-native**. Portar specs de servicios (gamification, moon-phase, setup, datastore…) — son TS puro, migración casi 1:1. Reactivar la suite completa. Añadir workflow CI de `lint`+`jest` (hoy inexistente, §11).

### 14.8 CI/CD (GitHub Actions → EAS)
- `build-android.yml` (APK por push) → `eas build -p android --profile preview --non-interactive` disparado por GitHub Actions o EAS Workflows. Conservar matriz rama→entorno como **perfiles `eas.json`** + env vars.
- `build-android-bundle.yml` (AAB por tag/release) → `eas build -p android --profile production`; opcional `eas submit -p android` para subir a Play Console (hoy manual, §11). Elimina la reescritura de `build.gradle`, la creación de `signing.properties` y la regeneración del wrapper.
- `amplify pull` headless (`build-android.yml:78-102`) → seguir usándolo para hidratar `src/amplifyconfiguration.json` antes del build, o env vars por perfil EAS.
- Slack (`8398a7/action-slack`) → reutilizable con resultados de EAS o webhooks de EAS.
- `test-secrets.yml` → obsoleto (credenciales en EAS).

### 14.9 Entornos Amplify
- La conmutación por scripts (`amplify env checkout main`, `build-production*.sh:16`) y la selección por rama en CI → **perfiles `eas.json`** con `EXPO_PUBLIC_*`/env vars que carguen el `amplifyconfiguration.json` correcto (develop/test/main). La lógica `Amplify.configure` (`src/main.ts:18-21`) se preserva en el bootstrap RN (`App.tsx`).

---

## 15. Resumen de riesgos
Ver bloque estructurado (StructuredOutput). Los más relevantes: keystore versionado (migrar a EAS sin perder identidad de firma de Play), `versionCode=8` vs lógica CI basada en timestamp (definir esquema único en EAS), suite de tests prácticamente inactiva (sin red de seguridad para validar lógica portada), y dependencia fuerte de scripts macOS/Capacitor reemplazados por `prebuild`/EAS.

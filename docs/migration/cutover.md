# Cutover B19 — promover la app RN a la raíz y eliminar Ionic

> Runbook operativo del paso final de la migración (`docs/migration/plan.md` §B19).
> Ejecutar **sólo** después de que la paridad visual y funcional de Fase 6 esté
> aprobada por el usuario.

## 0. Resumen

| | |
|---|---|
| **Qué hace** | `git mv` de todo `mobile/*` a la raíz + `git rm -r` de la implementación Ionic/Angular. |
| **Herramienta** | `scripts/cutover.sh` (dry-run por defecto). |
| **Resultado** | Un único commit `chore(cutover): …` sin `mobile/` y sin restos Ionic. |
| **Paso separado** | Purga de `android/keys/keystore.jks` de la historia git (`scripts/purge-keystore.sh`), con force-push. |
| **Rollback** | `git reset --hard <sha-previo>` mientras no se haya hecho force-push. |

Se **conservan** en la raíz: `amplify/`, `schema.json`, `.graphqlconfig.yml`,
`docs/`, `.github/`, `.claude/`, `.vscode/`, `.editorconfig`, `LICENSE`,
`README*.md`, `CLAUDE.md`.

---

## 1. Precondiciones

- [ ] Gate de paridad de Fase 6 aprobado (ver `docs/migration/verification.md`).
- [ ] `cd mobile && npm run lint && npm run test:ci` en verde.
- [ ] Dev build en device físico validada (última fila de `verification.md`).
- [ ] `git-filter-repo` instalado: `brew install git-filter-repo`.
- [ ] Nadie más con trabajo sin mergear sobre `mobile/` (el cutover reescribe
      todas las rutas: cualquier PR abierto contra `mobile/**` queda inservible).
- [ ] Acceso de admin al repo en GitHub (hará falta para el force-push y para
      desproteger la rama temporalmente).

---

## 2. Paso a paso — día del cutover

```bash
# 1. Rama dedicada a partir de feature/ionic-to-react-native
git checkout feature/ionic-to-react-native
git pull
git checkout -b chore/cutover-rn
git rev-parse HEAD          # <-- ANOTA ESTE SHA: es el punto de rollback

# 2. Dry-run: revisa cada git mv / git rm que se ejecutaría
./scripts/cutover.sh

# 3. Aplicar + correr todos los gates (npm ci, tsc, jest, expo prebuild)
./scripts/cutover.sh --execute
```

`cutover.sh --execute` **no hace commit**: deja todo en el índice.

```bash
# 4. Ajustes manuales (§4). Aplícalos ANTES del commit.

# 5. Revisar y commitear (UN solo commit)
git status
git add -A
git commit -m "chore(cutover): promover la app RN de mobile/ a la raíz y eliminar Ionic"

# 6. Purga del keystore — PASO SEPARADO (§6)
./scripts/purge-keystore.sh            # dry-run: diagnóstico + backup
./scripts/purge-keystore.sh --execute  # reescribe la historia (pide confirmación)

# 7. Force-push + PR (§6.3)
```

### Opciones de `cutover.sh`

| Flag | Efecto |
|---|---|
| *(ninguno)* | Dry-run. Imprime cada operación, no toca nada. |
| `--execute` | Aplica los cambios y corre **todos** los gates. |
| `--execute --skip-build-gates` | Aplica; omite `npm ci` / `tsc` / `jest` / `prebuild` (útil sin red). |
| `--execute --skip-verify` | Aplica; sin ninguna verificación. |

El script es **idempotente**: si `mobile/` ya no tiene archivos versionados,
salta directo a la verificación.

---

## 3. Qué mueve y qué borra

### 3.1 Se promueven de `mobile/` a la raíz

Las entradas de primer nivel se enumeran **dinámicamente** con
`git ls-files mobile | sed 's|mobile/||' | cut -d/ -f1 | sort -u`, así que
cualquier archivo que otro agente añada antes del cutover (p. ej.
`mobile/app.config.js` o `mobile/plugins/withReleaseSigning.js`) se mueve
igual, sin tocar el script.

Estado en `c52e69e` (21 entradas):

```
.claude  .gitignore  .prettierrc  AGENTS.md  App.tsx  CLAUDE.md  LICENSE
__mocks__  app.json  assets  babel.config.js  eas.json  eslint.config.js
index.ts  metro.config.js  modules  package-lock.json  package.json
plugins  src  tsconfig.json
```

### 3.2 Se elimina de la raíz (`git rm -r`)

`src/` · `android/` · `www/` · `resources/` · `angular.json` ·
`ionic.config.json` · `capacitor.config.ts` · `build.json` · `karma.conf.js` ·
`karma.minimal.conf.js` · `tsconfig.json` · `tsconfig.app.json` ·
`tsconfig.spec.json` · `package.json` · `package-lock.json` ·
`.browserslistrc` · `.eslintrc.json` · `.eslintignore` · `.prettierrc` ·
`LICENSE copy` · `scripts/{build-android,build-bundle,build-production,build-production-safe,setup-android,setup-dev-environment}.sh`

> `scripts/` **no** se borra entera: ahí viven `cutover.sh` y
> `purge-keystore.sh`. Una vez completado el cutover y el release, ambos pueden
> eliminarse en un commit de limpieza posterior.

También se borran los residuos **no versionados** de la era Ionic que rompen
`npm ci` / `expo prebuild`: `www/`, `platforms/`, `plugins/`, `.angular/`,
`node_modules/`, `dist/`, `coverage/`, `.sourcemaps/`, `.ionic/`.

### 3.3 Colisiones y decisiones

| Ruta | Decisión | Motivo |
|---|---|---|
| `package.json` | **mobile gana** | La raíz es Angular/Ionic. Además el script cambia `"name": "mobile"` → `"uva-app"`. |
| `package-lock.json` | **mobile gana** | Idem. |
| `tsconfig.json` | **mobile gana** | El de mobile extiende `expo/tsconfig.base`. `tsconfig.app.json` / `tsconfig.spec.json` se borran. |
| `.prettierrc` | **mobile gana** | Contenido idéntico; se mueve por limpieza. |
| `.gitignore` | **fusionado** | Se instala `docs/migration/cutover.gitignore` (§3.4). |
| `.claude/` | **fusión archivo a archivo** | La raíz tiene `CLAUDE.md` + `skills/`; mobile aporta `settings.json`. Sin colisión de archivos. |
| `CLAUDE.md` | **raíz gana** | El de la raíz se reescribe para RN. `mobile/CLAUDE.md` es sólo `@AGENTS.md` → añade esa línea al de la raíz (§4). |
| `LICENSE` | **raíz gana** | La raíz es GPL-3.0; `mobile/LICENSE` es el MIT de la plantilla Expo. Se descarta. |
| `LICENSE copy` | **se borra** | Duplicado byte a byte de `LICENSE`. |
| `AGENTS.md` | **se mueve** | No existe en la raíz. |
| `assets/` | **se mueve** | No hay `assets/` en la raíz (los del Ionic vivían en `src/assets/`). |
| `plugins/` | **se mueve** | El `plugins/` de la raíz era de Cordova y estaba gitignoreado / ausente. Se limpia antes de mover. |
| `android/` | **se borra y se regenera** | El de la raíz es Capacitor. El nuevo lo genera `expo prebuild` (CNG) y queda **gitignoreado**. |
| `src/` | **se borra y se sustituye** | Angular fuera, `mobile/src` dentro. |
| `README.md`, `README-PIPELINE.md` | **raíz gana** *(defensa)* | Hoy no existen bajo `mobile/`; están en la lista por si un agente las crea antes del cutover. |

> **Colisión imprevista.** Si aparece una entrada nueva en `mobile/` que también
> existe en la raíz (p. ej. `mobile/docs/`), el script cae en la rama de
> **fusión archivo por archivo, ganando `mobile/` por archivo**, y lo avisa con
> un `[!] colisión en '<ruta>'`. Revisa ese aviso en el dry-run antes de
> `--execute`: si la decisión correcta es que gane la raíz, añade la entrada a
> `MOBILE_DROP` en `scripts/cutover.sh`.

### 3.4 `.gitignore` fusionado

Propuesta en **`docs/migration/cutover.gitignore`** (el script la copia sobre
`.gitignore`). Base: `mobile/.gitignore` (Expo) + las reglas útiles de la raíz
(bloque `#amplify-do-not-edit`, `amplify-backup*/`, `.env`, `.vscode/*` con sus
excepciones, `.idea/`, `.DS_Store`).

**Se eliminan a propósito** las reglas globales de la raíz Ionic:
`*.js`, `*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.webp`, `*.ttf`. Son las que hoy
obligan a `git add -f` para `mobile/plugins/*.js`, `mobile/assets/**/*.png|ttf`
y `docs/evidence/**/*.png`. En su lugar hay reglas específicas por artefacto
(`/android`, `/ios`, `.expo/`, `dist/`, `coverage/`, `*.jks`, `*.keystore`…).

Verificado tras el cutover de prueba:

- **Ya no se ignoran** (no hará falta `-f`): `plugins/*.js`, `assets/**/*.png`,
  `assets/fonts/*.ttf`, `docs/evidence/**/*.png`, `src/assets/**/*.svg`,
  `babel.config.js`, `app.config.js`, `modules/**`.
- **Siguen ignorados**: `android/`, `ios/`, `node_modules/`,
  `amplifyconfiguration.json`, `*.keystore` / `*.jks`, `.expo/`, `coverage/`,
  `dist/`, `amplify-backup*/`, `.env`.

---

## 4. Ajustes manuales (aplicar en el MISMO commit)

`cutover.sh` mueve archivos; **no** reescribe contenidos. Estas rutas siguen
apuntando a `mobile/` y hay que arreglarlas antes del commit:

| Archivo | Qué cambiar |
|---|---|
| `.github/workflows/mobile-ci.yml` | `paths: 'mobile/**'` → `'**'` (o quitar el filtro); `defaults.run.working-directory: mobile` → borrar (o `.`); `cache-dependency-path: mobile/package-lock.json` → `package-lock.json`. |
| `.github/workflows/*` (nuevos EAS) | `APP_DIR: mobile` → `APP_DIR: .` en **todos** los workflows que lo declaren. |
| `.graphqlconfig.yml` | Rutas Angular: `includes: src/graphql/**/*.ts` → `src/data/graphql/**/*.ts`; `excludes: src/API.ts` → `src/data/graphql/API.ts`; `generatedFileName: src/API.ts` → `src/data/graphql/API.ts`; `docsFilePath: src/graphql` → `src/data/graphql`; `framework: ionic` → `none`. |
| `CLAUDE.md` (raíz) | Añadir `@AGENTS.md` en la primera línea (era el contenido íntegro de `mobile/CLAUDE.md`, que se descarta). |
| `.vscode/settings.json` | `files.exclude` / `search.exclude` con `**/www`, `**/.angular`; claves `ionic.showIcons`, `ionic.showToolTips`; `emmet.includeLanguages.typescript: html`. Sustituir por `**/android`, `**/ios`, `**/.expo`. |
| `.vscode/extensions.json` | Quitar `angular.ng-template`, `ionic.ionic`; añadir `expo.vscode-expo-tools`. |
| `README.md`, `README-PIPELINE.md`, `docs/android-build.md`, `docs/release-workflow.md`, `docs/github-actions-pipeline.md` | Referencias a `npm run android:setup/build/bundle/prod`, `./scripts/setup-dev-environment.sh`, `ionic`, `ng serve` → `npx expo prebuild`, `eas build`. *(Los reescribe el agente de documentación; verificar que no queden rutas `mobile/`.)* |
| `docs/migration/plan.md`, `docs/migration/verification.md` | Referencias históricas a `mobile/` y `cd mobile`. Son **históricas**: dejarlas y añadir una nota de "post-cutover" en vez de reescribir la historia del plan. |

### Referencias `mobile/` que NO hay que tocar

- **Comentarios de código** en `mobile/src/**` (~30 archivos: cabeceras
  "Import paths updated to mobile/ structure", `AreachartSvg.tsx`,
  `useAppMinimize.ts`, `withAsyncStorageDbSize.js`, `modules/app-minimize/README.md`…).
  Son prosa, no rutas resueltas. Se pueden limpiar en un commit posterior.
- `mobile/metro.config.js` (usa `__dirname`), `mobile/babel.config.js`
  (`root: ['./']`, `alias '@': './src'`), `mobile/tsconfig.json`
  (`paths: {"@/*": ["./src/*"]}`), la config `jest` de `package.json`
  (`<rootDir>/…`) y `mobile/eslint.config.js`: **todas relativas**, funcionan
  igual en la raíz. Verificado con `tsc --noEmit` y `jest --ci` post-cutover.
- `mobile/modules/app-minimize/README.md` enlaza `../../src/native/...`:
  relativo, sigue siendo válido.

---

## 5. Verificación (la corre `cutover.sh --execute`)

| Gate | Comprobación |
|---|---|
| Estructura | No existe `mobile/`, `src/app`, `angular.json`, `www`, `capacitor.config.ts`, `ionic.config.json`, `android/keys/keystore.jks`. |
| Estructura | Existen `app.json`, `index.ts`, `App.tsx`, `metro.config.js`, `babel.config.js`, `eas.json`. |
| `package.json` | Declara `"expo"`. |
| Toolchain | `npm ci` · `npx tsc --noEmit` · `npx jest --ci`. |
| CNG | `npx expo prebuild --platform android --clean --no-install` y `android/app/build.gradle` con `applicationId 'com.makesens.appuva'`. |

Además, manualmente:

- [ ] `npm run lint` en verde.
- [ ] `git status` no muestra archivos inesperados como *untracked* (señal de
      que el `.gitignore` fusionado dejó fuera algo que debía versionarse).
- [ ] `eas build --profile production` firma con el keystore correcto y con
      `versionCode` > el publicado en Play.

---

## 6. Purga del keystore (paso SEPARADO)

`android/keys/keystore.jks` está versionado desde el commit `2f503a5`
(riesgo **R-10**). El `git rm -r android` del cutover lo saca del árbol, pero
**sigue en la historia**: hay que reescribirla.

### 6.1 Antes de purgar

- [ ] El commit del cutover ya está hecho.
- [ ] `git fetch --all --tags` — `git filter-repo` sólo reescribe las refs que
      existen **localmente**. Si falta una rama remota, esa rama conservará el
      `.jks` después del force-push.
- [ ] Idealmente, correr la purga sobre un **clon fresco** del repo
      (`git clone <url> uva-purge && cd uva-purge`); `filter-repo` se niega a
      operar sobre un repo que no es un clon recién empaquetado, y el script
      reintenta con `--force` sólo tras haber hecho el backup.

### 6.2 Ejecutar

```bash
./scripts/purge-keystore.sh              # dry-run: herramientas + commits + BACKUP
./scripts/purge-keystore.sh --execute    # pide escribir PURGAR para confirmar
```

El script:

1. Verifica `git-filter-repo` (preferido) o `bfg`.
2. Lista los commits que contienen el `.jks`
   (`git log --all --oneline -- android/keys/keystore.jks`).
3. **Hace backup** en `~/uva-keystore-backup-<fecha>/keystore.jks`, tomándolo
   del working tree o, si ya no está, del blob en la historia.
4. Con `--execute`: `git filter-repo --invert-paths --path android/keys/keystore.jks --path android/keys/`.
5. Verifica que no quedan commits ni objetos con `keystore.jks`.

> El backup es **crítico**: sin ese `.jks` no se puede volver a publicar
> `com.makesens.appuva` en Play. Guárdalo en el gestor de secretos del equipo
> antes de continuar.

### 6.3 Después de purgar

```bash
git remote add origin <url>      # filter-repo elimina 'origin' por seguridad
git push --force --all
git push --force --tags
```

- [ ] Desproteger temporalmente la rama en GitHub si el force-push es rechazado.
- [ ] **Avisar al equipo**: un `git pull` NO sirve. Cada colaborador debe
      re-clonar (`rm -rf UVA-App-Frontend && git clone <url>`).
- [ ] Cerrar / re-abrir los PRs abiertos: apuntan a SHAs que ya no existen.
- [ ] Abrir el PR del cutover contra `feature/ionic-to-react-native` (o `main`,
      según el cierre de la migración).

### 6.4 ¿Hay que rotar el keystore?

**No, siempre que el repo haya sido privado.** La purga + el secret bastan.
Si el repo fue público en algún momento, hay que asumir el `.jks` comprometido
y migrar a **Play App Signing** (Google re-firma; la llave de subida sí se
puede rotar).

### 6.5 Ficha de Play y firma

- La ficha de `com.makesens.appuva` es **nueva** (ver `docs/play-store/README.md`).
  La **primera subida fija la llave de firma** de esa ficha para siempre.
- **Se usa el MISMO keystore** que la app Ionic. Verifica el fingerprint antes
  de subir:

  ```bash
  keytool -list -v -keystore ~/uva-keystore-backup-<fecha>/keystore.jks | grep -A1 'SHA-256'
  ```

- Cargarlo en GitHub Actions como secret:

  ```bash
  base64 -i ~/uva-keystore-backup-<fecha>/keystore.jks | pbcopy
  # Linux: base64 -w0 ~/uva-keystore-backup-<fecha>/keystore.jks
  ```

  → GitHub → *Settings* → *Secrets and variables* → *Actions* → **`ANDROID_KEYSTORE_BASE64`**.

---

## 7. Checklist de secrets y variables de GitHub

Confirmar contra los workflows finales antes del primer build post-cutover.

### Secrets — nuevos / renombrados

- [ ] `ANDROID_KEYSTORE_BASE64` — el `.jks` en base64 (§6.5). **Sustituye** al
      antiguo `KEYSTORE_BASE64` y al `.jks` versionado.
- [ ] `ANDROID_KEYSTORE_PASSWORD` — antes `KEYSTORE_PASSWORD`.
- [ ] `ANDROID_KEY_ALIAS` — antes `KEY_ALIAS`.
- [ ] `ANDROID_KEY_PASSWORD` — antes `KEY_PASSWORD`.
- [ ] `EXPO_TOKEN` — token de cuenta de EAS (`eas whoami` / expo.dev → Access
      tokens). Necesario para `eas build` desde CI.

### Secrets — se conservan

- [ ] `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — generación de
      `amplifyconfiguration.json` en CI (sigue gitignoreado).
- [ ] `SLACK_WEBHOOK_URL` — notificaciones de release.

### Secrets — se pueden borrar

- [ ] `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
      (una vez que ningún workflow los referencie).

### Variables

- [ ] `APP_DIR` → si algún workflow la define: **`.`** (antes `mobile`).

### Workflows

- [ ] `test-secrets.yml` — **eliminar** (B19). Hace `echo` de los secrets de
      firma en los logs.
- [ ] `build-android.yml` → APK de preview vía EAS.
- [ ] `build-android-bundle.yml` → AAB de producción con `autoIncrement`.
- [ ] `mobile-ci.yml` → sin `working-directory: mobile`.

---

## 8. Rollback

| Momento | Cómo revertir |
|---|---|
| Tras `--dry-run` | Nada que revertir. |
| Tras `--execute`, **antes** del commit | `git reset --hard HEAD && git clean -fd` |
| Tras el commit del cutover, **antes** del force-push | `git reset --hard <SHA anotado en §2 paso 1>` |
| Tras `purge-keystore.sh --execute`, **antes** del force-push | El repo local está reescrito: bórralo y vuelve a clonar (`rm -rf <repo> && git clone <url>`). El remoto sigue intacto. |
| Tras el force-push | No hay rollback limpio. Sólo restaurar desde un clon de otro colaborador que no haya re-clonado, o desde un backup del remoto. **Haz un `git clone --mirror` del remoto antes del force-push.** |

```bash
# Red de seguridad recomendada, ANTES del force-push:
git clone --mirror <url> ~/uva-repo-mirror-$(date +%Y%m%d).git
```

---

## 9. Evidencia — ensayo del cutover

Ensayado sobre una copia completa del repo en `c52e69e`
(`git clone --no-hardlinks --no-local`), no sobre el árbol real.

| Gate | Resultado |
|---|---|
| `cutover.sh` (dry-run) | 21 entradas de `mobile/` detectadas, 26 rutas Ionic a borrar, 0 cambios en disco. |
| `cutover.sh --execute` | 353 renames + 445 deletes + 4 modificaciones. Sin conflictos. |
| Estructura | `mobile/`, `src/app`, `angular.json`, `www`, `capacitor.config.ts`, `ionic.config.json`, `android/keys/keystore.jks` ausentes. |
| `npm ci` | OK — 1311 paquetes. |
| `npx tsc --noEmit` | OK — 0 errores. |
| `npx jest --ci` | OK — **56 suites / 1047 tests / 16 snapshots**. |
| `npx expo prebuild --platform android --clean --no-install` | OK — `android/app/build.gradle` con `namespace` y `applicationId 'com.makesens.appuva'`. |
| `.gitignore` fusionado | `android/` generado queda ignorado; ningún artefacto versionado necesita ya `git add -f`. |
| Idempotencia | Segunda pasada con `--execute`: detecta "cutover ya aplicado" y sólo verifica. |
| `purge-keystore.sh` (dry-run) | Detecta `git-filter-repo`, encuentra 1 commit (`2f503a5`), backup extraído de la historia. |
| `purge-keystore.sh --execute` | Historia reescrita (330 commits), 0 objetos `keystore.jks` alcanzables. |

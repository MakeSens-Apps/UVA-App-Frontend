#!/usr/bin/env bash
#
# cutover.sh — B19: promueve la app React Native de `mobile/` a la raíz del repo
#              y elimina la implementación Ionic/Angular.
#
# Por defecto NO modifica nada: imprime cada `git mv` / `git rm` que ejecutaría.
# Usa `--execute` para aplicarlo de verdad.
#
#   ./scripts/cutover.sh                                # dry-run (por defecto)
#   ./scripts/cutover.sh --execute                      # aplica + corre todos los gates
#   ./scripts/cutover.sh --execute --skip-build-gates   # aplica, sin npm/tsc/jest/prebuild
#   ./scripts/cutover.sh --execute --skip-verify        # aplica, sin ninguna verificación
#
# NO hace commit: deja todo staged para un único commit manual
# (ver docs/migration/cutover.md).
#
# La purga del keystore de la historia git es un paso SEPARADO:
# ver scripts/purge-keystore.sh.
#
set -euo pipefail

# ------------------------------------------------------------------ parámetros
MODE="dry-run"
SKIP_VERIFY=0
SKIP_BUILD_GATES=0

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --execute)           MODE="execute" ;;
    --dry-run)           MODE="dry-run" ;;
    --skip-verify)       SKIP_VERIFY=1 ;;
    --skip-build-gates)  SKIP_BUILD_GATES=1 ;;
    -h|--help)           usage 0 ;;
    *) echo "Opción desconocida: $1" >&2; usage 1 ;;
  esac
  shift
done

# ------------------------------------------------------------------ utilidades
C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_BLUE=$'\033[34m'

log()   { printf '%s\n' "$*"; }
info()  { printf '%s%s%s\n' "$C_BLUE" "$*" "$C_RESET"; }
ok()    { printf '%s[ok] %s%s\n' "$C_GREEN" "$*" "$C_RESET"; }
warn()  { printf '%s[!]  %s%s\n' "$C_YELLOW" "$*" "$C_RESET"; }
err()   { printf '%s[X]  %s%s\n' "$C_RED" "$*" "$C_RESET" >&2; }
head1() { printf '\n%s== %s ==%s\n' "$C_BOLD" "$*" "$C_RESET"; }
skip()  { printf '%s  . %s%s\n' "$C_DIM" "$*" "$C_RESET"; }

# Ejecuta (o sólo imprime) un comando.
run() {
  printf '  %s$ %s%s\n' "$C_DIM" "$*" "$C_RESET"
  if [ "$MODE" = "execute" ]; then
    "$@"
  fi
}

FAILED_GATES=()

# ------------------------------------------------------------------ preflight
head1 "Preflight"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  err "No estás dentro de un repositorio git."
  exit 1
fi
cd "$REPO_ROOT"
ok "Repo root: $REPO_ROOT"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
log "  Rama actual: $BRANCH"
case "$BRANCH" in
  main|master|develop)
    err "Estás en '$BRANCH'. El cutover debe correr en una rama dedicada (p. ej. chore/cutover-rn)."
    exit 1 ;;
esac

if [ "$MODE" = "execute" ]; then
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    err "El árbol de trabajo tiene cambios sin commitear. Haz commit o stash antes del cutover."
    git status --short --untracked-files=no | sed 's/^/    /'
    exit 1
  fi
  ok "Árbol de trabajo limpio (archivos versionados)."
fi

MOBILE_TRACKED="$(git ls-files mobile | wc -l | tr -d ' ')"
if [ "$MOBILE_TRACKED" -eq 0 ]; then
  warn "No hay archivos versionados bajo mobile/ — el cutover parece ya aplicado."
  ALREADY_DONE=1
else
  ok "mobile/ tiene $MOBILE_TRACKED archivos versionados."
  ALREADY_DONE=0
fi

GITIGNORE_SRC="docs/migration/cutover.gitignore"
if [ ! -f "$GITIGNORE_SRC" ]; then
  err "Falta $GITIGNORE_SRC (el .gitignore fusionado propuesto para la raíz)."
  exit 1
fi
ok "Plantilla de .gitignore encontrada: $GITIGNORE_SRC"

log ""
if [ "$MODE" = "dry-run" ]; then
  warn "MODO DRY-RUN — no se modifica nada. Usa --execute para aplicar."
else
  info "MODO EXECUTE — se aplicarán los cambios (sin commit)."
fi

# ==============================================================================
# Listas de decisión
# ==============================================================================

# Rutas Ionic/Angular a eliminar de la raíz (revisadas contra `git ls-files`).
IONIC_PATHS=(
  "src"                       # app Angular/Ionic completa
  "android"                   # proyecto Capacitor (incluye android/keys/keystore.jks, R-10)
  "www"                       # build Ionic
  "resources"                 # splash de cordova-res
  "angular.json"
  "ionic.config.json"
  "capacitor.config.ts"
  "build.json"
  "karma.conf.js"
  "karma.minimal.conf.js"
  "tsconfig.json"             # sustituido por mobile/tsconfig.json
  "tsconfig.app.json"
  "tsconfig.spec.json"
  "package.json"              # sustituido por mobile/package.json
  "package-lock.json"         # sustituido por mobile/package-lock.json
  ".browserslistrc"
  ".eslintrc.json"            # sustituido por mobile/eslint.config.js (flat config)
  ".eslintignore"
  ".prettierrc"               # sustituido por mobile/.prettierrc (contenido idéntico)
  "LICENSE copy"              # duplicado exacto de LICENSE, basura del repo
  # scripts .sh de build Ionic/macOS. NO se borra scripts/ entero: ahí viven
  # cutover.sh y purge-keystore.sh.
  "scripts/build-android.sh"
  "scripts/build-bundle.sh"
  "scripts/build-production-safe.sh"
  "scripts/build-production.sh"
  "scripts/setup-android.sh"
  "scripts/setup-dev-environment.sh"
)

# Se CONSERVAN en la raíz (no se tocan): amplify/ schema.json .graphqlconfig.yml
# docs/ .github/ .claude/ .vscode/ .editorconfig LICENSE README*.md CLAUDE.md

# Entradas de mobile/ que NO se promueven (la versión de la raíz gana).
# Las que hoy no existen bajo mobile/ están por defensa: si otro agente las
# crea antes del cutover, la raíz sigue ganando.
MOBILE_DROP=(
  ".gitignore"        # se instala el fusionado desde docs/migration/cutover.gitignore
  "CLAUDE.md"         # el CLAUDE.md de la raíz (reescrito para RN) gana
  "LICENSE"           # MIT de la plantilla Expo; la raíz es GPL-3.0
  "README.md"         # (defensa) la raíz se está reescribiendo para RN
  "README-PIPELINE.md" # (defensa)
)

is_in() { local n="$1"; shift; local e; for e in "$@"; do [ "$e" = "$n" ] && return 0; done; return 1; }

# Residuos NO versionados de la era Ionic que estorban a npm ci / expo prebuild.
IONIC_RESIDUE=( "www" "platforms" "plugins" ".angular" "node_modules" "dist" "coverage" "src" "android" ".sourcemaps" ".ionic" )

# ==============================================================================
if [ "$ALREADY_DONE" -eq 0 ]; then

# ------------------------------------------------------------------ 1. gitignore
head1 "1/5 . .gitignore fusionado (Expo + Amplify, sin las reglas globales *.js/*.png/*.ttf)"
run cp "$GITIGNORE_SRC" .gitignore
run git add .gitignore
ok "Instalado desde $GITIGNORE_SRC"

# ------------------------------------------------------- 2. eliminar Ionic (git rm)
head1 "2/5 . Eliminar la implementación Ionic/Angular de la raíz"
for p in "${IONIC_PATHS[@]}"; do
  if [ -n "$(git ls-files -- "$p" | head -1)" ]; then
    run git rm -r -q --ignore-unmatch -- "$p"
  else
    skip "ya ausente: $p"
  fi
done

# -------------------------------------------- 3. limpiar residuos no versionados
head1 "3/5 . Limpiar residuos no versionados de la era Ionic"
for d in "${IONIC_RESIDUE[@]}"; do
  if [ -e "$d" ]; then
    run rm -rf -- "$d"
  else
    skip "ya ausente: $d"
  fi
done

# --------------------------------------------------- 4. promover mobile/* a raíz
head1 "4/5 . Promover mobile/* a la raíz"

# Entradas de primer nivel versionadas bajo mobile/ (incluye dotfiles).
# Se enumeran dinámicamente: si otro agente añade mobile/app.config.js o
# mobile/plugins/withReleaseSigning.js antes del cutover, se mueven igual.
MOBILE_ENTRIES=()
while IFS= read -r e; do
  [ -n "$e" ] && MOBILE_ENTRIES+=("$e")
done < <(git ls-files mobile | sed 's|^mobile/||' | cut -d/ -f1 | sort -u)

log "  Entradas detectadas (${#MOBILE_ENTRIES[@]}): ${MOBILE_ENTRIES[*]}"
log ""

for e in "${MOBILE_ENTRIES[@]}"; do
  if is_in "$e" "${MOBILE_DROP[@]}"; then
    log "  ${C_YELLOW}drop${C_RESET}  mobile/$e  (gana la versión de la raíz)"
    run git rm -r -q --ignore-unmatch -- "mobile/$e"
    continue
  fi

  # ¿Colisiona con algo que sobrevive en la raíz?
  # Lo que se acaba de borrar en el paso 2 NO cuenta como colisión (en dry-run
  # el archivo sigue en disco, por eso se consulta IONIC_PATHS y no sólo -e).
  if is_in "$e" "${IONIC_PATHS[@]}" || [ ! -e "$e" ]; then
    log "  ${C_GREEN}move${C_RESET}  mobile/$e -> $e"
    run git mv -- "mobile/$e" "$e"
  else
    # Colisión real (p. ej. .claude/): fusión archivo por archivo, gana mobile/.
    warn "colisión en '$e' -> fusión archivo por archivo (gana mobile/)"
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      dest="${f#mobile/}"
      destdir="$(dirname "$dest")"
      [ "$destdir" != "." ] && run mkdir -p "$destdir"
      if [ -n "$(git ls-files -- "$dest" | head -1)" ]; then
        run git rm -q --ignore-unmatch -- "$dest"
      fi
      run git mv -- "$f" "$dest"
    done < <(git ls-files "mobile/$e")
  fi
done

# mobile/ debe quedar vacía
if [ -d mobile ]; then
  run rm -rf mobile
fi

# --------------------------------------------------------- 5. ajustes post-move
head1 "5/5 . Ajustes post-move"

# package.json: "name": "mobile" -> nombre real del proyecto
if [ "$MODE" = "execute" ]; then PKG="package.json"; else PKG="mobile/package.json"; fi
if [ -f "$PKG" ] && grep -q '"name": "mobile"' "$PKG"; then
  log "  package.json: \"name\": \"mobile\" -> \"uva-app\""
  if [ "$MODE" = "execute" ]; then
    perl -0pi -e 's/"name": "mobile"/"name": "uva-app"/' package.json
    git add package.json
  fi
else
  skip "package.json: \"name\" ya ajustado"
fi

run git add -A

fi  # ALREADY_DONE
# ==============================================================================

# ------------------------------------------------------------------ verificación
if [ "$MODE" != "execute" ]; then
  head1 "Resumen (dry-run)"
  log "  Nada se modificó. Revisa la lista de arriba y luego:"
  log "    ./scripts/cutover.sh --execute"
  log ""
  log "  Ajustes MANUALES que el script NO hace (ver docs/migration/cutover.md §4):"
  log "    . .github/workflows/*     -> APP_DIR: mobile  =>  APP_DIR: .  (+ quitar 'mobile/**' de los path filters)"
  log "    . .graphqlconfig.yml      -> rutas Angular (src/graphql, src/API.ts, framework: ionic)"
  log "    . .vscode/settings.json   -> excludes de Angular/Ionic (www, .angular, ionic.*)"
  log "    . .vscode/extensions.json -> recomendaciones angular.ng-template / ionic.ionic"
  log "    . CLAUDE.md raíz          -> añadir '@AGENTS.md' (mobile/CLAUDE.md se descarta)"
  exit 0
fi

if [ "$SKIP_VERIFY" -eq 1 ]; then
  head1 "Verificación omitida (--skip-verify)"
  exit 0
fi

GATE_LOG="$(mktemp -t cutover-gate)"
trap 'rm -f "$GATE_LOG"' EXIT

gate() { # gate <nombre> <comando...>
  local name="$1"; shift
  printf '\n  %s-> %s%s\n' "$C_BOLD" "$name" "$C_RESET"
  if "$@" >"$GATE_LOG" 2>&1; then
    ok "$name"
    return 0
  else
    err "$name"
    tail -40 "$GATE_LOG" | sed 's/^/      /'
    FAILED_GATES+=("$name")
    return 1
  fi
}

assert_absent() {
  if [ -e "$1" ]; then
    err "todavía existe: $1"; FAILED_GATES+=("ausencia de $1")
  else
    ok "ausente: $1"
  fi
}

head1 "Verificación . estructura"
assert_absent "mobile"
assert_absent "src/app"
assert_absent "angular.json"
assert_absent "www"
assert_absent "capacitor.config.ts"
assert_absent "ionic.config.json"
assert_absent "android/keys/keystore.jks"

if grep -q '"expo"' package.json; then
  ok "package.json raíz declara \"expo\""
else
  err "package.json raíz NO declara \"expo\""; FAILED_GATES+=("package.json expo")
fi

for f in app.json index.ts App.tsx metro.config.js babel.config.js eas.json; do
  if [ -f "$f" ]; then ok "presente: $f"; else err "falta: $f"; FAILED_GATES+=("falta $f"); fi
done

if [ "$SKIP_BUILD_GATES" -eq 1 ]; then
  head1 "Gates de build omitidos (--skip-build-gates)"
else
  head1 "Verificación . toolchain"
  gate "npm ci"            npm ci
  gate "npx tsc --noEmit"  npx tsc --noEmit
  gate "npx jest --ci"     npx jest --ci

  head1 "Verificación . expo prebuild (CNG)"
  if gate "npx expo prebuild --platform android --clean --no-install" \
       npx expo prebuild --platform android --clean --no-install; then
    if [ -f android/app/build.gradle ] && grep -q 'com.makesens.appuva' android/app/build.gradle; then
      ok "android/app/build.gradle con applicationId com.makesens.appuva"
    else
      err "android/app/build.gradle sin com.makesens.appuva"
      FAILED_GATES+=("applicationId com.makesens.appuva")
    fi
  fi
fi

head1 "Resultado"
if [ "${#FAILED_GATES[@]}" -eq 0 ]; then
  ok "TODOS LOS GATES EN VERDE."
  log ""
  log "  Siguiente: aplicar los ajustes manuales de docs/migration/cutover.md §4,"
  log "  revisar 'git status' y hacer UN commit:"
  log ""
  log "    git commit -m 'chore(cutover): promover la app RN de mobile/ a la raíz y eliminar Ionic'"
  log ""
  log "  Después, y como paso SEPARADO: ./scripts/purge-keystore.sh"
  exit 0
else
  err "GATES FALLIDOS (${#FAILED_GATES[@]}):"
  for g in "${FAILED_GATES[@]}"; do log "    . $g"; done
  log ""
  log "  Rollback: git reset --hard HEAD && git clean -fd"
  exit 1
fi

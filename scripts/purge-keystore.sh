#!/usr/bin/env bash
#
# purge-keystore.sh — B19 / R-10: saca `android/keys/keystore.jks` del repo y lo
#                     borra de TODA la historia git.
#
# Por defecto sólo INFORMA (dry-run): verifica herramientas, hace el backup del
# keystore fuera del repo y muestra los commits afectados. No reescribe nada.
#
#   ./scripts/purge-keystore.sh              # dry-run: diagnóstico + backup
#   ./scripts/purge-keystore.sh --execute    # reescribe la historia (IRREVERSIBLE)
#
# Este script se corre DESPUÉS del commit del cutover, como paso separado.
# Ver docs/migration/cutover.md §6.
#
# ATENCIÓN: --execute reescribe TODOS los SHAs de la rama. Requiere
# `git push --force --all --tags` y que TODOS los colaboradores re-clonen.
#
set -euo pipefail

MODE="dry-run"
ASSUME_YES=0

while [ $# -gt 0 ]; do
  case "$1" in
    --execute) MODE="execute" ;;
    --dry-run) MODE="dry-run" ;;
    --yes|-y)  ASSUME_YES=1 ;;
    -h|--help) sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Opción desconocida: $1" >&2; exit 1 ;;
  esac
  shift
done

C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
log()   { printf '%s\n' "$*"; }
ok()    { printf '%s[ok] %s%s\n' "$C_GREEN" "$*" "$C_RESET"; }
warn()  { printf '%s[!]  %s%s\n' "$C_YELLOW" "$*" "$C_RESET"; }
err()   { printf '%s[X]  %s%s\n' "$C_RED" "$*" "$C_RESET" >&2; }
head1() { printf '\n%s== %s ==%s\n' "$C_BOLD" "$*" "$C_RESET"; }

KEYSTORE_PATH="android/keys/keystore.jks"
KEYSTORE_DIR="android/keys/"

# ------------------------------------------------------------------ 1. contexto
head1 "1/6 . Contexto del repositorio"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -z "$REPO_ROOT" ] && { err "No estás dentro de un repositorio git."; exit 1; }
cd "$REPO_ROOT"
ok "Repo root: $REPO_ROOT"
log "  Rama:   $(git rev-parse --abbrev-ref HEAD)"
log "  HEAD:   $(git rev-parse --short HEAD)"
log "  Remote: $(git remote get-url origin 2>/dev/null || echo '(sin origin)')"

# ------------------------------------------------------------- 2. herramientas
head1 "2/6 . Herramientas"

TOOL=""
if command -v git-filter-repo >/dev/null 2>&1; then
  TOOL="filter-repo"
  ok "git-filter-repo: $(command -v git-filter-repo)"
elif git filter-repo --version >/dev/null 2>&1; then
  TOOL="filter-repo"
  ok "git filter-repo disponible como subcomando de git"
elif command -v bfg >/dev/null 2>&1; then
  TOOL="bfg"
  warn "git-filter-repo NO encontrado; se usará BFG: $(command -v bfg)"
else
  err "Ni git-filter-repo ni bfg están instalados."
  log ""
  log "  Instala el preferido:   brew install git-filter-repo"
  log "  Alternativa (BFG):      brew install bfg"
  exit 1
fi

# ------------------------------------------------- 3. commits que lo contienen
head1 "3/6 . Commits que contienen $KEYSTORE_PATH"

COMMITS="$(git log --all --oneline -- "$KEYSTORE_PATH" || true)"
if [ -z "$COMMITS" ]; then
  warn "Ningún commit alcanzable contiene $KEYSTORE_PATH."
  warn "O ya se purgó, o el objeto sólo vive en refs no alcanzables."
  N_COMMITS=0
else
  N_COMMITS="$(printf '%s\n' "$COMMITS" | wc -l | tr -d ' ')"
  printf '%s\n' "$COMMITS" | sed 's/^/    /'
  log ""
  ok "$N_COMMITS commit(s) afectados."
fi

log ""
log "  Otros rastros de material de firma en la historia:"
git log --all --oneline --name-only --pretty=format:'' -- "$KEYSTORE_DIR" 2>/dev/null \
  | sort -u | grep -v '^$' | sed 's/^/    /' || log "    (ninguno)"

# ------------------------------------------------------------------- 4. backup
head1 "4/6 . Backup del keystore FUERA del repo"

BACKUP_DIR="$HOME/uva-keystore-backup-$(date +%Y%m%d-%H%M%S)"

backup_from_worktree() {
  [ -f "$KEYSTORE_PATH" ] || return 1
  mkdir -p "$BACKUP_DIR"
  cp "$KEYSTORE_PATH" "$BACKUP_DIR/keystore.jks"
  return 0
}

backup_from_history() {
  local blob
  blob="$(git rev-list --all -- "$KEYSTORE_PATH" | head -1 || true)"
  [ -z "$blob" ] && return 1
  mkdir -p "$BACKUP_DIR"
  git show "$blob:$KEYSTORE_PATH" > "$BACKUP_DIR/keystore.jks" 2>/dev/null || return 1
  return 0
}

if backup_from_worktree; then
  ok "Backup desde el working tree -> $BACKUP_DIR/keystore.jks"
elif backup_from_history; then
  ok "Backup desde la historia (commit $(git rev-list --all -- "$KEYSTORE_PATH" | head -1 | cut -c1-8)) -> $BACKUP_DIR/keystore.jks"
else
  err "No se pudo obtener el keystore ni del working tree ni de la historia."
  err "NO continúes: sin el .jks original no se puede volver a publicar la app."
  exit 1
fi

if command -v keytool >/dev/null 2>&1; then
  log ""
  log "  Verifica el fingerprint del backup (te pedirá la contraseña del store):"
  log "    keytool -list -v -keystore \"$BACKUP_DIR/keystore.jks\" | grep -A1 'SHA-256'"
fi

log ""
log "  ${C_BOLD}Guarda este backup en el gestor de secretos del equipo (1Password/Bitwarden).${C_RESET}"
log "  Y cárgalo como secret de GitHub Actions:"
log "    base64 -i \"$BACKUP_DIR/keystore.jks\" | pbcopy   # -> secret ANDROID_KEYSTORE_BASE64"
log "  (macOS usa 'base64 -i'; en Linux: base64 -w0 \"$BACKUP_DIR/keystore.jks\")"

# ------------------------------------------------------------------ 5. purga
head1 "5/6 . Purga de la historia"

PURGE_CMD_FR=(git filter-repo --invert-paths --path "$KEYSTORE_PATH" --path "$KEYSTORE_DIR")

if [ "$MODE" != "execute" ]; then
  warn "MODO DRY-RUN — no se reescribe nada."
  log ""
  log "  Comando que se ejecutaría:"
  if [ "$TOOL" = "filter-repo" ]; then
    log "    ${PURGE_CMD_FR[*]}"
    log ""
    log "  Si git-filter-repo se queja de 'not a fresh clone', añade --force"
    log "  DESPUÉS de haber verificado el backup:"
    log "    ${PURGE_CMD_FR[*]} --force"
  else
    log "    bfg --delete-files keystore.jks ."
    log "    git reflog expire --expire=now --all && git gc --prune=now --aggressive"
    log "  (BFG no borra el path android/keys/ en sí; hay que borrarlo aparte con filter-repo)"
  fi
  log ""
  log "  Cuando estés listo:  ./scripts/purge-keystore.sh --execute"
  exit 0
fi

if [ "$N_COMMITS" -eq 0 ] && [ ! -f "$KEYSTORE_PATH" ]; then
  ok "Nada que purgar. Historia ya limpia."
  exit 0
fi

if [ "$ASSUME_YES" -eq 0 ]; then
  log ""
  err "OPERACIÓN IRREVERSIBLE"
  log "  . Reescribe TODOS los SHAs de la rama (los actuales dejan de existir)."
  log "  . Obliga a 'git push --force --all --tags'."
  log "  . TODOS los colaboradores deben re-clonar (un 'git pull' rompe su copia)."
  log "  . git-filter-repo elimina el remote 'origin' al terminar; hay que re-añadirlo."
  log "  . Backup verificado en: $BACKUP_DIR/keystore.jks"
  log ""
  printf '  Escribe exactamente PURGAR para continuar: '
  read -r CONFIRM
  [ "$CONFIRM" = "PURGAR" ] || { err "Cancelado."; exit 1; }
fi

ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"

if [ "$TOOL" = "filter-repo" ]; then
  log "  $ ${PURGE_CMD_FR[*]}"
  if ! "${PURGE_CMD_FR[@]}"; then
    warn "filter-repo falló; reintentando con --force (el repo no es un clon fresco)."
    "${PURGE_CMD_FR[@]}" --force
  fi
else
  log "  $ bfg --delete-files keystore.jks ."
  bfg --delete-files keystore.jks .
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive
fi

ok "Historia reescrita."

# ------------------------------------------------------------- 6. verificación
head1 "6/6 . Verificación y siguiente paso"

REMAIN="$(git log --all --oneline -- "$KEYSTORE_PATH" || true)"
if [ -n "$REMAIN" ]; then
  err "TODAVÍA hay commits con $KEYSTORE_PATH:"
  printf '%s\n' "$REMAIN" | sed 's/^/    /'
  exit 1
fi
ok "git log --all -- $KEYSTORE_PATH: sin resultados."

if git rev-list --all --objects 2>/dev/null | grep -q 'keystore.jks'; then
  err "Todavía hay objetos 'keystore.jks' alcanzables."
  exit 1
fi
ok "Sin objetos 'keystore.jks' alcanzables."

log ""
log "${C_BOLD}Pasos manuales que faltan:${C_RESET}"
log ""
if [ -n "$ORIGIN_URL" ]; then
  log "  1. Re-añadir el remote (filter-repo lo elimina por seguridad):"
  log "       git remote add origin $ORIGIN_URL"
else
  log "  1. Re-añadir el remote:  git remote add origin <url>"
fi
log ""
log "  2. Force-push de TODA la historia y los tags:"
log "       git push --force --all"
log "       git push --force --tags"
log ""
log "  3. Avisar al equipo. Un 'git pull' NO sirve: cada colaborador debe re-clonar:"
log "       cd .. && rm -rf UVA-App-Frontend && git clone <url>"
log ""
log "  4. En GitHub: desproteger temporalmente la rama si el force-push es rechazado,"
log "     y cerrar/re-abrir los PRs abiertos (apuntan a SHAs que ya no existen)."
log ""
log "  5. Cargar el keystore como secret (ya NO vive en el repo):"
log "       base64 -i \"$BACKUP_DIR/keystore.jks\" | pbcopy"
log "     -> GitHub > Settings > Secrets and variables > Actions > ANDROID_KEYSTORE_BASE64"
log ""
log "  6. Rotación: el .jks estuvo versionado. Si el repo fue PÚBLICO en algún"
log "     momento, hay que asumirlo comprometido y migrar a Play App Signing."
log "     Si siempre fue privado, basta con la purga + secret."
log ""
warn "Backup del keystore: $BACKUP_DIR/keystore.jks  (NO lo borres hasta confirmar el release)"

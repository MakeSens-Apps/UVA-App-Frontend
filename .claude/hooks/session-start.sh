#!/usr/bin/env bash
# racimo-harness-session-start v2
#
# SessionStart hook of the racimo-harness repo layer. Its stdout goes into
# the session context, also after a compaction (source "compact"), so it
# repeats the critical rules that must survive one. It never blocks and
# always exits 0; it only warns. Fast and local: no network calls.

set -u
INPUT="$(cat 2>/dev/null)"
SOURCE="$(printf '%s' "$INPUT" | jq -r '.source // "startup"' 2>/dev/null)"
DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$DIR" 2>/dev/null || exit 0

LAYER_VERSION="$(jq -r '.version // "?"' .claude/racimo-harness-layer.json 2>/dev/null)"
GUARD_VERSION="$(grep -Eo 'racimo-harness-guard v[0-9]+' .claude/hooks/guard-bash.sh 2>/dev/null | grep -Eo '[0-9]+$')"
profile_value() {
  awk -v key="$1" '
    /^## Perfil del harness/ { inside = 1; next }
    inside && /^## / { exit }
    inside && /^\|/ {
      line = $0; gsub(/\\\|/, "\001", line)
      gsub(/^\| */, "", line); gsub(/ *\|[[:space:]]*$/, "", line)
      split(line, c, / *\| */)
      if (c[1] == key) { gsub(/`/, "", c[2]); gsub(/\001/, "|", c[2]); print c[2]; exit }
    }' AGENTS.md 2>/dev/null
}
BASE="$(profile_value "Rama base")"
ACCOUNT="$(profile_value "Cuenta de gh")"

cat <<EOF
racimo-harness: capa del repo v${LAYER_VERSION:-?} · guard v${GUARD_VERSION:-?}. Para ejecutar un ticket: /racimo-harness:ticket <n>. Diagnóstico: /racimo-harness:doctor.
Reglas que no cambian (se repiten al compactar):
- Si implementas un ticket (subagente o worktree): nunca integres ni apruebes PRs, ni hagas push fuera de tu rama feature/*, ni crees tags. Integra una persona o el orquestador desde el checkout principal (GUIA §6). Nadie despliega.
- No leas .env* ni imprimas secretos. Nada de datos reales en capturas, fixtures, PRs, comentarios ni Artifacts: datos sintéticos o difuminados.
- No uses pkill/killall ni kill de procesos ajenos: detén tus servidores con serve.sh stop <n>.
- Si el guard o el clasificador bloquean algo, no lo rodees: comenta en el issue (gh-comment.sh) y detente en ese paso.
- Esperas en segundo plano (run_in_background o Monitor), nunca sleep en primer plano. Si GitHub responde 500, reintenta con espera.
- Los tickets se implementan en un worktree con la rama feature/<n>-<slug> creada desde origin/${BASE:-develop}; el checkout principal es para integrar y coordinar.
EOF

warn() { printf 'AVISO: %s\n' "$1"; }

if [ "$SOURCE" != "compact" ]; then
  if ! jq -e '.enabledPlugins["racimo-harness@makesens"] == true' .claude/settings.json >/dev/null 2>&1; then
    warn "el plugin racimo-harness no está habilitado en .claude/settings.json"
  elif ! grep -q 'racimo-harness@makesens' "$HOME/.claude/plugins/installed_plugins.json" 2>/dev/null; then
    warn "el plugin racimo-harness@makesens no aparece instalado: confía en la carpeta del repo o ejecuta /plugin install racimo-harness@makesens"
  fi
  if [ -n "$ACCOUNT" ] && command -v gh >/dev/null 2>&1; then
    ACTIVE="$(gh config get -h github.com user 2>/dev/null)"
    [ -n "$ACTIVE" ] && [ "$ACTIVE" != "$ACCOUNT" ] && warn "gh usa la cuenta '$ACTIVE' y el perfil pide '$ACCOUNT'"
  fi
  GD="$(git rev-parse --path-format=absolute --git-dir 2>/dev/null)"
  GC="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)"
  if [ -n "$GD" ] && [ "$GD" = "$GC" ]; then
    BR="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
    if [ -n "$BASE" ] && [ "$BR" != "$BASE" ]; then
      warn "la sesión está en el checkout principal en '$BR' y no en '$BASE': la capa del harness se carga desde aquí. Para un ticket arranca con 'claude -w ticket-<n>'"
    else
      warn "la sesión está en el checkout principal: para ejecutar un ticket arranca con 'claude -w ticket-<n>' o lanza el subagente implementador"
    fi
  fi
  for f in .claude/settings.json .claude/settings.local.json "$HOME/.claude/settings.json"; do
    if jq -e '.disableAllHooks == true' "$f" >/dev/null 2>&1; then warn "$f tiene disableAllHooks: el guard del harness no corre. Quítalo"; fi
  done
  command -v node >/dev/null 2>&1 || warn "no encuentro node: el guard bloqueará todos los comandos de Bash hasta que lo instales"
  N_WT="$(find .claude/worktrees -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')"
  [ "${N_WT:-0}" -gt 3 ] && warn "hay $N_WT worktrees en .claude/worktrees: revisa con /racimo-harness:limpiar"
  if ! jq -r '.autoMode.environment // [] | tostring' "$HOME/.claude/settings.json" 2>/dev/null | grep -q 'MakeSens-Apps'; then
    warn "autoMode.environment de ~/.claude/settings.json no describe MakeSens: el clasificador bloqueará más de la cuenta (ver GUIA.md del harness, 'Configuración de usuario')"
  fi
fi
exit 0

#!/usr/bin/env bash
# racimo-harness-guard v2
#
# PreToolUse hook (matcher "Bash") of the racimo-harness repo layer. Runs
# the analysis engine (guard.mjs, next to this file) with node and FAILS
# CLOSED: Claude Code only blocks on exit 2, so anything other than a clean
# "allow" (exit 0) from the engine - node missing or too old, guard.mjs
# missing or broken, a crash, or taking longer than 15 s (the hook timeout
# is 20 s and a timed-out hook does not block) - becomes exit 2 here.
DIR="$(cd "$(dirname "$0")" && pwd)"
block() { echo "racimo-harness guard bloqueó este comando: $1. Avisa en el issue; mientras tanto el comando no pasa." >&2; exit 2; }

node_major() { "$1" -p 'process.versions.node.split(".")[0]' 2>/dev/null; }

# RH_GUARD_NODE is only for the guard's own tests (RH_GUARD_TEST=1).
if [ "${RH_GUARD_TEST:-}" = "1" ] && [ -n "${RH_GUARD_NODE+x}" ]; then
  NODE="$RH_GUARD_NODE"
else
  NODE="$(command -v node 2>/dev/null)"
  if [ -z "$NODE" ] || ! [ "$(node_major "$NODE")" -ge 18 ] 2>/dev/null; then
    # GUI launches may have a short PATH: take the newest node >= 18 found.
    best=""; best_major=0
    for c in /opt/homebrew/bin/node /usr/local/bin/node "$HOME"/.nvm/versions/node/*/bin/node "$HOME"/.volta/bin/node; do
      [ -x "$c" ] || continue
      m="$(node_major "$c")"
      [[ "$m" =~ ^[0-9]+$ ]] && [ "$m" -gt "$best_major" ] && { best="$c"; best_major="$m"; }
    done
    [ -n "$best" ] && NODE="$best"
  fi
fi
[ -n "$NODE" ] && [ -x "$NODE" ] || block "falta node, así que no puedo revisarlo (instala Node 22 o superior)"
[ -r "$DIR/guard.mjs" ] || block "falta .claude/hooks/guard.mjs (el motor del guard)"
MAJOR="$(node_major "$NODE")"
[[ "$MAJOR" =~ ^[0-9]+$ ]] && [ "$MAJOR" -ge 18 ] || block "node ${MAJOR:-desconocido} es muy viejo para el guard (se necesita 18 o superior)"

# Run the engine with a watchdog (a background job reads /dev/null, so the
# hook input goes through a file).
IN="$(mktemp "${TMPDIR:-/tmp}/rh-guard.XXXXXX")" || block "no pude crear un archivo temporal"
ERR="$IN.err"
trap 'rm -f "$IN" "$ERR"' EXIT
cat >"$IN"
"$NODE" "$DIR/guard.mjs" <"$IN" 2>"$ERR" &
PID=$!
LIMIT="${RH_GUARD_WATCHDOG:-75}"   # tenths of a second x2 (0.2 s per step): 15 s
[ "${RH_GUARD_TEST:-}" = "1" ] || LIMIT=75
steps=0
while kill -0 "$PID" 2>/dev/null; do
  steps=$((steps + 1))
  if [ "$steps" -gt "$LIMIT" ]; then
    kill -KILL "$PID" 2>/dev/null
    wait "$PID" 2>/dev/null
    block "revisar el comando tardó demasiado (más de 15 s)"
  fi
  sleep 0.2
done
wait "$PID"
rc=$?
cat "$ERR" >&2
[ $rc -eq 0 ] && exit 0
[ $rc -eq 2 ] && exit 2
block "el motor del guard falló (código $rc)"

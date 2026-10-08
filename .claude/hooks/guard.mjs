// racimo-harness-guard v2
//
// Analysis engine of the racimo-harness guard (PreToolUse hook, matcher
// "Bash"). guard-bash.sh runs it with node and fails closed if node is
// missing. Reads the hook JSON on stdin; exit 2 with a reason on stderr
// blocks the command, exit 0 lets it through.
//
// The command is parsed like a shell would (quotes, escapes, $'...',
// substitutions, heredocs, redirections, pipes, subshells, brace expansion,
// simple variables) and every simple command, including the ones inside
// bash -c, eval, xargs, find -exec, env/sudo/timeout... wrappers, npm
// scripts and executed scripts (up to 3 levels), is checked against allow
// lists for gh, git, gh api (REST and GraphQL) and AWS, and deny lists for
// deploys, process killers and secret reads.
//
// It is a second line of defense next to permissions.deny and the human
// review: it is NOT a security boundary (see GUIA.md, "Límites del guard").

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'

export const GUARD_VERSION = 2
const MAX_DEPTH = 3
const MAX_FILE_BYTES = 1024 * 1024
const DEADLINE_MS = Number(process.env.RH_GUARD_DEADLINE_MS || 8000)
const START = Date.now()

class Deny extends Error {
  // kind "unverifiable": the engine cannot read something (a variable, a
  // missing file...). The loose scan of code in other languages tolerates
  // only that kind; every other deny stands.
  constructor(reason, hint, kind = 'rule') { super(reason); this.hint = hint; this.kind = kind }
}
const deny = (reason, hint = '', kind = 'rule') => { throw new Deny(reason, hint, kind) }
const unverifiable = (reason, hint = '') => deny(reason, hint, 'unverifiable')

// ---------------------------------------------------------------------------
// Shell parser
// ---------------------------------------------------------------------------
// A word: { text, dyn (has an unresolved expansion), glob, brace, quoted }
// A command: { words: [word], redirs: [{ op, target: word, body? }],
//              pipeIn: command|null, pipeOut: bool, sub: bool }

const isSpace = (c) => c === ' ' || c === '\t' || c === '\r'
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*/

export function parseShell(src, vars = new Map(), env = process.env) {
  const out = []
  let i = 0
  const n = src.length
  const pendingHeredocs = []

  function checkTime() {
    if (Date.now() - START > DEADLINE_MS) deny('el comando es demasiado largo para revisarlo antes del tiempo límite del hook', 'Divídelo en comandos más cortos; para escribir archivos usa la herramienta Write')
  }

  function readUntilClose(open, close) {
    // returns inner text of a $( ... ) or ( ... ) honoring quotes and the
    // ")" of case patterns; i points after open
    let depth = 1
    let caseDepth = 0
    const start = i
    while (i < n) {
      const c = src[i]
      if (open === '(' && /[a-z]/.test(c) && (i === start || /[\s;&|(]/.test(src[i - 1]))) {
        if (src.startsWith('case', i) && /\s/.test(src[i + 4] ?? '')) { caseDepth++; i += 4; continue }
        if (src.startsWith('esac', i) && !/[A-Za-z0-9_]/.test(src[i + 4] ?? '')) { caseDepth = Math.max(0, caseDepth - 1); i += 4; continue }
      }
      if (c === ')' && caseDepth > 0 && open === '(') { i++; continue }
      if (c === '\\') { i += 2; continue }
      if (c === "'") { const j = src.indexOf("'", i + 1); i = j === -1 ? n : j + 1; continue }
      if (c === '"') {
        i++
        while (i < n && src[i] !== '"') { if (src[i] === '\\') i++; i++ }
        i++
        continue
      }
      if (c === '`') { const j = src.indexOf('`', i + 1); i = j === -1 ? n : j + 1; continue }
      if (c === open) depth++
      else if (c === close) { depth--; if (depth === 0) { const inner = src.slice(start, i); i++; return inner } }
      i++
    }
    return src.slice(start)
  }

  function resolveVar(name) {
    if (vars.has(name)) return vars.get(name)
    if (/^CLAUDE_(PROJECT_DIR|PLUGIN_ROOT|SKILL_DIR)$/.test(name) && env[name]) return env[name]
    if (name === 'HOME') return os.homedir()
    return undefined
  }

  // A resolved variable marks the word (a command name may not come from
  // one); unquoted, a value with blanks or glob characters would be split or
  // expanded by the shell, so it is treated as unknown.
  function useVar(word, v, marker, inDouble, name = '') {
    if (!/^(CLAUDE_(PROJECT_DIR|PLUGIN_ROOT|SKILL_DIR)|HOME)$/.test(name)) word.fromVar = true
    if (v === undefined || (!inDouble && /[\s*?[]/.test(v))) { word.dyn = true; word.text += marker; return }
    word.text += v
  }

  // Commands substituted inside a text that the shell expands like a
  // double-quoted string (heredoc bodies, ${x:-...}, $((...))).
  function subsIn(text) {
    for (const sc of parseShell('"' + text.replace(/"/g, '\\"') + '"', new Map(vars), env)) if (sc.sub) out.push(sc)
  }

  function readDollar(word, inDouble) {
    // i points at '$'
    const next = src[i + 1]
    if (next === '(' && src[i + 2] === '(') { // arithmetic: its $(...) still run
      i += 3
      const inner = readUntilClose('(', ')'); if (src[i] === ')') i++
      if (/\$\(|`/.test(inner)) subsIn(inner)
      word.dyn = true; word.text += '$(())'; return
    }
    if (next === '(') {
      i += 2
      const inner = readUntilClose('(', ')')
      for (const c of parseShell(inner, new Map(vars), env)) { c.sub = true; out.push(c) }
      word.dyn = true; word.text += '$(…)'; return
    }
    if (next === '{') {
      i += 2
      const inner = readUntilClose('{', '}')
      const m = inner.match(/^([A-Za-z_][A-Za-z0-9_]*)$/)
      const v = m ? resolveVar(m[1]) : undefined
      if (/\$\(|`/.test(inner)) subsIn(inner)
      useVar(word, v, '${…}', inDouble, m?.[1])
      return
    }
    if (next === "'" && !inDouble) { // ANSI-C quoting
      i += 2
      let s = ''
      while (i < n && src[i] !== "'") {
        if (src[i] === '\\') {
          const e = src[i + 1]
          const map = { n: '\n', t: '\t', r: '\r', a: '\x07', b: '\b', e: '\x1b', E: '\x1b', f: '\f', v: '\v', '\\': '\\', "'": "'", '"': '"', '?': '?' }
          if (e in map) { s += map[e]; i += 2; continue }
          let m
          if ((m = src.slice(i + 1).match(/^x([0-9A-Fa-f]{1,2})/))) { s += String.fromCharCode(parseInt(m[1], 16)); i += 1 + m[0].length; continue }
          if ((m = src.slice(i + 1).match(/^u([0-9A-Fa-f]{1,4})/))) { s += String.fromCharCode(parseInt(m[1], 16)); i += 1 + m[0].length; continue }
          if ((m = src.slice(i + 1).match(/^U([0-9A-Fa-f]{1,8})/))) { s += String.fromCodePoint(parseInt(m[1], 16)); i += 1 + m[0].length; continue }
          if ((m = src.slice(i + 1).match(/^([0-7]{1,3})/))) { s += String.fromCharCode(parseInt(m[1], 8)); i += 1 + m[0].length; continue }
          if ((m = src.slice(i + 1).match(/^c(.)/))) { i += 3; continue }
          s += e ?? ''; i += 2; continue
        }
        s += src[i]; i++
      }
      i++
      word.text += s; word.quoted = true; return
    }
    if (next === '"' && !inDouble) { i++; return } // $"..." locale string
    const m = src.slice(i + 1).match(NAME_RE)
    if (m) {
      i += 1 + m[0].length
      useVar(word, resolveVar(m[0]), '$' + m[0], inDouble, m[0])
      return
    }
    if (next && /[0-9@*#?$!-]/.test(next)) { i += 2; word.dyn = true; word.text += '$' + next; return }
    word.text += '$'; i++
  }

  let cmd = newCmd()
  let word = null
  let pendingRedir = null
  let lastWasPipe = null

  function newCmd() { return { words: [], redirs: [], pipeIn: null, pipeOut: false, sub: false, heredocWrites: [] } }
  function newWord() { return { text: '', dyn: false, glob: false, brace: false, quoted: false } }
  function endWord() {
    if (!word) return
    if (pendingRedir) {
      const r = { op: pendingRedir, target: word }
      cmd.redirs.push(r)
      if (pendingRedir === '<<' || pendingRedir === '<<-') pendingHeredocs.push(r)
      pendingRedir = null
    } else {
      cmd.words.push(word)
    }
    word = null
  }
  function endCmd(pipe = false) {
    endWord()
    if (cmd.words.length || cmd.redirs.length) {
      if (lastWasPipe) cmd.pipeIn = lastWasPipe
      cmd.pipeOut = pipe
      // Simple variable tracking: NAME=value words at the start of a command
      // (also after export/declare/local/readonly). A later $NAME resolves to
      // the literal value; a dynamic value leaves it unresolved.
      // Only a command made of assignments sets variables (x=v cmd does not).
      let ws = cmd.words
      const first = ws[0]?.text
      if (['for', 'read', 'mapfile', 'readarray', 'printf', 'eval', 'select', 'getopts', 'unset', 'source', '.', 'while', 'until'].includes(first)) vars.clear()
      if (['export', 'declare', 'local', 'readonly', 'typeset'].includes(first)) {
        ws = ws.slice(1).filter((w) => !w.text.startsWith('-'))
        if (cmd.words.slice(1).some((w) => /^-[A-Za-z]*[anAi]/.test(w.text))) vars.clear()
      }
      if (ws.length && ws.every((w) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(w.text))) {
        for (const w of ws) {
          const m = w.text.match(/^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)$/)
          vars.set(m[1], w.dyn || m[2].startsWith('(') ? undefined : m[2])
        }
      }
      out.push(cmd)
      lastWasPipe = pipe ? cmd : null
    } else if (!pipe) lastWasPipe = null
    cmd = newCmd()
  }
  function readHeredocs() {
    while (pendingHeredocs.length) {
      const r = pendingHeredocs.shift()
      const delim = r.target.text
      const strip = r.op === '<<-'
      let body = ''
      while (i < n) {
        let j = src.indexOf('\n', i)
        if (j === -1) j = n
        let line = src.slice(i, j)
        i = j + 1
        const cmp = strip ? line.replace(/^\t+/, '') : line
        if (cmp === delim) break
        body += line + '\n'
      }
      r.body = body
      // Unquoted delimiter: the shell expands $(...) and `...` in the body.
      if (!r.target.quoted && /\$\(|`/.test(body)) subsIn(body)
    }
  }

  while (i < n) {
    checkTime()
    const c = src[i]
    if (c === '\n') {
      endCmd()
      i++
      readHeredocs()
      continue
    }
    if (isSpace(c)) { endWord(); i++; continue }
    if (c === '#' && !word) { const j = src.indexOf('\n', i); i = j === -1 ? n : j; continue }
    if (c === ';') { endCmd(); i++; if (src[i] === ';') i++; continue }
    if (c === '&') {
      if (src[i + 1] === '&') { endCmd(); i += 2; continue }
      if (src[i + 1] === '>') { endWord(); pendingRedir = src[i + 2] === '>' ? '&>>' : '&>'; i += pendingRedir.length; continue }
      endCmd(); i++; continue
    }
    if (c === '|') {
      if (src[i + 1] === '|') { endCmd(); i += 2; continue }
      endCmd(true); i += src[i + 1] === '&' ? 2 : 1; continue
    }
    if (c === '(' && !word) {
      i++
      const inner = readUntilClose('(', ')')
      endCmd()
      for (const sc of parseShell(inner, vars, env)) out.push(sc)
      continue
    }
    if (c === ')' ) { endCmd(); i++; continue }
    if ((c === '{' || c === '}') && !word && (isSpace(src[i + 1] ?? ' ') || src[i + 1] === '\n' || src[i + 1] === undefined || c === '}')) {
      if (c === '}') endCmd()
      i++; continue
    }
    if (c === '<' || c === '>') {
      // fd prefix like 2> or 1>&2
      if (word && /^[0-9]+$/.test(word.text) && !word.quoted && !word.dyn) word = null
      else endWord()
      if (c === '<' && src[i + 1] === '(') { // process substitution
        i += 2
        const inner = readUntilClose('(', ')')
        for (const sc of parseShell(inner, new Map(vars), env)) { sc.sub = true; out.push(sc) }
        word = newWord(); word.dyn = true; word.text = '<(…)'
        continue
      }
      if (c === '>' && src[i + 1] === '(') {
        i += 2
        const inner = readUntilClose('(', ')')
        for (const sc of parseShell(inner, new Map(vars), env)) { sc.sub = true; out.push(sc) }
        continue
      }
      let op = c
      if (c === '<' && src.startsWith('<<<', i)) op = '<<<'
      else if (c === '<' && src.startsWith('<<-', i)) op = '<<-'
      else if (c === '<' && src.startsWith('<<', i)) op = '<<'
      else if (c === '<' && src.startsWith('<&', i)) op = '<&'
      else if (c === '<' && src.startsWith('<>', i)) op = '<>'
      else if (c === '>' && src.startsWith('>>', i)) op = '>>'
      else if (c === '>' && src.startsWith('>&', i)) op = '>&'
      else if (c === '>' && src.startsWith('>|', i)) op = '>|'
      i += op.length
      pendingRedir = op
      if ((op === '>&' || op === '<&') && /[0-9-]/.test(src[i] ?? '')) { while (/[0-9-]/.test(src[i] ?? '')) i++; pendingRedir = null }
      continue
    }
    if (!word) word = newWord()
    if (c === '\\') {
      if (src[i + 1] === '\n') { i += 2; continue }
      word.text += src[i + 1] ?? ''; word.quoted = true; i += 2; continue
    }
    if (c === "'") {
      const j = src.indexOf("'", i + 1)
      word.text += src.slice(i + 1, j === -1 ? n : j); word.quoted = true
      i = j === -1 ? n : j + 1; continue
    }
    if (c === '"') {
      i++; word.quoted = true
      while (i < n && src[i] !== '"') {
        const d = src[i]
        if (d === '\\' && /[$`"\\\n]/.test(src[i + 1] ?? '')) { if (src[i + 1] !== '\n') word.text += src[i + 1]; i += 2; continue }
        if (d === '$') { readDollar(word, true); continue }
        if (d === '`') {
          const j = src.indexOf('`', i + 1)
          const inner = src.slice(i + 1, j === -1 ? n : j)
          for (const sc of parseShell(inner, new Map(vars), env)) { sc.sub = true; out.push(sc) }
          word.dyn = true; word.text += '`…`'; i = j === -1 ? n : j + 1; continue
        }
        word.text += d; i++
      }
      i++; continue
    }
    if (c === '$') { readDollar(word, false); continue }
    if (c === '`') {
      const j = src.indexOf('`', i + 1)
      const inner = src.slice(i + 1, j === -1 ? n : j)
      for (const sc of parseShell(inner, new Map(vars), env)) { sc.sub = true; out.push(sc) }
      word.dyn = true; word.text += '`…`'; i = j === -1 ? n : j + 1; continue
    }
    if (c === '*' || c === '?' || c === '[') word.glob = true
    if (c === '{') word.brace = true
    if (c === '~' && word.text === '' ) { word.text += os.homedir(); i++; continue }
    word.text += c; i++
  }
  endCmd()
  readHeredocs()
  return out
}

// Brace expansion of unquoted {a,b} groups (one level, capped).
function expandBraces(w) {
  if (!w.brace || w.quoted) return [w]
  let results = [w.text]
  for (let k = 0; k < 4; k++) {
    const next = []
    let changed = false
    for (const t of results) {
      const m = t.match(/\{([^{}]*,[^{}]*)\}/)
      if (!m) { next.push(t); continue }
      changed = true
      for (const alt of m[1].split(',')) next.push(t.slice(0, m.index) + alt + t.slice(m.index + m[0].length))
    }
    results = next.slice(0, 64)
    if (!changed) break
  }
  return results.filter((t) => t !== '').map((t) => ({ ...w, text: t, brace: false }))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const base = (t) => (t || '').replace(/\/+$/, '').split('/').pop()
const lower = (s) => (s || '').toLowerCase()

const ENV_OK = /^\.env\.(example|sample|template|dist|defaults)$/i
function isSecretPath(t) {
  if (!t) return false
  let p = t
  const eq = p.indexOf('=')
  if (p.startsWith('-') && eq !== -1) p = p.slice(eq + 1) // --env-file=.env.local
  if (/^[A-Za-z]+=/.test(p) && !p.startsWith('.')) p = p.slice(p.indexOf('=') + 1) // if=.env.local
  if (p.includes(':') && !p.startsWith('/') && !/^[a-z]+:\/\//i.test(p)) p = p.slice(p.lastIndexOf(':') + 1) // HEAD:.env.local
  const b = base(p)
  if (/^\.env(\..+)?$/i.test(b) && !ENV_OK.test(b)) return true
  if (/^\.envrc$/i.test(b)) return true
  if (/(^|\/)\.aws\/(credentials|config)$/.test(p)) return true
  if (/(^|\/)\.aws\/(sso|cli)\/cache\//.test(p) || /(^|\/)\.amplify\//.test(p)) return true
  if (/^(team-provider-info\.json|keystore\.properties|local\.properties)$/.test(b)) return true
  if (/(^|\/)\.gradle\/gradle\.properties$/.test(p)) return true
  if (/(^|\/)\.config\/gh\/hosts\.ya?ml$/.test(p)) return true
  if (/(^|\/)\.(npmrc|netrc|pgpass|git-credentials)$/.test(p)) return true
  if (/\.(pem|p12|pfx|jks|keystore)$/i.test(b)) return true
  if (/^id_(rsa|ed25519|ecdsa|dsa)$/.test(b)) return true
  return false
}
function isSecretGlob(t) {
  const p = t.includes('=') && t.startsWith('-') ? t.slice(t.indexOf('=') + 1) : t
  const b = base(p)
  if (!/[*?[]/.test(b) || !/^\.(e|\[|\*|\?)/i.test(b) || b.length > 40) return false
  let src = ''
  for (let k = 0; k < b.length; k++) {
    const c = b[k]
    if (c === '*') src += '.*'
    else if (c === '?') src += '.'
    else if (c === '[') {
      const close = b.indexOf(']', k + 1)
      if (close === -1) { src += '\\['; continue }
      src += '[' + b.slice(k + 1, close).replace(/[\\^\]]/g, '\\$&').replace(/^!/, '^') + ']'
      k = close
    } else src += c.replace(/[.+^${}()|\\\]]/g, '\\$&')
  }
  let re
  try { re = new RegExp('^' + src + '$', 'i') } catch { return false }
  return ['.env', '.env.local', '.env.production', '.envrc'].some((x) => re.test(x))
}

const GUARDED = /(^|\/)(\.claude\/?$|\.claude\/hooks(\/|$)|\.claude\/settings(\.local)?\.json$|\.claude\/racimo-harness-layer\.json$|\.claude\/evidence\/[^/]+\/(pids|[^/]+\.pid|android-(serial|package))$|\.git\/(config|hooks)(\/|$))/
const isGuardedPath = (t) => GUARDED.test(t || '')

function readFileSafe(p) {
  try {
    const st = fs.statSync(p)
    if (!st.isFile()) return null
    if (st.size > MAX_FILE_BYTES) return { tooBig: true }
    return { text: fs.readFileSync(p, 'utf8') }
  } catch { return null }
}

function resolvePath(ctx, p) {
  if (!p) return p
  if (p.startsWith('~')) p = os.homedir() + p.slice(1)
  return path.isAbsolute(p) ? p : path.join(ctx.cwd, p)
}

function pidIsOurs(ctx, pid) {
  // Only the PIDs of this worktree (CLAUDE_PROJECT_DIR may be the main checkout).
  const dirs = new Set([ctx.cwd])
  const top = gitOut(ctx.cwd, ['rev-parse', '--show-toplevel'])
  if (top) dirs.add(top)
  for (const d of dirs) {
    if (!d) continue
    const evd = path.join(d, '.claude', 'evidence')
    let entries = []
    try { entries = fs.readdirSync(evd) } catch { continue }
    for (const e of entries) {
      try {
        const lines = fs.readFileSync(path.join(evd, e, 'pids'), 'utf8').split('\n').map((s) => s.trim())
        if (lines.includes(String(pid))) return true
      } catch { /* no pids file */ }
    }
  }
  return false
}

// git lookups are cached per directory: a long script must not spawn git
// once per mention.
const gitCache = new Map()
function gitOut(dir, args) {
  const key = `${dir}\0${args.join(' ')}`
  if (!gitCache.has(key)) {
    const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', timeout: 2000 })
    gitCache.set(key, r.status === 0 ? r.stdout.trim() : null)
  }
  return gitCache.get(key)
}
function currentBranch(dir) { return gitOut(dir, ['symbolic-ref', '--quiet', '--short', 'HEAD']) }

// ---------------------------------------------------------------------------
// Command analysis
// ---------------------------------------------------------------------------

// Text-valued options whose content is a message, not something to run.
const TEXT_OPTS = new Set(['-m', '--message', '-t', '--title', '-b', '--body', '--description', '--subject'])

const READERS = new Set(['cat', 'less', 'more', 'head', 'tail', 'bat', 'grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack', 'awk', 'gawk', 'sed', 'cut', 'sort', 'uniq', 'strings', 'xxd', 'od', 'hexdump', 'base64', 'diff', 'cmp', 'comm', 'jq', 'yq', 'nl', 'tee', 'dd', 'open', 'vi', 'vim', 'nvim', 'nano', 'emacs', 'code', 'source', '.', 'python', 'python3', 'node', 'ruby', 'perl', 'php', 'deno', 'bun', 'paste', 'column', 'fold', 'rev', 'tac', 'iconv', 'xargs', 'pbcopy', 'curl', 'wget', 'scp', 'rsync', 'zip', 'tar', 'gzip', 'openssl', 'gpg', 'sops', 'dotenv', 'env-cmd'])
const SAFE_WITH_SECRET = new Set(['ls', 'test', '[', '[[', 'rm', 'stat', 'touch', 'chmod', 'unlink', 'file'])

const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'fish', 'csh', 'tcsh'])
const SCRIPT_RUNNERS = new Set(['node', 'python', 'python3', 'ruby', 'perl', 'php', 'deno', 'tsx', 'ts-node', 'zx', 'osascript', 'pwsh', 'powershell', 'expect', 'awk', 'gawk', 'nawk'])
const BANNED_ENV = /^(GIT_CONFIG.*|GIT_SSH_COMMAND|GIT_SSH|GIT_EXEC_PATH|GIT_ASKPASS|SSH_ASKPASS|GIT_PROXY_COMMAND|GIT_EXTERNAL_DIFF|GIT_EDITOR|GIT_SEQUENCE_EDITOR|GIT_PAGER|GIT_TEMPLATE_DIR|GIT_DIR|GIT_WORK_TREE|BASH_ENV|ENV|ZDOTDIR|PROMPT_COMMAND|LD_PRELOAD|LD_LIBRARY_PATH|DYLD_.*|NODE_OPTIONS|NODE_PATH|npm_config_.*|NPM_CONFIG_.*|RACIMO_HARNESS_SANDBOX|GH_HOST|GH_TOKEN|GITHUB_TOKEN|GH_ENTERPRISE_TOKEN|GH_CONFIG_DIR|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN)$/
// npx/pnpx package -> the binary it runs. Scoped packages must be listed:
// without an entry the scope is dropped (@aws-amplify/cli would become cli).
const NPX_BIN = { '@aws-amplify/cli': 'amplify', '@aws-amplify/cli-internal': 'amplify', '@aws-amplify/backend-cli': 'ampx', 'aws-cdk': 'cdk', 'eas-cli': 'eas', 'netlify-cli': 'netlify', 'firebase-tools': 'firebase', 'serverless': 'serverless', 'vercel': 'vercel', 'dotenv-cli': 'dotenv', '@dotenvx/dotenvx': 'dotenvx', 'kill-port': 'kill-port', 'fkill-cli': 'fkill' }
const npxBin = (spec) => { const pkg = spec.replace(/(.)@[^/@]*$/, '$1'); return NPX_BIN[pkg] ?? pkg.replace(/^@[^/]+\//, '') }

// Files a command line writes before running something: path -> content
// (a heredoc written with cat) or null (changed in a way the guard cannot
// see). Running one of them in the same command line is judged on that.
function recordWrites(c, cwd, written) {
  const words = c.words.map((w) => w.text)
  const name = lower(base(words[0] ?? ''))
  const mark = (t, content = null) => { if (t && !t.startsWith('/dev/')) written.set(resolvePath({ cwd }, t), content) }
  for (const r of c.redirs) {
    if (!/^(>|>>|>\||&>|&>>)$/.test(r.op)) continue
    if (r.target.dyn) continue
    const heredoc = c.redirs.find((x) => x.op === '<<' || x.op === '<<-')
    mark(r.target.text, r.op === '>' && name === 'cat' && heredoc && words.length === 1 ? heredoc.body ?? '' : null)
  }
  if (name === 'tee') for (const t of words.slice(1)) if (!t.startsWith('-')) mark(t)
  if ((name === 'sed' || name === 'perl') && words.some((t) => /^-i/.test(t) || t === '--in-place')) for (const t of words.slice(1)) if (!t.startsWith('-') && /[./]/.test(t)) mark(t)
  if (['cp', 'mv', 'ln', 'install', 'rsync'].includes(name) && words.length > 2) mark(words.at(-1))
  if (['npm', 'pnpm', 'yarn'].includes(name) && words.includes('pkg')) mark('package.json')
}

export function analyze(text, ctx) {
  const cmds = parseShell(text, ctx.vars ?? new Map(), ctx.env)
  let cwd = ctx.cwd
  let cwdKnown = ctx.cwdKnown !== false
  let branchChanged = ctx.branchChanged === true
  const written = ctx.written ?? new Map()
  for (const c of cmds) {
    if (Date.now() - START > DEADLINE_MS) deny('el comando es demasiado largo para revisarlo antes del tiempo límite del hook', 'Divídelo en comandos más cortos')
    analyzeCommand(c, { ...ctx, cwd, cwdKnown, written, branchChanged })
    recordWrites(c, cwd, written)
    const ws = c.words.map((w) => w.text)
    const wsi = ws.findIndex((t) => base(t) === 'git' || base(t) === 'gh')
    if (wsi !== -1 && ((base(ws[wsi]) === 'git' && /^(checkout|switch)$/.test(ws.slice(wsi + 1).find((t) => !t.startsWith('-') && !/^(-C|-c)$/.test(t)) ?? '') && !ws.includes('--')) || (base(ws[wsi]) === 'gh' && ws.includes('checkout')))) branchChanged = true
    // Follow cd/pushd with a literal directory for the next commands.
    const w0 = c.words[0]?.text
    if ((w0 === 'cd' || w0 === 'pushd') && !c.words[0].quoted) {
      const arg = c.words.slice(1).find((w) => !w.text.startsWith('-') || w.text === '-')
      if (!arg) cwd = os.homedir()
      else if (arg.dyn || arg.text === '-') cwdKnown = false
      else cwd = resolvePath({ cwd }, arg.text)
    }
    if (w0 === 'popd') cwdKnown = false
  }
}

function stdinText(cmd, ctx) {
  for (const r of cmd.redirs) {
    if (r.op === '<<' || r.op === '<<-') return { text: r.body ?? '' }
    if (r.op === '<<<') return { text: r.target.text, dyn: r.target.dyn }
    if (r.op === '<') {
      if (r.target.dyn) return { dyn: true }
      const f = readFileSafe(resolvePath(ctx, r.target.text))
      return f && !f.tooBig ? { text: f.text, file: r.target.text } : { missing: r.target.text }
    }
  }
  if (cmd.pipeIn) {
    const p = cmd.pipeIn
    const pw = p.words.map((w) => w.text)
    const pname = base(pw[0])
    if ((pname === 'echo' || pname === 'printf') && !p.words.some((w) => w.dyn)) return { text: pw.slice(1).join(' ') }
    if (pname === 'cat' && pw.length === 2 && !p.words[1].dyn) {
      const f = readFileSafe(resolvePath(ctx, pw[1]))
      return f && !f.tooBig ? { text: f.text } : { missing: pw[1] }
    }
    if (pname === 'cat' && pw.length === 1) return stdinText(p, ctx)
    return { dyn: true }
  }
  return null
}

function checkDeadline() {
  if (Date.now() - START > DEADLINE_MS) deny('el comando es demasiado largo para revisarlo antes del tiempo límite del hook', 'Divídelo en comandos más cortos o en un script más chico')
}

function analyzeCommand(cmd, ctx) {
  checkDeadline()
  let words = cmd.words.flatMap(expandBraces)
  const live = ctx.mode === 'live'

  // Redirections: reading secrets or writing the guard and its settings.
  for (const r of cmd.redirs) {
    const t = r.target.text
    if ((r.op === '<' || r.op === '<>') && (isSecretPath(t) || isSecretGlob(t))) deny(`lee un archivo con secretos (${t})`, 'Nunca leas ni cites .env* ni credenciales; usa .env.example')
    if (/^(>|>>|>\||&>|&>>|<>)$/.test(r.op) && isGuardedPath(t) && (live || !r.target.dyn)) deny(`escribe sobre el guard o la configuración de Claude Code (${t})`, 'La capa del harness se cambia con un PR en racimo-harness y sync-repo-layer.sh')
  }

  // Shell keywords and zsh precommand modifiers in front of a command.
  while (words.length && ['if', 'then', 'else', 'elif', 'do', 'while', 'until', '!', 'fi', 'done', 'esac', '{', '}', 'noglob', 'nocorrect', '-', 'coproc'].includes(words[0].text) && !words[0].quoted) words = words.slice(1)
  if (words[0]?.text === 'repeat' && !words[0].quoted) words = words.slice(2)
  // zsh "=prog" expands to the path of prog.
  if (words[0] && /^=[A-Za-z]/.test(words[0].text) && !words[0].quoted) words = [{ ...words[0], text: words[0].text.slice(1) }, ...words.slice(1)]
  if (!words.length) return
  // for/select/case headers only list words; the loop body is parsed as its own commands.
  if (['for', 'select'].includes(words[0].text) && !words[0].quoted && words.some((w) => isSecretPath(w.text) || isSecretGlob(w.text))) deny('recorre archivos de secretos', 'Nunca leas .env* ni credenciales')
  if (['for', 'select', 'case', 'function'].includes(words[0].text) && !words[0].quoted) return

  // Leading assignments (and export/declare...): variables that make git, gh,
  // node or the shell run other programs or use other credentials.
  const checkAssignment = (text) => {
    const name = text.split('=')[0]
    const value = text.slice(name.length + 1)
    if (name === 'NODE_OPTIONS' && /^(\s*--(max-old-space-size|stack-size)=\d+|\s*--(enable-source-maps|no-warnings|trace-warnings|no-deprecation))+\s*$/.test(value)) return
    if (BANNED_ENV.test(name)) deny(`define ${name}, que cambia cómo se comportan git, gh, node o el shell`, 'Ejecuta el comando sin esa variable')
  }
  let k = 0
  while (k < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[k].text) && !words[k].text.startsWith('=')) {
    checkAssignment(words[k].text)
    k++
  }
  if (['export', 'declare', 'typeset', 'local', 'readonly'].includes(words[k]?.text)) {
    for (const w of words.slice(k + 1)) if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w.text)) checkAssignment(w.text)
    return
  }
  words = words.slice(k)
  if (!words.length) return

  // Unwrap wrappers.
  for (let guard = 0; guard < 12 && words.length; guard++) {
    const name = lower(base(words[0].text))
    const rest = words.slice(1)
    const skipOpts = (ws, withValue = new Set()) => {
      let j = 0
      while (j < ws.length && ws[j].text.startsWith('-') && ws[j].text !== '--') { if (withValue.has(ws[j].text)) j++; j++ }
      if (ws[j]?.text === '--') j++
      return ws.slice(j)
    }
    if (name === 'sudo' || name === 'doas') { words = skipOpts(rest, new Set(['-u', '-g', '-h', '-p', '-C', '-U', '-r', '-t'])); continue }
    if (name === 'env') {
      let ws = rest
      while (ws.length) {
        const t = ws[0].text
        if (t === '-S' || t === '--split-string') { analyze(ws.slice(1).map((w) => w.text).join(' '), { ...ctx, depth: ctx.depth + 1 }); return }
        if (/^-S./.test(t) || t.startsWith('--split-string=')) { analyze([t.replace(/^(-S|--split-string=)/, ''), ...ws.slice(1).map((w) => w.text)].join(' '), { ...ctx, depth: ctx.depth + 1 }); return }
        if (t === '-u' || t === '-C' || t === '-P' || t === '--unset' || t === '--chdir') { ws = ws.slice(2); continue }
        if (t.startsWith('-')) { ws = ws.slice(1); continue }
        if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)) {
          const nm = t.split('=')[0]
          checkAssignment(t)
          ws = ws.slice(1); continue
        }
        break
      }
      words = ws; continue
    }
    // Wrappers that run the rest as a command, with the options of each one
    // that take a value (from their real getopt).
    const WRAPPER_VALUE_OPTS = {
      command: [], builtin: [], nohup: [], time: [], unbuffer: [], taskpolicy: ['-c', '-d', '-g', '-t', '-l'],
      caffeinate: ['-t', '-w'], stdbuf: ['-i', '-o', '-e'], nice: ['-n'], ionice: ['-c', '-n', '-p'], chrt: [],
      arch: ['-arch'], exec: ['-a'],
    }
    if (name in WRAPPER_VALUE_OPTS) {
      if (name === 'command' && rest.some((w) => w.text === '-v' || w.text === '-V')) return
      words = skipOpts(rest, new Set(WRAPPER_VALUE_OPTS[name]))
      if (name === 'arch' && words[0] && /^-/.test(words[0].text)) words = words.slice(1)
      continue
    }
    if (name === 'trap') { const code = rest.find((w) => !w.text.startsWith('-')); if (code && !code.dyn) analyze(code.text, { ...ctx, depth: ctx.depth + 1 }); else if (code && live) unverifiable('trap con código que sale de una variable', ''); return }
    if (name === 'alias') { for (const w of rest) { const eq = w.text.indexOf('='); if (eq > 0) { if (w.dyn && live) unverifiable('alias con un valor que sale de una variable', ''); analyze(w.text.slice(eq + 1), { ...ctx, depth: ctx.depth + 1 }) } } return }
    if (name === 'timeout' || name === 'gtimeout') { const ws = skipOpts(rest, new Set(['-s', '-k', '--signal', '--kill-after'])); words = ws.slice(1); continue }
    if (name === 'watch') { const ws = skipOpts(rest, new Set(['-n', '--interval', '-d'])); analyze(ws.map((w) => w.text).join(' '), { ...ctx, depth: ctx.depth + 1 }); return }
    if (name === 'script') { const ws = skipOpts(rest, new Set(['-t', '-T'])); words = ws.slice(1); continue }
    if (ctx.agent && ['claude', 'codex', 'aider', 'gemini', 'cursor-agent', 'opencode'].includes(name) && !(name === 'claude' && (['--version', '-v'].includes(rest[0]?.text) || (rest[0]?.text === 'plugin' && rest[1]?.text === 'validate')))) deny(`un agente no lanza otra sesión de agente (${name}): la sesión hija no tendría el contexto de agente`, 'Hazlo en esta sesión o pídelo en el issue')
    if (name === 'dotenvx') deny('dotenvx carga o descifra archivos .env', 'Nunca leas .env*')
    if (name === 'aws-vault' || name === 'granted' || name === 'assume' || name === 'op' || name === 'dotenv' || name === 'env-cmd' || name === 'with-contenv') {
      if (name === 'dotenv' || name === 'env-cmd') {
        for (let j = 0; j < rest.length; j++) if ((rest[j].text === '-e' || rest[j].text === '-f') && isSecretPath(rest[j + 1]?.text)) deny(`carga un archivo de secretos (${rest[j + 1].text})`, 'Nunca leas .env*')
        if (!rest.some((w) => w.text.startsWith('-e') || w.text.startsWith('-f'))) deny('carga variables desde .env', 'Nunca leas .env*')
      }
      const sep = rest.findIndex((w) => w.text === '--')
      if (sep === -1 && name === 'aws-vault' && rest[0]?.text === 'exec') {
        // aws-vault exec [opts] <profile> <cmd...>
        const pos = rest.slice(1).filter((w, q, a) => !w.text.startsWith('-') && !(q > 0 && /^--(duration|region|mfa-token|prompt|backend)$/.test(a[q - 1].text)))
        if (pos.length > 1) { words = rest.slice(rest.indexOf(pos[1])); continue }
        return
      }
      if (sep === -1) { if (live && name === 'op') deny('op lee secretos de 1Password', ''); if (live && ['granted', 'assume'].includes(name) && rest.some((w) => /^--?(exec|x)$/.test(w.text))) unverifiable(`${name} --exec ejecuta un comando que el guard no revisa`, 'Usa aws-vault exec <perfil> -- <comando>'); return }
      words = rest.slice(sep + 1); continue
    }
    if (name === 'xargs') {
      for (let q = 0; q < rest.length; q++) if ((rest[q].text === '-a' || rest[q].text === '--arg-file') && (isSecretPath(rest[q + 1]?.text) || isSecretGlob(rest[q + 1]?.text ?? ''))) deny('xargs lee un archivo de secretos', 'Nunca leas .env*')
      let j = 0
      const withValue = new Set(['-n', '-I', '-i', '-L', '-l', '-P', '-d', '-E', '-e', '-s', '-a', '-J', '-R', '-S', '--max-args', '--replace', '--max-procs', '--delimiter', '--arg-file'])
      while (j < rest.length && rest[j].text.startsWith('-')) { if (withValue.has(rest[j].text)) j++; j++ }
      words = rest.slice(j)
      if (!words.length) return
      ctx = { ...ctx, appended: true }
      continue
    }
    if (name === 'bundle' && rest[0]?.text === 'exec') { words = rest.slice(1); continue }
    if (name === 'parallel') { deny('parallel ejecuta comandos que el guard no puede revisar', 'Ejecuta los comandos uno por uno'); }
    if (name === 'npx' || name === 'pnpx' || name === 'bunx') {
      let ws = rest
      while (ws.length && ws[0].text.startsWith('-') && !['-c', '--call'].includes(ws[0].text)) { if (ws[0].text === '-p' || ws[0].text === '--package') ws = ws.slice(1); ws = ws.slice(1) }
      if (!ws.length) return
      if (ws[0].text === '-c' || ws[0].text === '--call') { const code = ws[1]; if (code?.dyn && live) unverifiable(`${name} -c con código que sale de una variable`, ''); if (code) analyze(code.text, { ...ctx, depth: ctx.depth + 1 }); return }
      ws = [{ ...ws[0], text: npxBin(ws[0].text) }, ...ws.slice(1)]
      words = ws; continue
    }
    if (name === 'find') {
      const texts = rest.map((w) => w.text)
      const looksForSecrets = texts.some((t, j) => /^-(i?name|i?path|regex)$/.test(texts[j - 1] ?? '') && (isSecretPath(t) || isSecretGlob(t) || /\.env|envrc|credentials/.test(t)))
      if (looksForSecrets && texts.some((t) => /^-(exec|execdir|ok|okdir|fprint|print0)$/.test(t))) deny('find busca archivos de secretos para leerlos o pasarlos a otro programa', 'Nunca leas .env* ni credenciales')
      for (let j = 0; j < texts.length; j++) {
        if (/^-(exec|execdir|ok|okdir)$/.test(texts[j])) {
          let e = j + 1
          while (e < texts.length && texts[e] !== ';' && texts[e] !== '+') e++
          analyzeCommand({ ...cmd, words: rest.slice(j + 1, e), redirs: [], pipeIn: null }, { ...ctx, appended: true })
          j = e
        }
        if (texts[j] === '-delete' && live) { /* deleting is local; allowed */ }
      }
      return
    }
    break
  }
  if (!words.length) return
  const argv = words.map((w) => w.text)
  const name = lower(base(argv[0]))

  // Command name from a variable, a substitution or a glob.
  if (words[0].dyn) {
    if (live) unverifiable(`el nombre del comando sale de una variable o de $(...) (${argv[0]}), así que no se puede revisar`, 'Escribe el comando directamente')
    return
  }
  if (live && words[0].fromVar) deny(`el nombre del comando sale de una variable (${argv[0]})`, 'Escribe el comando directamente')
  if (live && words[0].glob && !['[', '[['].includes(argv[0])) deny(`el nombre del comando tiene comodines (${argv[0]}) y el shell lo expande a otro programa`, 'Escribe el nombre exacto del programa')

  // Universal: secrets and the guard's own files.
  checkSecretArgs(name, words, ctx)
  checkGuardedArgs(name, words, ctx)

  // Interpreters and script execution.
  if (SHELLS.has(name)) return checkShell(cmd, words, ctx)
  if (name === 'source' || name === '.') return inspectShellFile(words[1], ctx, 'source')
  if (name === 'eval') {
    if (words.slice(1).some((w) => w.dyn)) deny('eval ejecuta texto que el guard no puede revisar', 'Escribe el comando directamente')
    return analyze(argv.slice(1).join(' '), { ...ctx, depth: ctx.depth + 1 })
  }
  if (SCRIPT_RUNNERS.has(name)) return checkScriptRunner(name, cmd, words, ctx)
  if (argv[0].includes('/') && !['/usr/bin', '/bin', '/usr/local/bin', '/opt/homebrew/bin', '/usr/sbin', '/sbin'].includes(path.dirname(path.normalize(argv[0])))) {
    // ./script.sh or a path to a program: inspect the file, then apply the
    // rules of its name too (node_modules/.bin/ampx is still ampx).
    if (base(argv[0]) === 'serve.sh') checkServeArgs(words, ctx)
    const res = inspectScriptFile(words[0], ctx, words.slice(1))
    if (res === 'missing' && live && /\.(sh|bash|zsh)$/.test(argv[0])) unverifiable(`no puedo revisar ${argv[0]}: no existe todavía`, 'Crea el archivo primero y ejecútalo en otro comando')
  }

  switch (name) {
    case 'gh': return checkGh(words, cmd, ctx)
    case 'git': return checkGit(words, ctx)
    case 'aws': return checkAws(words, ctx)
    case 'curl': case 'wget': case 'http': case 'https': case 'xh':
      if (argv.some((a) => /api\.github\.com|github\.com\/api\/graphql/i.test(a))) deny('llama a la API de GitHub sin gh', 'Usa gh api, que este guard puede revisar')
      return
    case 'npm': case 'pnpm': case 'yarn': case 'bun': return checkPackageManager(name, words, ctx)
    case 'make': case 'just': case 'task':
      if (argv.slice(1).some((a) => /^(deploy|publish|release|push)(:|$)/.test(a))) deny(`${name} ${argv.slice(1).join(' ')} parece un despliegue o una publicación`, 'Los despliegues los hace una persona')
      return
  }
  checkDeploy(name, argv, ctx)
  checkProcess(name, argv, words, ctx)
  if (live) checkGrep(name, argv, ctx)
}

function checkSecretArgs(name, words, ctx) {
  const argv = words.map((w) => w.text)
  if (name === 'git' && ['check-ignore', 'ls-files', 'status', 'rm', 'grep', 'mv', 'clean', 'stash'].includes(argv[1])) {
    if (argv[1] === 'mv' && words.slice(2, -1).some((w) => isSecretPath(w.text))) deny('mueve un archivo de secretos', '')
    return
  }
  let skipNext = false
  let patternSkipped = !['grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack'].includes(name)
  const hits = []
  for (let j = 1; j < words.length; j++) {
    const t = words[j].text
    if (skipNext) { skipNext = false; continue }
    if (TEXT_OPTS.has(t) && (name === 'git' || name === 'gh')) { skipNext = true; continue }
    if (/^--(exclude|include|glob|exclude-dir|iglob)(=|$)/.test(t) || t === '-g') { if (!t.includes('=')) skipNext = true; continue }
    if (!patternSkipped && !t.startsWith('-')) { patternSkipped = true; continue }
    if (t === '-e' && !patternSkipped) { patternSkipped = true; skipNext = true; continue }
    if (isSecretPath(t) || isSecretGlob(t)) hits.push({ t, j })
  }
  if (!hits.length) return
  if (SAFE_WITH_SECRET.has(name) || (name === '[' || name === 'test')) return
  if (['cp', 'mv', 'ln', 'rsync', 'install', 'ditto'].includes(name)) {
    const last = words.length - 1
    if (hits.some((h) => h.j !== last)) deny(`copia o mueve un archivo de secretos (${hits[0].t})`, 'Los .env no se copian a otras rutas; solo .env.example')
    return
  }
  if (name === 'git' && argv[1] === 'add') deny('git add de un archivo .env o de credenciales puede versionar secretos', 'Los .env no se versionan (solo .env.example sin valores)')
  deny(`lee o procesa un archivo con secretos (${hits[0].t})`, "Nunca leas ni cites .env* ni credenciales; usa .env.example. Para buscar en el repo, excluye esos archivos (grep --exclude='.env*' o git diff -- . ':!.env*')")
}

const GUARD_READERS = new Set(['cat', 'less', 'more', 'head', 'tail', 'grep', 'rg', 'ls', 'stat', 'file', 'wc', 'diff', 'cmp', 'shasum', 'md5', 'sha256sum', 'test', '[', '[[', 'bash', 'sh', 'node', 'jq', 'awk', 'cd', 'pushd', 'du', 'tree', 'realpath', 'readlink', 'echo', 'printf', 'basename', 'dirname'])
function checkGuardedArgs(name, words, ctx) {
  const argv = words.map((w) => w.text)
  // Inside scripts, paths built from variables (sync-repo-layer.sh writing a
  // clone) are not judged; literal paths always are.
  const touched = words.slice(1).filter((w) => (ctx.mode === 'live' || !w.dyn) && isGuardedPath(w.text.replace(/^.*=/, ''))).map((w) => w.text)
  if (!touched.length) return
  if (name === 'git' && ['diff', 'log', 'show', 'status', 'ls-files', 'check-ignore', 'blame', 'add', 'commit'].includes(argv[1])) return
  if (name === 'git' && ((argv[1] === 'restore' && argv.includes('--staged') && !argv.includes('--worktree')) || (argv[1] === 'reset' && !argv.some((a) => /^--(hard|merge|keep)$/.test(a))))) return
  if (name === 'jq' && !argv.includes('-i') && !argv.includes('--in-place')) return
  if (name === 'sed' && !argv.some((a) => /^-i/.test(a) || a === '--in-place')) return
  if (name === 'awk' && !argv.includes('-i')) return
  if (GUARD_READERS.has(name) && name !== 'jq' && name !== 'sed' && name !== 'awk') return
  deny(`toca el guard, la configuración de Claude Code o de git (${touched[0]})`, 'La capa del harness se cambia con un PR en racimo-harness y sync-repo-layer.sh')
}

function checkShell(cmd, words, ctx) {
  const argv = words.map((w) => w.text)
  let j = 1
  let noExec = false
  while (j < argv.length && argv[j].startsWith('-')) {
    const o = argv[j]
    if (o === '-c' || (/^-[a-z]*c[a-z]*$/.test(o) && !o.startsWith('--'))) {
      let code = words[j + 1]
      if (code?.text === '--') code = words[j + 2]
      if (!code) return
      if (code.dyn && ctx.mode === 'live') deny(`${base(argv[0])} -c con un texto que sale de una variable o de $(...)`, 'Escribe el comando directamente')
      return analyze(code.text, { ...ctx, depth: ctx.depth + 1 })
    }
    if (o === '-n') noExec = true
    if (o === '-s' || o === '-') break
    if (o === '-o' || o === '+o' || o === '-O' || o === '--rcfile' || o === '--init-file') j++
    j++
  }
  if (noExec) return
  const file = words[j]
  if (!file || argv[j] === '-s' || argv[j] === '-') {
    const s = stdinText(cmd, ctx)
    if (!s || s.dyn) deny(`envía texto a un intérprete de comandos (${base(argv[0])}) que el guard no puede revisar`, 'Ejecuta el comando o un script versionado directamente')
    if (s.missing) unverifiable(`no puedo revisar ${s.missing}`, '')
    return analyze(s.text, { ...ctx, depth: ctx.depth + 1 })
  }
  if (base(file.text) === 'serve.sh') checkServeArgs(words.slice(j), ctx)
  if (base(file.text) === 'gradlew') checkDeploy('gradlew', argv.slice(j), ctx)
  return inspectShellFile(file, ctx, base(argv[0]), words.slice(j + 1))
}

// A script that runs its own arguments ("$@", exec "$@"...) runs the words
// that follow it on the command line: those are checked as a command.
const RUNS_ARGS = /(^|[\s;&|(])(exec\s+|nohup\s+|command\s+|eval\s+)?"?\$(\{?[@*]\}?|\{?1\}?)"?(\s|$)/m
function checkScriptArgs(text, args, ctx) {
  if (!args?.length || !RUNS_ARGS.test(text)) return
  const sep = args.findIndex((w) => w.text === '--')
  analyzeCommand({ words: sep === -1 ? args : args.slice(sep + 1), redirs: [], pipeIn: null }, { ...ctx, depth: ctx.depth + 1 })
}

function readForRun(word, ctx) {
  const p = resolvePath(ctx, word.text)
  if (ctx.written?.has(p)) {
    const content = ctx.written.get(p)
    if (content == null) unverifiable(`${word.text} se modifica y se ejecuta en el mismo comando, así que no se puede revisar`, 'Escríbelo en un comando y ejecútalo en otro')
    return { text: content }
  }
  return readFileSafe(p)
}

function checkServeArgs(words, ctx) {
  const sep = words.findIndex((w) => w.text === '--')
  if (sep !== -1) analyzeCommand({ words: words.slice(sep + 1), redirs: [], pipeIn: null }, { ...ctx, depth: ctx.depth + 1 })
}

// The Gradle wrapper (gradlew, Gradle 7+) ends with one eval that rebuilds
// the JVM options: its input goes through sed, which backslash-escapes every
// shell metacharacter, so it cannot run anything. That exact block (and only
// that one) is replaced with ':' and the rest of the script is still checked;
// a changed block, another eval or an older wrapper is still blocked.
const GRADLEW_EVAL = /^eval "set -- \$\(\s*printf '%s\\n' "\$DEFAULT_JVM_OPTS \$JAVA_OPTS \$GRADLE_OPTS" \|\s*xargs -n1 \|\s*sed ' s~\[\^-\[:alnum:\]\+,\.\/:=@_\]~\\\\&~g; ' \|\s*tr '\\n' ' '\s*\)" '"\$@"'[ \t]*$/m
// The escaping only holds if sed, xargs, tr and printf are the real ones and
// the options are literal: a wrapper that redefines a command, changes PATH,
// sources another file or builds DEFAULT_JVM_OPTS from $ or ` keeps its eval.
const GRADLEW_TAMPERED = /^\s*(function\s+)?(sed|xargs|tr|printf|set|eval|command|builtin|exec)\s*\(\s*\)|^\s*function\s+(sed|xargs|tr|printf|set|eval|command|builtin|exec)\b|^\s*(alias|enable|hash|source|\.)\s|(^|[\s;])(export\s+|declare\s+[-\w]*\s+|readonly\s+)?(PATH|BASH_ENV|ENV|IFS|BASH_FUNC_[\w%]*)=|^\s*DEFAULT_JVM_OPTS=.*[$`]/m
function scriptText(word, text) {
  if (base(word.text) !== 'gradlew' || !text.includes('org.gradle.wrapper.GradleWrapperMain') && !text.includes('gradle-wrapper.jar')) return text
  const hits = text.match(new RegExp(GRADLEW_EVAL.source, 'gm')) ?? []
  if (hits.length !== 1 || GRADLEW_TAMPERED.test(text)) return text
  return text.replace(GRADLEW_EVAL, ':')
}

function inspectShellFile(word, ctx, how, args = []) {
  if (!word) return
  if (word.dyn) {
    if (ctx.mode === 'live') deny(`${how} de una ruta que sale de una variable o de $(...)`, 'Escribe la ruta directamente')
    return
  }
  if (ctx.depth >= MAX_DEPTH) deny('demasiados scripts anidados para revisarlos', 'Ejecuta el script final directamente')
  if (!word.text.startsWith('/') && ctx.cwdKnown === false) unverifiable(`no sé en qué carpeta se ejecuta ${word.text} (cd a una ruta que sale de una variable)`, '')
  const f = readForRun(word, ctx)
  if (!f) unverifiable(`no puedo revisar ${word.text}: no existe o no se puede leer`, 'Crea el archivo primero y ejecútalo en otro comando')
  if (f.tooBig) deny(`${word.text} es demasiado grande para revisarlo`, '')
  analyze(scriptText(word, f.text), { ...ctx, mode: 'file', depth: ctx.depth + 1, cwd: ctx.cwd, vars: new Map() })
  checkScriptArgs(f.text, args, ctx)
}

function inspectScriptFile(word, ctx, args = []) {
  if (word.dyn) return 'dyn'
  if (!word.text.startsWith('/') && ctx.cwdKnown === false) unverifiable(`no sé en qué carpeta se ejecuta ${word.text} (cd a una ruta que sale de una variable)`, '')
  const p = resolvePath(ctx, word.text)
  const f = readForRun(word, ctx)
  if (!f) return 'missing'
  if (f.tooBig) deny(`${word.text} es demasiado grande para revisarlo`, '')
  if (ctx.depth >= MAX_DEPTH) deny('demasiados scripts anidados para revisarlos', 'Ejecuta el script final directamente')
  const first = f.text.split('\n', 1)[0]
  if (/^#!.*\b(bash|sh|zsh|dash|ksh)\b/.test(first) || /\.(sh|bash|zsh)$/.test(p)) {
    analyze(scriptText(word, f.text), { ...ctx, mode: 'file', depth: ctx.depth + 1, vars: new Map() })
    checkScriptArgs(f.text, args, ctx)
  } else looseScan(f.text, { ...ctx, mode: 'file', depth: ctx.depth + 1 })
  return 'ok'
}

function checkScriptRunner(name, cmd, words, ctx) {
  const argv = words.map((w) => w.text)
  if (name === 'awk' || name === 'gawk' || name === 'nawk') {
    const prog = words.slice(1).find((w) => !w.text.startsWith('-'))
    if (prog && /system\s*\(|\|\s*"|"\s*\|/.test(prog.text)) {
      if (prog.dyn && ctx.mode === 'live') unverifiable('awk ejecuta comandos que salen de una variable', '')
      looseScan(prog.text.replace(/system\s*\(/g, ' '), { ...ctx, depth: ctx.depth + 1 }, true)
      if (/system\s*\(\s*[A-Za-z$]/.test(prog.text) && ctx.mode === 'live') unverifiable('awk ejecuta un comando armado en tiempo de ejecución', 'Ejecuta el comando directamente')
    }
    return
  }
  if (name === 'node' && argv.includes('--run')) { const sc = argv[argv.indexOf('--run') + 1]; if (sc) { if (DEPLOY_SCRIPT.test(sc)) deny(`node --run ${sc} parece un despliegue`, ''); runPackageScript(ctx.cwd, sc, ctx) } return }
  if (name === 'deno' && (argv[1] === 'task' || argv[1] === 'eval')) {
    if (argv[1] === 'eval') { if (words[2]?.dyn && ctx.mode === 'live') unverifiable('deno eval con código que sale de una variable', ''); return looseScan(argv[2] ?? '', { ...ctx, depth: ctx.depth + 1 }, true) }
    const f = readFileSafe(path.join(ctx.cwd, 'deno.json')) ?? readFileSafe(path.join(ctx.cwd, 'deno.jsonc'))
    let tasks = {}
    try { tasks = JSON.parse(f?.text ?? '{}').tasks ?? {} } catch { if (ctx.mode === 'live') unverifiable('no puedo leer las tareas de deno', '') }
    const t = tasks[argv[2]]
    if (typeof t === 'string') analyze(t, { ...ctx, depth: ctx.depth + 1, vars: new Map() })
    else if (t && ctx.mode === 'live') unverifiable(`no puedo revisar la tarea de deno ${argv[2]}`, '')
    return
  }
  for (let j = 1; j < argv.length; j++) {
    const a = argv[j]
    // Code glued to its option: --eval=..., -e'...', -c'...', perl -E, pwsh -Command.
    const glued = a.match(/^(--eval=|--print=|-e(?=.)|-E(?=.)|-c(?=.)|-p(?=.))([\s\S]+)$/)
    if (glued && !(name === 'python' || name === 'python3') || (glued && glued[1] === '-c')) {
      if (words[j].dyn && ctx.mode === 'live') unverifiable(`${name} ejecuta código que sale de una variable`, '')
      looseScan(glued[2], { ...ctx, depth: ctx.depth + 1 }, true)
      continue
    }
    if (['-E', '-Command', '-command', '-c'].includes(a) && ['perl', 'pwsh', 'powershell', 'expect'].includes(name)) {
      const code = words[j + 1]
      if (code?.dyn && ctx.mode === 'live') unverifiable(`${name} ejecuta código que sale de una variable`, '')
      if (code) looseScan(code.text, { ...ctx, depth: ctx.depth + 1 }, true)
      j++
      continue
    }
    if (['-e', '-c', '--eval', '-p', '--print', '-r'].includes(a) || (name === 'osascript' && a === '-e')) {
      const code = words[j + 1]
      if (!code) return
      if (code.dyn && ctx.mode === 'live') deny(`${name} ejecuta código que sale de una variable o de $(...)`, 'Escribe el código en un archivo versionado')
      looseScan(code.text, { ...ctx, depth: ctx.depth + 1 }, true)
      j++
      continue
    }
    if (/^--env-file/.test(a)) continue // handled by checkSecretArgs
    if (a.startsWith('-')) { if (['-m', '--require', '--import', '--loader', '-W'].includes(a)) j++; continue }
    if (a === 'run' && (name === 'deno' || name === 'bun')) continue
    // first positional: the script; code files among the remaining
    // arguments (shots.mjs --flow flow.mjs, test runners...) are inspected too.
    if (words[j].dyn) { if (ctx.mode === 'live') deny(`${name} ejecuta un archivo que sale de una variable`, ''); return }
    for (const w of words.slice(j + 1)) {
      const t = w.text.replace(/^--?[A-Za-z-]+=/, '')
      if (!w.dyn && /\.(m?js|cjs|ts|mts|sh|py)$/.test(t)) inspectScriptFile({ ...w, text: t }, ctx)
    }
    const res = inspectScriptFile(words[j], ctx)
    if (res === 'missing' && ctx.mode === 'live' && !['tsx', 'ts-node', 'zx'].includes(name)) { /* node fails by itself */ }
    if (res === 'missing' && ctx.mode === 'live' && ['tsx', 'ts-node', 'zx'].includes(name)) unverifiable(`no puedo revisar ${a}`, '')
    return
  }
  if (!argv.slice(1).some((a) => !a.startsWith('-'))) {
    const s = stdinText(cmd, ctx)
    if (s && s.dyn && ctx.mode === 'live') deny(`envía texto a ${name} que el guard no puede revisar`, '')
    if (s && s.text) looseScan(s.text, { ...ctx, depth: ctx.depth + 1 })
  }
}

// Loose scan for code in other languages (JS, Python...): quotes and
// punctuation become spaces and every risky program name found anywhere is
// checked with the words that follow it.
const RISKY = new Set(['gh', 'git', 'aws', 'amplify', 'ampx', 'sam', 'cdk', 'serverless', 'sls', 'terraform', 'tofu', 'pulumi', 'eas', 'fastlane', 'vercel', 'netlify', 'firebase', 'kubectl', 'helm', 'pkill', 'killall', 'fuser', 'kill-port', 'docker', 'npm', 'pnpm', 'yarn'])
function looseScan(text, ctx, inline = false) {
  if (/\bmutation\b/.test(text) && /graphql/i.test(text)) checkGraphqlText(text, ctx)
  // Comment lines of JS/TS/Python/shell are text, not code.
  const code = text.split('\n').filter((l) => !/^\s*(\/\/|#|\*|\/\*)/.test(l)).join('\n')
  const flat = code.replace(/\\[nrt]/g, ' ').replace(/['"`,\[\]{}()<>;:=+]/g, ' ')
  for (const line of flat.split(/\n/)) {
    const toks = line.split(/\s+/).filter(Boolean)
    checkDeadline()
    for (let j = 0; j < toks.length; j++) {
      // Inline code (-c/-e) that names a secrets file reads it.
      if (inline && isGuardedPath(toks[j])) deny(`el código en línea toca el guard, la configuración de Claude Code o de git (${toks[j]})`, 'La capa del harness se cambia con un PR en racimo-harness')
      if (inline && (isSecretPath(toks[j]) || isSecretPath(toks[j].replace(/^\.+(?=\.env)/, '')))) deny(`el código en línea usa un archivo con secretos (${toks[j]})`, 'Nunca leas .env* ni credenciales')
      const b = lower(base(toks[j]))
      if (!RISKY.has(b)) continue
      const ws = toks.slice(j, j + 12).map((t) => ({ text: t, dyn: false, glob: false, brace: false, quoted: false }))
      const c = { words: ws, redirs: [], pipeIn: null }
      try { analyzeCommand(c, { ...ctx, mode: 'loose' }) } catch (e) {
        // Words cut out of code are not real commands: only the denies that
        // say "this cannot be read" are tolerated; every rule deny stands.
        if (!(e instanceof Deny) || e.kind !== 'unverifiable') throw e
      }
    }
  }
}

// ---------------------------------------------------------------------------
// gh
// ---------------------------------------------------------------------------

// Subcommands that change settings, publish or read secrets: a rule deny
// even in a loose scan of code in other languages.
const GH_DANGEROUS = new Set(['secret', 'variable', 'gist', 'ssh-key', 'gpg-key', 'codespace', 'attestation', 'workflow', 'release', 'repo', 'alias', 'extension', 'ext', 'auth', 'ruleset', 'cache', 'config', 'label'])
const GH_ALLOWED = {
  issue: (s) => !['delete', 'transfer', 'lock', 'unlock', 'pin', 'unpin', 'develop'].includes(s),
  pr: (s) => !['merge', 'review', 'ready', 'lock', 'unlock', 'update-branch'].includes(s),
  project: (s) => ['list', 'view', 'field-list', 'item-list', 'item-edit', 'item-add', 'item-create'].includes(s),
  run: (s) => ['list', 'view', 'watch', 'download'].includes(s),
  workflow: (s) => ['list', 'view'].includes(s),
  repo: (s) => ['view', 'list', 'clone'].includes(s),
  release: (s) => ['list', 'view', 'download'].includes(s),
  label: (s) => s === 'list',
  auth: (s) => s === 'status',
  alias: (s) => s === 'list',
  extension: (s) => s === 'list' || s === 'search' || s === 'browse',
  ext: (s) => s === 'list' || s === 'search',
  config: (s) => s === 'get' || s === 'list',
  ruleset: (s) => s === 'list' || s === 'view' || s === 'check',
  cache: (s) => s === 'list',
  search: () => true,
  browse: () => true,
  status: () => true,
  org: (s) => s === 'list',
  completion: () => true,
  help: () => true,
  version: () => true,
  api: () => true,
}

function checkGh(words, cmd, ctx) {
  const argv = words.map((w) => w.text)
  let j = 1
  while (j < argv.length && argv[j].startsWith('-')) {
    if (argv[j] === '--version' || argv[j] === '--help' || argv[j] === '-h') return
    if (['-R', '--repo', '--hostname'].includes(argv[j])) j++
    j++
  }
  const top = words[j]
  if (!top) { if (ctx.appended) unverifiable('gh sin subcomando literal (los argumentos llegan por xargs)', 'Escribe el comando completo'); return }
  if (top.dyn) unverifiable('el subcomando de gh sale de una variable o de $(...), así que no se puede revisar', 'Escribe el subcomando directamente')
  const t = top.text
  if (!(t in GH_ALLOWED)) (GH_DANGEROUS.has(t) ? deny : unverifiable)(`gh ${t}: es un subcomando de gh que el guard no conoce (alias, extensión o comando que cambia la configuración)`, 'Usa los subcomandos de gh del flujo (issue, pr, api, project, run view)')
  if (t === 'api') return checkGhApi(words.slice(j + 1), cmd, ctx)
  // subcommand (second level), skipping flags like -R
  let k = j + 1
  while (k < argv.length && argv[k].startsWith('-')) { if (['-R', '--repo'].includes(argv[k])) k++; k++ }
  const subw = words[k]
  const sub = subw?.text
  if (subw?.dyn) unverifiable(`el subcomando de gh ${t} sale de una variable o de $(...)`, '')
  if (['issue', 'pr', 'project', 'run', 'workflow', 'repo', 'release', 'label', 'auth', 'alias', 'extension', 'ext', 'config', 'ruleset', 'cache', 'org'].includes(t)) {
    if (!sub) { if (ctx.appended) unverifiable(`gh ${t} sin subcomando literal (los argumentos llegan por xargs)`, 'Escribe el comando completo'); return }
    if (t === 'pr' && sub === 'merge') return mergeDeny('gh pr merge integra un PR', ctx)
    if (t === 'pr' && sub === 'review') {
      if (argv.slice(k + 1).some((a) => /^--approve/.test(a) || /^-[A-Za-z]*a[A-Za-z]*$/.test(a))) return mergeDeny('gh pr review --approve aprueba un PR', ctx)
      if (ctx.appended) unverifiable('gh pr review con argumentos que llegan por xargs', '')
      return
    }
    if (t === 'pr' && sub === 'ready') {
      if (argv.includes('--undo')) return
      deny('gh pr ready saca el PR de borrador; eso lo decide quien integra', 'Para volver a borrador usa gh pr ready <pr> --undo')
    }
    if (t === 'auth' && argv.some((a) => a === '-t' || a === '--show-token')) deny('imprime el token de GitHub', 'No hace falta ver el token')
    if (t === 'config' && argv.some((a) => /token/i.test(a))) deny('imprime el token de GitHub', 'No hace falta ver el token')
    if (!GH_ALLOWED[t](sub)) deny(`gh ${t} ${sub} cambia configuración, publica, borra o dispara workflows`, 'Eso lo hace una persona')
    if (t === 'pr' && (sub === 'create' || sub === 'new' || sub === 'edit')) checkPrBase(words, k, sub, ctx)
    if (t === 'pr' && ['edit', 'create', 'new'].includes(sub) && argv.some((a) => /^--(add-)?label|^-l$/.test(a)) && argv.some((a) => /automerge|auto-merge|deploy|ship|release/i.test(a))) deny('agrega una etiqueta que puede disparar un merge o un despliegue automático', '')
  }
}

// Merges and approvals. The harness only restricts: it never grants a
// permission. Inside an agent's context (a subagent, or a session in an agent
// worktree under .claude/worktrees/ or any secondary git worktree) every
// merge and approval variant is blocked. In the main checkout, where a person
// or the orchestrator integrates, the guard makes no decision on merges: it
// does not block them and does not allow them either (the normal permission
// flow applies). That is why gh pr merge is not in permissions.deny: a deny
// rule always wins over hooks and would block the person too.
export function agentContext(input, cwd, projectDir = cwd) {
  if (input.agent_id || input.agent_type) return 'es un subagente'
  for (const dir of new Set([cwd, projectDir].filter(Boolean))) {
    if (/\/\.claude\/worktrees\//.test(dir + '/')) return 'la sesión está en un worktree de agente'
    const gd = gitOut(dir, ['rev-parse', '--path-format=absolute', '--git-dir'])
    const gc = gitOut(dir, ['rev-parse', '--path-format=absolute', '--git-common-dir'])
    if (gd && gc && gd !== gc) return 'la sesión está en un worktree secundario'
  }
  return null
}
const MERGE_HINT = 'Los agentes nunca integran ni aprueban; deja el PR en In review e integra una persona o el orquestador desde el checkout principal'
function mergeDeny(reason, ctx) {
  if (ctx.agent) deny(`${reason} (${ctx.agent})`, MERGE_HINT)
}

function checkPrBase(words, k, sub, ctx) {
  const argv = words.map((w) => w.text)
  let baseVal = null
  let baseDyn = false
  for (let j = k + 1; j < argv.length; j++) {
    const a = argv[j]
    if (a === '--base' || a === '-B') { baseVal = argv[j + 1] ?? ''; baseDyn = !!words[j + 1]?.dyn; j++; continue }
    if (a.startsWith('--base=')) { baseVal = a.slice(7); baseDyn = words[j].dyn; continue }
    if (/^-B./.test(a)) { baseVal = a.slice(2); baseDyn = words[j].dyn }
  }
  if (baseVal === null) {
    if (sub === 'edit') return
    deny('gh pr create sin --base usa la rama por defecto del repositorio, que puede ser main', 'Indica la base del perfil del repositorio: gh pr create --base develop')
  }
  if (baseDyn) unverifiable('la base del PR sale de una variable', 'Escribe la base directamente')
  if (/^(refs\/heads\/)?(main|master|test|production|prod)$/i.test(baseVal)) deny(`un PR hacia ${baseVal} apunta a producción o a un entorno desplegado`, 'Los PRs van hacia la rama base del perfil (develop)')
}

// gh api
const MERGE_MUTATIONS = new Set(['mergePullRequest', 'enablePullRequestAutoMerge', 'disablePullRequestAutoMerge', 'enqueuePullRequest', 'dequeuePullRequest', 'addPullRequestReview', 'submitPullRequestReview'])
const ALLOWED_MUTATIONS = new Set(['updateProjectV2ItemFieldValue', 'addProjectV2ItemById', 'addSubIssue', 'addComment', 'createIssue', 'addBlockedBy', 'convertPullRequestToDraft'])

function checkGhApi(words, cmd, ctx) {
  const argv = words.map((w) => w.text)
  let method = null
  let hasFields = false
  let pathWord = null
  const queries = []
  const live = ctx.mode === 'live'
  for (let j = 0; j < argv.length; j++) {
    const a = argv[j]
    const w = words[j]
    const fieldValue = (v, vw) => {
      hasFields = true
      if (v == null) return
      const eq = v.indexOf('=')
      const key = eq === -1 ? v : v.slice(0, eq)
      let val = eq === -1 ? '' : v.slice(eq + 1)
      if (val.startsWith('@')) {
        const f = val === '@-' ? stdinText(cmd, ctx) : readFileSafe(resolvePath(ctx, val.slice(1)))
        if (!f || f.dyn || f.missing || f.tooBig || vw?.dyn) unverifiable(`no puedo revisar el archivo que se envía a la API (${val})`, "Pasa la consulta literal con -f query='...' o un archivo legible con -F query=@archivo")
        val = f.text
        if (key === 'query') queries.push(val)
        else looseScan(val, ctx)
        return
      }
      if (/^labels?(\[\])?$/.test(key) && /automerge|auto-merge|deploy|ship|release/i.test(val)) deny('agrega una etiqueta que puede disparar un merge o un despliegue automático', '')
      if (key === 'query') {
        if (vw?.dyn) deny('la consulta GraphQL sale de una variable o de $(...), así que no se puede revisar', "Pásala literal con -f query='...' o en un archivo con -F query=@archivo")
        queries.push(val)
      }
    }
    if (a === '-X' || a === '--method') { method = argv[j + 1]; if (words[j + 1]?.dyn) unverifiable('el método de gh api sale de una variable', ''); j++; continue }
    if (/^-X./.test(a)) { method = a.slice(2); continue }
    if (a.startsWith('--method=')) { method = a.slice(9); continue }
    if (['-f', '-F', '--field', '--raw-field'].includes(a)) { fieldValue(argv[j + 1], words[j + 1]); j++; continue }
    if (/^-[fF]./.test(a)) { fieldValue(a.slice(2), w); continue }
    if (/^--(raw-)?field=/.test(a)) { fieldValue(a.slice(a.indexOf('=') + 1), w); continue }
    if (a === '--input' || a.startsWith('--input=')) {
      hasFields = true
      const v = a === '--input' ? argv[++j] : a.slice(8)
      const vw = a === '--input' ? words[j] : w
      const f = v === '-' ? stdinText(cmd, ctx) : (vw?.dyn ? null : readFileSafe(resolvePath(ctx, v)))
      if (!f || f.dyn || f.missing || f.tooBig) unverifiable(`no puedo revisar el cuerpo que se envía a la API (${v ?? ''})`, 'Pasa el cuerpo en un archivo legible o en línea')
      let q = f.text
      try { const parsed = JSON.parse(f.text); if (parsed && typeof parsed.query === 'string') q = parsed.query; queries.push(q) } catch { queries.push(q) }
      continue
    }
    if (['-H', '--header', '-q', '--jq', '-t', '--template', '--hostname', '--cache', '-p', '--preview'].includes(a)) { j++; continue }
    if (a.startsWith('-')) continue
    if (!pathWord) pathWord = w
  }
  const p = (pathWord?.text ?? '').replace(/^\//, '')
  if (p === 'graphql' || /\/graphql$/.test(p)) {
    for (const q of queries) checkGraphqlText(q, ctx)
    if (!queries.length && hasFields && live) deny('gh api graphql sin una consulta que el guard pueda leer', "Pasa la consulta con -f query='...'")
    return
  }
  const m = (method ?? (hasFields ? 'POST' : 'GET')).toUpperCase()
  if (m === 'GET' || m === 'HEAD') return
  // Merge and review endpoints: blocked for agents, no decision otherwise.
  // Only the exact PR merge/review endpoints; anything else that mentions
  // "merge" (POST /merges, ?merge=…) keeps the normal checks below.
  if (/^repos\/[^/?]+\/[^/?]+\/pulls\/\d+\/(merge|reviews(\/\d+\/events)?)\/?(\?.*)?$/i.test(p)) return mergeDeny(`la API de GitHub integra o aprueba (${p})`, ctx)
  if (pathWord?.dyn) unverifiable('gh api escribe en una ruta que sale de una variable', 'Escribe la ruta directamente')
  if (/merge/i.test(p)) deny(`la ruta de la API integra ramas o PRs (${p})`, 'Los agentes nunca integran')
  if (m !== 'POST') deny(`gh api con método ${m} cambia recursos o configuración del repositorio`, 'Usa los subcomandos de gh (gh issue comment, gh pr edit) o pide el cambio a una persona')
  const ok = /^repos\/(MakeSens-Apps\/[^/ ]+|\{owner\}\/\{repo\}|:owner\/:repo)\/issues(\/[0-9]+\/(comments|sub_issues|dependencies\/blocked_by))?\/?(\?.*)?$/i
  if (!ok.test(p)) deny(`gh api POST a una ruta que el flujo del ticket no necesita (${p})`, 'Solo se permiten issues, comentarios, sub-issues y dependencias en repos de MakeSens-Apps; lo demás lo hace una persona')
}

// GraphQL: queries are free; mutations must be in the allow list.
export function graphqlMutations(text) {
  // One pass in the right order: block strings, strings, then comments (a #
  // inside a string is text, not a comment).
  const src = text.replace(/"""[\s\S]*?"""/g, '""').replace(/"(?:[^"\\\n]|\\.)*"/g, '""').replace(/#[^\n]*/g, '')
  if (/"""/.test(src) || (src.match(/"/g) ?? []).length % 2 === 1) return ['(texto sin cerrar)']
  const names = []
  const re = /\b(mutation|subscription)\b/g
  let m
  let found = false
  while ((m = re.exec(src))) {
    found = true
    if (m[1] === 'subscription') { names.push('subscription'); continue }
    // skip operation name and variable definitions
    let i = m.index + m[0].length
    const open = src.indexOf('{', i)
    if (open === -1) { names.push('?'); continue }
    let depth = 0
    let expectField = true
    let k = open
    for (; k < src.length; k++) {
      const c = src[k]
      if (c === '{') { depth++; if (depth === 1) expectField = true; continue }
      if (c === '}') { depth--; if (depth === 0) break; continue }
      if (c === '(') { // skip arguments
        let d = 1; k++
        while (k < src.length && d > 0) { if (src[k] === '(') d++; else if (src[k] === ')') d--; k++ }
        k--
        continue
      }
      if (depth === 1 && /[A-Za-z_]/.test(c)) {
        const id = src.slice(k).match(/^[A-Za-z_][A-Za-z0-9_]*/)[0]
        const after = src.slice(k + id.length).match(/^\s*(:)?/)
        if (after[1]) { k += id.length + after[0].length - 1; continue } // alias
        names.push(id)
        k += id.length - 1
      }
    }
    re.lastIndex = k
  }
  return found ? (names.length ? names : ['?']) : []
}

function checkGraphqlText(text, ctx) {
  const candidates = [text]
  try { const parsed = JSON.parse(text); if (parsed && typeof parsed.query === 'string') candidates.push(parsed.query) } catch { /* not JSON */ }
  // Queries inside JSON strings ({"query":"mutation{...}"}), escapes decoded.
  for (const m of text.matchAll(/"query"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
    try { candidates.push(JSON.parse(`"${m[1]}"`)) } catch { candidates.push(m[1]) }
  }
  for (const name of candidates.flatMap((q) => graphqlMutations(q))) {
    if (name === 'subscription') deny('suscripción GraphQL no permitida', '')
    if (MERGE_MUTATIONS.has(name)) { mergeDeny(`mutación GraphQL que integra o aprueba (${name})`, ctx); continue }
    if (!ALLOWED_MUTATIONS.has(name)) deny(`mutación GraphQL no permitida (${name}): integrar, aprobar, escribir ramas o cambiar configuración lo hace una persona`, `Mutaciones permitidas: ${[...ALLOWED_MUTATIONS].join(', ')}`)
  }
}

// ---------------------------------------------------------------------------
// git
// ---------------------------------------------------------------------------

const SENSITIVE_GIT_KEY = /^(alias\.|remote\.|branch\..*\.(merge|remote|pushremote)|url\.|include|credential|core\.(hookspath|sshcommand|fsmonitor|pager|editor|askpass|gitproxy|worktree|alternaterefscommand|alternaterefsprefixes)|http\..*(proxy|extraheader)|gpg\.|diff\.|difftool\.|merge\.|mergetool\.|filter\.|protocol\.|pushurl|push\.|sequence\.|interactive\.|submodule\.|sendemail\.|uploadpack\.|receive\.|transfer\.|fetch\.|pager\.|instaweb\.)/i

function checkGit(words, ctx) {
  const argv = words.map((w) => w.text)
  let j = 1
  let dir = ctx.cwd
  while (j < argv.length && argv[j].startsWith('-')) {
    const a = argv[j]
    if (a === '-C') { dir = resolvePath({ cwd: dir }, argv[j + 1] ?? ''); j += 2; continue }
    if (a === '-c') { const kv = argv[j + 1] ?? ''; if (SENSITIVE_GIT_KEY.test(kv.split('=')[0])) deny(`git -c ${kv.split('=')[0]} cambia alias, remotos, credenciales o hooks de git`, 'Usa git sin esa opción'); j += 2; continue }
    if (a === '--config-env' || a.startsWith('--config-env=')) deny('git --config-env cambia la configuración de git', '')
    if (a === '--exec-path' || a.startsWith('--exec-path=')) deny('git --exec-path cambia los programas de git', '')
    if (['--git-dir', '--work-tree', '--namespace', '--super-prefix'].includes(a)) { j += 2; continue }
    j++
  }
  const subw = words[j]
  if (!subw) { if (ctx.appended) unverifiable('git sin subcomando literal (los argumentos llegan por xargs)', 'Escribe el comando completo'); return }
  if (subw.dyn) unverifiable('el subcomando de git sale de una variable o de $(...)', 'Escribe el subcomando directamente')
  const sub = subw.text
  const rest = words.slice(j + 1)
  const ra = rest.map((w) => w.text)
  // Subcommands that run shell text: check that text as a command.
  const sub1 = (t) => analyze(t, { ...ctx, depth: ctx.depth + 1 })
  if (sub === 'filter-branch' || sub === 'filter-repo') deny(`git ${sub} reescribe la historia y ejecuta filtros`, 'Pide el cambio a una persona')
  if (['rebase', 'difftool', 'mergetool'].includes(sub)) {
    rest.forEach((w, q) => {
      const t = w.text
      const v = ['-x', '--exec', '--extcmd'].includes(t) ? rest[q + 1] : (/^--(exec|extcmd)=/.test(t) ? { ...w, text: t.slice(t.indexOf('=') + 1) } : (/^-x./.test(t) ? { ...w, text: t.slice(2) } : null))
      if (!v) return
      if (v.dyn && ctx.mode === 'live') unverifiable(`git ${sub} ejecuta un comando que sale de una variable`, '')
      sub1(v.text)
    })
  }
  if (sub === 'bisect' && ra[0] === 'run' && rest.length > 1) analyzeCommand({ words: rest.slice(1), redirs: [], pipeIn: null }, { ...ctx, depth: ctx.depth + 1 })
  if (sub === 'submodule' && ra.includes('foreach')) sub1(rest.slice(ra.indexOf('foreach') + 1).filter((w) => !/^--?(recursive|quiet|q)$/.test(w.text)).map((w) => w.text).join(' '))
  switch (sub) {
    case 'push': return checkGitPush(rest, dir, ctx)
    case 'fetch': case 'pull': case 'clone': case 'ls-remote': case 'archive': case 'submodule':
      if (ra.some((a) => /^--(upload-pack|exec|receive-pack)(=|$)/.test(a) || (a === '-u' && sub !== 'submodule') || /^--config(=|$)/.test(a) || a === '-c')) deny(`git ${sub} con una opción que ejecuta otro programa o cambia la configuración`, 'Usa el comando sin esa opción')
      return
    case 'grep': if (ctx.mode === 'live') checkGrep('git', ['git', 'grep', ...ra], ctx); return
    case 'stash': if (ra[0] === 'clear') deny('git stash clear borra los stashes de todos los worktrees', ''); return
    case 'send-pack': case 'http-push': case 'receive-pack':
      deny(`git ${sub} publica referencias sin pasar por git push`, 'Publica tu rama con git push -u origin feature/<n>-<slug>')
    case 'subtree': if (ra.includes('push')) deny('git subtree push publica en otra rama', ''); return
    case 'credential': case 'credential-store': case 'credential-cache': case 'credential-osxkeychain':
      deny('git credential lee o guarda credenciales', '')
    case 'config': {
      // git >= 2.46: git config set|unset|get|list <key>
      if (['set', 'unset', 'rename-section', 'remove-section', 'edit'].includes(ra[0])) {
        if (ra[0] === 'edit') deny('git config edit abre un editor sobre la configuración', '')
        const key = ra.slice(1).find((a) => !a.startsWith('-')) ?? ''
        if (ra.some((a) => a === '--global' || a === '--system' || a.startsWith('--file') || a === '-f')) deny('git config fuera del repositorio (global, sistema o archivo)', 'Esa configuración la cambia la persona')
        if (SENSITIVE_GIT_KEY.test(key)) deny(`git config ${ra[0]} ${key} cambia alias, remotos, credenciales o programas que ejecuta git`, 'Esa configuración la cambia la persona')
        return
      }
      if (['get', 'list'].includes(ra[0])) return
      const reading = ra.some((a) => /^(--get|--get-all|--get-regexp|--list|-l|--show-origin|--show-scope|--name-only)$/.test(a)) || (ra.filter((a) => !a.startsWith('-')).length <= 1 && !ra.includes('--unset') && !ra.includes('--add'))
      if (reading) return
      if (ra.some((a) => a === '--global' || a === '--system' || a.startsWith('--file') || a === '-f')) deny('git config fuera del repositorio (global, sistema o archivo)', 'Esa configuración la cambia la persona')
      const key = ra.find((a) => !a.startsWith('-')) ?? ''
      if (SENSITIVE_GIT_KEY.test(key)) deny(`git config ${key} cambia alias, remotos, credenciales o hooks de git`, 'Esa configuración la cambia la persona')
      return
    }
    case 'remote': {
      const s = ra.find((a) => !a.startsWith('-'))
      if (['add', 'set-url', 'rename', 'remove', 'rm', 'set-head', 'set-branches', 'prune'].includes(s)) deny(`git remote ${s} cambia los remotos del repositorio`, 'Los remotos los cambia la persona')
      return
    }
    case 'worktree': {
      if (ctx.mode !== 'live') return
      const action = ra[0]
      if (action === 'unlock') deny('git worktree unlock puede soltar el worktree de otra sesión viva', 'Usa /racimo-harness:limpiar, que solo desbloquea locks de procesos que ya no existen')
      if (action === 'remove' || action === 'prune') {
        let forces = 0
        for (const a of ra) { if (a === '-f' || a === '--force') forces++; if (a === '-ff') forces += 2 }
        if (forces >= 2) deny('git worktree remove -f -f borra worktrees bloqueados o con cambios sin publicar', 'Usa /racimo-harness:limpiar')
      }
      return
    }
    case 'checkout': case 'restore': case 'reset':
      if (ra.some((a) => isGuardedPath(a)) && !(sub === 'restore' && ra.includes('--staged') && !ra.includes('--worktree')) && !(sub === 'reset' && !ra.some((a) => /^--(hard|merge|keep)$/.test(a)))) deny('restaura una versión vieja del guard o de la configuración de Claude Code', 'La capa del harness se cambia con un PR en racimo-harness')
      return
  }
}

function checkGitPush(rest, dir, ctx) {
  const ra = rest.map((w) => w.text)
  // Only from the worktree of this session (git -C elsewhere is another branch).
  if (dir !== ctx.cwd && ctx.mode === 'live') {
    const top = (d) => gitOut(d, ['rev-parse', '--show-toplevel'])
    if (top(dir) !== top(ctx.cwd)) deny('git push desde otro worktree o repositorio (git -C)', 'Publica desde el worktree del ticket')
  }
  let lease = false
  let force = false
  const pos = []
  for (let k = 0; k < ra.length; k++) {
    const a = ra[k]
    if (rest[k].dyn) unverifiable('git push con argumentos que salen de una variable o de $(...)', 'Escribe la rama directamente: git push -u origin feature/<n>-<slug>')
    if (/^--force-with-lease(=|$)/.test(a) || a === '--force-if-includes') { lease = true; continue }
    if (a === '--force') { force = true; continue }
    if (/^--(mirror|all|tags|delete|prune|follow-tags)$/.test(a) || /^--(receive-pack|exec)(=|$)/.test(a)) deny(`git push ${a} publica o borra ramas y tags en bloque`, 'Publica solo tu rama: git push -u origin feature/<n>-<slug>')
    if (['-o', '--push-option', '--repo'].includes(a)) { if (a === '--repo') deny('git push --repo cambia el destino', ''); k++; continue }
    if (a.startsWith('--push-option=')) continue
    if (a.startsWith('--')) continue
    if (/^-[A-Za-z]+$/.test(a)) { if (a.includes('f')) force = true; if (a.includes('d')) deny(`git push ${a} borra ramas remotas`, ''); continue }
    pos.push(a)
  }
  if (force) deny(lease ? 'git push --force anula --force-with-lease' : 'git push --force sin --force-with-lease puede pisar trabajo ajeno', 'Usa solo git push --force-with-lease origin feature/<n>-<slug>')
  if (pos.length < 2) {
    if (ctx.appended) unverifiable('git push con la rama en argumentos que llegan por xargs', '')
    deny('git push sin remoto y rama explícitos puede publicar en develop o main', 'Indica la rama: git push -u origin feature/<n>-<slug>')
  }
  if (!/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(pos[0]) || /^\.+$/.test(pos[0])) deny(`git push a un remoto por URL o ruta (${pos[0]})`, 'Publica en el remoto del repositorio (origin)')
  if (ctx.mode !== 'live') {
    for (const ref of pos.slice(1)) {
      const dst = (ref.includes(':') ? ref.slice(ref.indexOf(':') + 1) : ref).replace(/^\+/, '').replace(/^refs\/heads\//, '')
      if (ref !== 'HEAD' && !/^feature\/[A-Za-z0-9._/-]+$/.test(dst)) deny(`git push solo puede publicar ramas feature/* (destino: ${dst || 'vacío'})`, 'Publica tu rama: git push -u origin feature/<n>-<slug>')
    }
    return
  }
  const remotes = (gitOut(dir, ['remote']) ?? '').split('\n').map((r) => r.trim()).filter(Boolean)
  if (!remotes.includes(pos[0])) deny(`git push a ${pos[0]}, que no es un remoto configurado de este repositorio`, 'Publica en origin')
  if (ctx.mode === 'live' && ctx.branchChanged) unverifiable('git push después de cambiar de rama en el mismo comando', 'Cambia de rama en un comando y publica en otro')
  const cur = currentBranch(dir)
  if (ctx.mode === 'live' && !cur) deny('git push sin una rama actual (HEAD separado o fuera de un repositorio)', 'Cámbiate a tu rama feature/<n>-<slug> antes de publicar')
  for (const ref of pos.slice(1)) {
    if (ref.startsWith('+')) deny('un refspec con + fuerza el push sin --force-with-lease', 'Usa git push --force-with-lease origin feature/<n>-<slug>')
    let dst = ref
    if (ref.includes(':')) {
      const src = ref.slice(0, ref.indexOf(':'))
      dst = ref.slice(ref.indexOf(':') + 1)
      if (!src) deny('git push origin :rama borra una rama remota', 'Borrar ramas lo hace GitHub al integrar')
    } else if (ref === 'HEAD' && cur) dst = cur
    dst = dst.replace(/^refs\/heads\//, '')
    if (!/^feature\/[A-Za-z0-9._/-]+$/.test(dst) || dst.includes('..')) deny(`git push solo puede publicar ramas feature/* (destino: ${dst || 'vacío'})`, 'Publica tu rama: git push -u origin feature/<n>-<slug>')
    if (ctx.mode === 'live' && dst !== cur) deny(`git push a ${dst}, que no es la rama de este worktree (${cur})`, 'Publica solo tu rama')
    if (ctx.mode === 'live') {
      // The branch must be of a ticket of this worktree (.claude/evidence/<n>).
      const top = gitOut(dir, ['rev-parse', '--show-toplevel']) ?? dir
      let tickets = []
      try { tickets = fs.readdirSync(path.join(top, '.claude', 'evidence')).filter((d) => /^\d+$/.test(d)) } catch { /* none */ }
      if (!tickets.length) unverifiable('no sé de qué ticket es este worktree (falta .claude/evidence/<n>)', 'El skill ticket lo crea en el paso 1; para un rebase, créalo con el número del ticket')
      if (!tickets.some((n) => dst.startsWith(`feature/${n}-`))) deny(`git push a ${dst}, que no es la rama de un ticket de este worktree (${tickets.join(', ')})`, 'Publica solo la rama de tu ticket')
    }
  }
}

// ---------------------------------------------------------------------------
// AWS
// ---------------------------------------------------------------------------

function checkAws(words, ctx) {
  const argv = words.map((w) => w.text)
  let svc = null
  let op = null
  let query = null
  for (let j = 1; j < argv.length; j++) {
    const a = argv[j]
    if (a === '--query') { query = argv[j + 1] ?? ''; j++; continue }
    if (a.startsWith('--query=')) { query = a.slice(8); continue }
    if (['--profile', '--region', '--output', '--endpoint-url', '--ca-bundle', '--color', '--cli-read-timeout', '--cli-connect-timeout', '--cli-binary-format'].includes(a)) { j++; continue }
    if (a.startsWith('-')) continue
    if (!svc) svc = a
    else if (!op) op = a
  }
  if (!svc) return
  if (argv.includes('--debug') && ctx.mode !== 'loose') deny('aws --debug imprime las respuestas completas (variables de entorno y credenciales) aunque haya --query', 'Ejecuta el comando sin --debug')
  // In loose scans (code in other languages) only clear write verbs count.
  if (ctx.mode === 'loose' && !/^(create|delete|put|update|start|stop|invoke|admin|attach|detach|add|remove|batch-write|deploy|publish|restore|terminate|run|send|tag|untag|get-secret|get-login|assume)/.test(op ?? '')) return
  if (words.slice(1).some((w) => w.dyn) && ctx.mode === 'live' && (!op || words.find((w) => w.text === op)?.dyn)) unverifiable('aws con un servicio u operación que sale de una variable', '')
  const so = `${svc} ${op ?? ''}`.trim()
  const ok = (cond) => { if (!cond) deny(`aws ${so} escribe, lee secretos o datos de personas, o ejecuta algo en la cuenta compartida`, 'En AWS los agentes solo consultan (get, list, describe) sin secretos ni datos de personas; lo demás lo hace una persona') }
  if (['sts get-caller-identity', 'sso login', 'sso logout', 'configure list', 'configure list-profiles'].includes(so)) return
  if (svc === 'configure') { if (op === 'get' && !/secret|token|key/i.test(argv.join(' '))) return; ok(false) }
  if (svc === 's3') { ok(op === 'ls'); return }
  if (svc === 'sts' || svc === 'sso' || svc === 'sso-oidc' || svc === 'cognito-identity' || svc === 'secretsmanager' || svc === 'kms') ok(/^(list-|describe-)/.test(op ?? '') && !/secret-value/.test(op))
  if (/credential|password|authorization-token|api-key|secret-value|decrypt|login|session-token|access-token|presign/.test(op ?? '')) ok(false)
  if (svc === 'ssm' && /^get-parameter/.test(op ?? '') && argv.includes('--with-decryption')) ok(false)
  if (svc === 'dynamodb' && /^(get-item|batch-get-item|query|scan|execute-statement|batch-execute-statement|export-table|get-records)/.test(op ?? '')) deny(`aws ${so} lee registros de tablas (datos de personas)`, 'Usa datos sintéticos')
  if (svc === 'dynamodbstreams' && op === 'get-records') deny(`aws ${so} lee registros de tablas`, '')
  if (svc === 'cognito-idp' && /^(list-users|list-users-in-group|admin-get-user|admin-list-groups-for-user|get-user|describe-user-pool-client|admin-list-user-auth-events)/.test(op ?? '')) deny(`aws ${so} lee usuarios o secretos de Cognito`, 'Usa el usuario de prueba designado')
  if (svc === 's3api' && /^(get-object|select-object-content|put-|delete-|copy-|restore-)/.test(op ?? '')) ok(false)
  if (svc === 'logs' && /^(get-log-events|filter-log-events|start-query|get-query-results|tail|start-live-tail)/.test(op ?? '')) deny(`aws ${so} lee registros que pueden tener datos de personas`, 'Pide a una persona el extracto que necesites')
  if ((svc === 'amplify' && /^(get-app|list-apps|get-branch|list-branches|get-backend-environment)$/.test(op ?? '')) || (svc === 'lambda' && /^(get-function|get-function-configuration|list-functions|list-versions-by-function)$/.test(op ?? '')) || (svc === 'ecs' && /^describe-task-definition$/.test(op ?? ''))) {
    // Only a plain path to named fields (app.name, branches[].branchName),
    // never a whole object, a projection or a function.
    const plain = /^[A-Za-z][A-Za-z0-9]*(\[\]|\[\d+\])?(\.[A-Za-z][A-Za-z0-9]*(\[\]|\[\d+\])?)+$/
    if (!query || !plain.test(query.trim()) || /nvironment|variables|basicauth|credential|password|token|secret/i.test(query)) {
      deny(`aws ${so} devuelve variables de entorno con secretos`, 'Agrega un --query con la ruta exacta de los campos que necesitas (por ejemplo app.name), sin variables de entorno')
    }
    return
  }
  if ((svc === 'kinesis' && op === 'get-records') || (svc === 'athena' && /^get-query-results/.test(op ?? '')) || (svc === 'ssm' && /^get-parameter/.test(op ?? '')) || (svc === 'appsync' && /^(list-api-keys|get-data-source)/.test(op ?? ''))) deny(`aws ${so} lee datos, parámetros o claves`, 'Pide a una persona el dato que necesites')
  if (!op) return
  ok(/^(get-|list-|describe-|head-|simulate-|validate-|lookup-|filter-|wait$|help$)/.test(op))
}

// ---------------------------------------------------------------------------
// Package managers, deploys, processes, grep
// ---------------------------------------------------------------------------

const DEPLOY_SCRIPT = /(^|:)(deploy|publish|release|ship)(:|$)|amplify-push|android:prod/

const builtinsBun = new Set(['install', 'i', 'add', 'remove', 'rm', 'update', 'run', 'x', 'test', 'build', 'init', 'create', 'pm', 'link', 'unlink', 'upgrade', 'outdated', 'publish', 'patch'])

function checkPackageManager(name, words, ctx) {
  const argv = words.map((w) => w.text)
  if (!(ctx.cwdKnown ?? true) && ctx.mode === 'live' && !argv.some((a) => /^--(prefix|cwd|dir)/.test(a) || a === '-C')) unverifiable(`no sé en qué carpeta corre ${name} (cd a una ruta que sale de una variable)`, '')
  let prefix = ctx.cwd
  for (let q = 1; q < argv.length; q++) {
    if (['--prefix', '-C', '--cwd', '--dir'].includes(argv[q])) prefix = resolvePath(ctx, argv[q + 1] ?? '')
    else if (/^--(prefix|cwd|dir)=/.test(argv[q])) prefix = resolvePath(ctx, argv[q].slice(argv[q].indexOf('=') + 1))
    else if (['-w', '--workspace', '--filter'].includes(argv[q]) || /^--(workspace|filter)=/.test(argv[q])) {
      const ws = argv[q].includes('=') ? argv[q].slice(argv[q].indexOf('=') + 1) : argv[q + 1]
      const dir = resolvePath(ctx, ws ?? '')
      if (readFileSafe(path.join(dir, 'package.json'))) prefix = dir
      else if (ctx.mode === 'live') unverifiable(`no encuentro el workspace ${ws} para revisar sus scripts`, 'Usa la ruta del workspace (-w paquetes/x) o --prefix')
    }
  }
  let j = 1
  while (j < argv.length && argv[j].startsWith('-')) {
    if (['--prefix', '-C', '--cwd', '--dir', '-w', '--workspace', '--filter'].includes(argv[j])) j++
    j++
  }
  const sub = argv[j]
  if (!sub) return
  if (words[j].dyn) unverifiable(`${name} con un subcomando que sale de una variable`, '')
  if (['publish', 'unpublish', 'deprecate', 'dist-tag', 'owner', 'access', 'token', 'adduser', 'login'].includes(sub)) deny(`${name} ${sub} publica paquetes o maneja credenciales del registro`, 'Lo hace una persona')
  if (['exec', 'x', 'dlx'].includes(sub) || (name === 'bun' && sub === 'x')) {
    const rest = words.slice(j + 1)
    const ci = rest.findIndex((w) => w.text === '-c' || w.text === '--call' || w.text.startsWith('--call='))
    if (ci !== -1) {
      const code = rest[ci].text.startsWith('--call=') ? { ...rest[ci], text: rest[ci].text.slice(7) } : rest[ci + 1]
      if (code?.dyn && ctx.mode === 'live') unverifiable(`${name} ${sub} -c con código que sale de una variable`, '')
      if (code) analyze(code.text, { ...ctx, depth: ctx.depth + 1 })
      return
    }
    // The command is the first positional (or what follows a leading --);
    // a later -- only separates the command's own arguments.
    let cmdWords = []
    for (let q = 0; q < rest.length; q++) {
      const t = rest[q].text
      if (t === '--') { cmdWords = rest.slice(q + 1); break }
      if (['-p', '--package', '--prefix', '-w', '--workspace', '--filter', '-C', '--dir'].includes(t)) { q++; continue }
      if (t.startsWith('-')) continue
      cmdWords = rest.slice(q); break
    }
    cmdWords = cmdWords.filter((w) => w.text !== '--')
    if (!cmdWords.length) return
    cmdWords[0] = { ...cmdWords[0], text: npxBin(cmdWords[0].text) }
    return analyzeCommand({ words: cmdWords, redirs: [], pipeIn: null }, { ...ctx, depth: ctx.depth + 1 })
  }
  if (name === 'bun' && sub && !builtinsBun.has(sub) && readFileSafe(resolvePath(ctx, sub))) return checkScriptRunner('node', { words, redirs: [], pipeIn: null }, words, ctx)
  // Lifecycle scripts that npm/pnpm/yarn run by themselves on install.
  if (['install', 'i', 'ci', 'add', 'pack', 'publish', 'rebuild', 'link'].includes(sub) || (name === 'yarn' && !sub)) {
    for (const lc of ['preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'postpack']) runPackageScript(prefix, lc, ctx, true)
    return
  }
  let script = null
  const builtins = new Set(['install', 'i', 'ci', 'add', 'remove', 'uninstall', 'rm', 'update', 'up', 'ls', 'list', 'outdated', 'audit', 'view', 'info', 'why', 'explain', 'init', 'create', 'help', 'config', 'cache', 'dedupe', 'prune', 'pack', 'link', 'version', '--version', 'doctor', 'fund', 'set', 'get', 'exec', 'dlx', 'x'])
  if (sub === 'run' || sub === 'run-script' || sub === 'rum' || sub === 'urn') {
    let k = j + 1
    while (k < argv.length && argv[k].startsWith('-')) k++
    script = argv[k]
    if (words[k]?.dyn) unverifiable(`${name} run con un script que sale de una variable`, '')
  } else if (['test', 't', 'start', 'stop', 'restart'].includes(sub)) script = sub === 't' ? 'test' : sub
  else if (name !== 'npm' && !builtins.has(sub)) script = sub
  if (name === 'npm' && sub === 'install' || sub === 'ci' || sub === 'i') script = null
  if (!script) return
  // yarn, pnpm and bun run a node_modules/.bin binary when no script has that
  // name (pnpm falls back to exec): check it as a command too.
  if (name !== 'npm' && !packageScripts(prefix)[script] && words.length) {
    const k = sub === 'run' || sub === 'run-script' ? argv.indexOf(script, j + 1) : j
    if (k > 0) {
      const bw = words.slice(k).filter((w) => w.text !== '--')
      return analyzeCommand({ words: [{ ...bw[0], text: NPX_BIN[bw[0].text] ?? bw[0].text }, ...bw.slice(1)], redirs: [], pipeIn: null }, { ...ctx, depth: ctx.depth + 1 })
    }
  }
  if (DEPLOY_SCRIPT.test(script)) deny(`${name} run ${script} parece un despliegue o una publicación`, 'Los despliegues los hace una persona después del merge')
  runPackageScript(prefix, script, ctx)
}

function packageScripts(dir) {
  const f = readFileSafe(path.join(dir, 'package.json'))
  if (!f || f.tooBig) return {}
  try { const s = JSON.parse(f.text)?.scripts; return s && typeof s === 'object' ? s : {} } catch { return {} }
}

function runPackageScript(dir, script, ctx, lifecycleOnly = false) {
  if (ctx.depth >= MAX_DEPTH) deny('demasiados scripts de npm anidados (o un ciclo) para revisarlos', 'Ejecuta el script final directamente')
  const pj = path.join(dir, 'package.json')
  if (ctx.written?.has(pj)) unverifiable('package.json se modifica y se usa en el mismo comando', 'Hazlo en dos comandos')
  const f = readFileSafe(pj)
  if (!f || f.tooBig) return
  let pkg
  try { pkg = JSON.parse(f.text) } catch { return }
  const scripts = pkg?.scripts ?? {}
  for (const s of lifecycleOnly ? [script] : [`pre${script}`, script, `post${script}`]) {
    if (typeof scripts[s] !== 'string') continue
    if (s !== script && DEPLOY_SCRIPT.test(s)) deny(`el script ${s} parece un despliegue`, '')
    analyze(scripts[s], { ...ctx, mode: ctx.mode === 'loose' ? 'loose' : 'live', depth: ctx.depth + 1, cwd: dir, vars: new Map() })
  }
}

function checkDeploy(name, argv, ctx) {
  const a1 = argv[1]
  const rest = argv.slice(1)
  const d = (what) => deny(`${what} despliega, publica o borra recursos compartidos`, 'Los despliegues los hace una persona después del merge')
  if (name === 'amplify') {
    if (['push', 'publish', 'delete', 'init', 'remove'].includes(a1)) d(`amplify ${a1}`)
    if (a1 === 'env' && ['add', 'remove', 'update', 'import', 'checkout'].includes(argv[2])) d(`amplify env ${argv[2]}`)
    if (['api', 'auth', 'function', 'storage', 'hosting', 'analytics'].includes(a1) && ['push', 'remove'].includes(argv[2])) d(`amplify ${a1} ${argv[2]}`)
  }
  if (name === 'ampx') {
    if (a1 === 'pipeline-deploy' || a1 === 'deploy') d(`ampx ${a1}`)
    if (a1 === 'sandbox') {
      if (rest.includes('delete') || rest.includes('secret')) deny(`ampx sandbox ${rest.includes('delete') ? 'delete' : 'secret'} borra un sandbox o maneja secretos`, 'Lo hace la persona que creó el sandbox')
      const ids = []
      rest.forEach((x, q) => { if (x === '--identifier') ids.push(rest[q + 1]); else if (x.startsWith('--identifier=')) ids.push(x.slice(13)) })
      const allowed = ctx.env?.RACIMO_HARNESS_SANDBOX
      if (!allowed || !ids.length || ids.some((id) => id !== allowed)) deny('ampx sandbox despliega un stack en la cuenta compartida y necesita autorización explícita de una persona', 'Pídela en el issue; la persona la da para un identificador concreto al lanzar la sesión')
    }
  }
  if ((name === 'sam') && ['deploy', 'delete', 'sync', 'publish'].includes(a1)) d(`sam ${a1}`)
  if ((name === 'cdk') && ['deploy', 'destroy', 'bootstrap', 'import', 'watch'].includes(a1)) d(`cdk ${a1}`)
  if ((name === 'serverless' || name === 'sls') && ['deploy', 'remove'].includes(a1)) d(name)
  if ((name === 'terraform' || name === 'tofu') && ['apply', 'destroy', 'import'].includes(a1)) d(name)
  if (name === 'pulumi' && ['up', 'destroy', 'update'].includes(a1)) d(name)
  if (name === 'eas' && ['build', 'submit', 'update'].includes(a1)) d(`eas ${a1}`)
  const loose = ctx.mode === 'loose'
  if (name === 'fastlane' && (!loose || /^[a-z_]+$/.test(a1 ?? ''))) d(name)
  if (name === 'vercel' && (!loose || /^(deploy|--prod|promote|alias|rm|remove)$/.test(a1 ?? ''))) d(name)
  if (name === 'netlify' && (loose ? /^(deploy|sites:delete)$/.test(a1 ?? '') : a1 !== 'status')) d(name)
  if (name === 'firebase' && /^(deploy|hosting)/.test(a1 ?? '') || name === 'eb' && a1 === 'deploy' || name === 'copilot' && /deploy/.test(rest.join(' '))) d(name)
  if (name === 'gradlew' || name === 'gradle' || name === 'gradlew.bat') checkGradle(name, rest, d)
  if (name === 'docker' && ['push'].includes(a1)) d('docker push')
  if (name === 'docker' && (a1 === 'compose' && ['down', 'rm', 'stop', 'kill'].includes(argv[2]) || a1 === 'container' && ['stop', 'rm', 'kill', 'prune'].includes(argv[2]) || a1 === 'system' && argv[2] === 'prune') && ctx.mode === 'live') deny(`docker ${a1} ${argv[2]} detiene o borra contenedores de otras sesiones`, '')
  if (name === 'xcrun' && a1 === 'simctl' && ['shutdown', 'erase', 'delete'].includes(argv[2])) deny(`xcrun simctl ${argv[2]} apaga o borra simuladores de otras sesiones`, '')
  if (name === 'kubectl' && ['apply', 'create', 'delete', 'replace', 'patch', 'scale', 'rollout', 'set', 'edit', 'label', 'annotate'].includes(a1)) d(`kubectl ${a1}`)
  if (name === 'helm' && ['install', 'upgrade', 'uninstall', 'rollback', 'delete'].includes(a1)) d(`helm ${a1}`)
}

// Gradle: only a list of debug, lint and unit-test tasks runs. It is a list
// of exact names because Gradle also accepts camelCase abbreviations (aR is
// assembleRelease, pubDebug a publish task): any other name is blocked.
// Release, signing, publishing and uploads, the tasks that build every
// variant (assemble, build, bundle) and the ones that install on or test in
// whatever device is plugged in (installDebug, uninstall*, connected*: the
// emulator is android.sh's job) are not on it.
const GRADLE_VALUE_OPTS = new Set(['-p', '--project-dir', '-b', '--build-file', '-c', '--settings-file', '-g', '--gradle-user-home', '-x', '--exclude-task', '--console', '--warning-mode', '--max-workers', '--priority', '--include-build', '--project-cache-dir', '-F', '--dependency-verification', '-M', '--write-verification-metadata', '--update-locks'])
const GRADLE_SAFE_TASKS = new Set(['assembleDebug', 'bundleDebug', 'compileDebugSources', 'compileDebugJavaWithJavac', 'compileDebugKotlin', 'compileDebugUnitTestSources', 'assembleDebugUnitTest', 'assembleDebugAndroidTest', 'lint', 'lintDebug', 'lintFix', 'lintVitalDebug', 'test', 'testDebugUnitTest', 'check', 'clean', 'tasks', 'help', 'projects', 'dependencies', 'androidDependencies', 'buildEnvironment', 'outgoingVariants'])
const GRADLE_BAD = /release|publish|upload|sign|deploy|distribut|promote|appcenter|firebase|crashlytics|sentry|bugsnag|play|store/i
function checkGradle(name, rest, d) {
  for (let q = 0; q < rest.length; q++) {
    const t = rest[q]
    // By prefix: Gradle also takes -Ix.gradle glued and short forms of long options.
    if (/^(-I|--init|--sc)/.test(t)) deny(`${name} ${t} ${t.startsWith('--sc') ? 'publica el build en scans.gradle.com' : 'carga código de Gradle que el guard no revisa'}`, 'Usa solo tareas de debug, lint y pruebas')
    if (/-javaagent|-agentpath|-agentlib/.test(t)) deny(`${name} ${t} carga un agente en la JVM de Gradle`, 'Usa solo tareas de debug, lint y pruebas')
    if (GRADLE_VALUE_OPTS.has(t)) { q++; continue }
    if (/^-[PD]$/.test(t)) { if (GRADLE_BAD.test(rest[q + 1] ?? '')) d(`${name} ${t} ${rest[q + 1]}`); q++; continue }
    if (/^-[PD]./.test(t)) { if (GRADLE_BAD.test(t)) d(`${name} ${t}`); continue }
    if (t.startsWith('-')) continue
    const task = t.split(':').pop()
    if (GRADLE_BAD.test(task)) d(`${name} ${t}`)
    if (!GRADLE_SAFE_TASKS.has(task)) deny(`${name} ${t}: solo se permiten tareas de debug, lint y pruebas escritas completas (Gradle acepta abreviaturas, así que otro nombre puede ser un release, una firma o una publicación)`, `Usa una de: ${[...GRADLE_SAFE_TASKS].slice(0, 6).join(', ')}... y android.sh para el emulador`)
  }
}

function checkProcess(name, argv, words, ctx) {
  if (['pkill', 'killall', 'fuser', 'kill-port', 'killport', 'fkill'].includes(name)) deny(`${name} mata procesos por nombre o puerto, incluidos los de otras sesiones`, 'Detén solo tus servidores con serve.sh stop')
  if (name === 'docker' && ['kill', 'stop', 'rm', 'restart', 'rmi'].includes(argv[1]) && ctx.mode === 'live') deny(`docker ${argv[1]} puede detener contenedores de otras sesiones`, '')
  if (name === 'pm2' && ['kill', 'delete', 'stop', 'restart'].includes(argv[1])) deny(`pm2 ${argv[1]} detiene procesos de otras sesiones`, '')
  if (name === 'launchctl' && ['bootout', 'kill', 'stop', 'unload', 'remove'].includes(argv[1])) deny(`launchctl ${argv[1]} detiene servicios del sistema`, '')
  if (name === 'adb' && argv.includes('emu') && argv.includes('kill') && ctx.mode === 'live') deny('adb emu kill puede apagar el emulador de otra sesión', 'Usa android.sh stop <n>')
  // The AVDs of a person may have the real app with its data: nobody
  // uninstalls or clears an app by hand (android.sh only touches its own build).
  if (name === 'adb' && ctx.mode === 'live' && (/(^|[\s;&|'"])(uninstall|root|(pm|package)\s+(clear|reset-permissions))([\s;&|'"]|$)/.test(argv.slice(1).join(' ')) || /\/data\/(data|user(_de)?\/\d+)\/|\/Android\/data\//.test(argv.join(' ')) || argv[argv.length - 1] === 'shell')) deny('adb desinstala o borra los datos de una app del emulador o del teléfono (puede ser la app real con datos)', 'Usa android.sh, que solo instala y abre la build de debug del ticket')
  if (name === 'adb' && (argv.includes('kill-server') || argv.includes('reboot')) && ctx.mode === 'live') deny(`adb ${argv.includes('reboot') ? 'reboot' : 'kill-server'} corta los emuladores y dispositivos de otras sesiones`, '')
  if (name !== 'kill') return
  if (ctx.mode !== 'live') return
  const pids = []
  let sig0 = false
  for (let j = 1; j < argv.length; j++) {
    const a = argv[j]
    if (a === '-l' || a === '-L' || a === '--list') return
    if (a === '-0' || a === '-s0') { sig0 = true; continue }
    if (a === '-s' || a === '-n') { if (argv[j + 1] === '0') sig0 = true; j++; continue }
    if (a === '--') continue
    if (a.startsWith('%')) continue
    if (/^-[A-Za-z0-9]+$/.test(a) && j < argv.length - 1 && !/^-\d+$/.test(argv[j + 1] ?? '')) continue
    if (/^-[A-Za-z]+$/.test(a)) continue
    if (/^-\d+$/.test(a) && j === 1 && argv.length > 2) continue // signal number
    pids.push({ text: a, dyn: words[j].dyn })
  }
  if (sig0) return
  if (!pids.length || ctx.appended) unverifiable('kill sin PIDs explícitos (por ejemplo con xargs o $(...)) puede matar procesos ajenos', 'Detén tus servidores con serve.sh stop o usa kill <pid> con un PID de .claude/evidence/<n>/pids')
  for (const p of pids) {
    if (p.dyn || !/^\d+$/.test(p.text)) unverifiable(`kill con un PID que no es un número literal (${p.text})`, 'Usa serve.sh stop o kill <pid> con un PID de .claude/evidence/<n>/pids')
    if (!pidIsOurs(ctx, p.text)) deny(`kill ${p.text}: ese PID no está en ningún .claude/evidence/*/pids de este proyecto, así que puede ser de otra sesión`, 'Detén solo los procesos que arrancaste con serve.sh')
  }
}

function checkGrep(name, argv, ctx) {
  // ripgrep/ag/ack skip ignored and hidden files unless told otherwise.
  if (['rg', 'ag', 'ack'].includes(name) || (name === 'git' && argv[1] === 'grep')) {
    const unrestricted = argv.some((a) => /^--(hidden|no-ignore[a-z-]*|unrestricted|untracked|no-index|all-types|skip-vcs-ignores)$/.test(a) || /^-u+$/.test(a) || (name === 'ag' && /^-[a-zA-Z]*U/.test(a)))
    const excludes = argv.some((a, i) => /\.env/.test(a) && (/^(-g|--glob|--ignore|--exclude)/.test(argv[i - 1] ?? '') || /^--(glob|ignore|exclude)=/.test(a) || a.startsWith(':!') || a.startsWith(':(exclude)')))
    if (unrestricted && !excludes) deny(`${name === 'git' ? 'git grep' : name} sobre archivos ignorados u ocultos sin excluir .env* puede imprimir secretos`, "Excluye .env* (por ejemplo -g '!.env*') o quita esa opción")
    return
  }
  if (!['grep', 'egrep', 'fgrep'].includes(name)) return
  if (argv.some((a) => /^--include=.*(\.env|envrc)/.test(a))) deny('grep sobre archivos .env imprime secretos', 'Nunca leas .env*')
  let rec = false
  let excl = false
  let explicitPattern = false
  const args = []
  for (let j = 1; j < argv.length; j++) {
    const a = argv[j]
    if (a === '--recursive' || a === '--dereference-recursive') { rec = true; continue }
    if (/^--exclude=.*\.env/.test(a) || /^--exclude=\*$/.test(a)) { excl = true; continue }
    if (/^--(regexp|file)=/.test(a)) { explicitPattern = true; continue }
    if (['-e', '-f', '--regexp', '--file'].includes(a)) { explicitPattern = true; j++; continue }
    if (a.startsWith('--')) continue
    if (['-d', '-D', '-m', '-A', '-B', '-C'].includes(a)) { if (a === '-d' && argv[j + 1] === 'recurse') rec = true; j++; continue }
    if (a.startsWith('-')) { if (/[rR]/.test(a)) rec = true; continue }
    args.push(a)
  }
  if (!rec || excl) return
  const paths = explicitPattern ? args : args.slice(1)
  const wide = !paths.length || paths.some((p) => ['.', './', '..', '*', '~', '/', ctx.cwd, ctx.cwd + '/', ctx.projectDir, os.homedir()].includes(p) || p.startsWith('../') || p.endsWith('/.') || p.startsWith('.claude'))
  if (wide) deny('grep recursivo sobre la raíz del proyecto sin excluir .env* puede imprimir secretos', "Agrega --exclude='.env*', busca dentro de una carpeta concreta (src/) o usa la herramienta Grep, que respeta .gitignore")
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function check(input, env = process.env) {
  const cmd = input?.tool_input?.command
  if (typeof cmd !== 'string' || !cmd.trim()) return null
  const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd()
  const projectDir = env.CLAUDE_PROJECT_DIR || cwd
  const ctx = { mode: 'live', depth: 0, cwd, projectDir, env, vars: new Map(), agent: agentContext(input, cwd, projectDir) }
  // Pipes into a shell interpreter are checked per command (checkShell).
  analyze(cmd, ctx)
  return null
}

async function main() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  let input
  try { input = JSON.parse(raw) } catch { return finish(new Deny('la entrada del hook no es JSON válido', '')) }
  if (!input || typeof input !== 'object') return finish(new Deny('la entrada del hook no es un objeto', ''))
  // MCP tools that merge or approve: blocked for agents, like gh pr merge.
  if (typeof input.tool_name === 'string' && input.tool_name.startsWith('mcp__')) {
    const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd()
    const agent = /merge|approve|submit.*review|create.*review/i.test(input.tool_name) ? agentContext(input, cwd, process.env.CLAUDE_PROJECT_DIR || cwd) : null
    if (agent) return finish(new Deny(`la herramienta ${input.tool_name} integra o aprueba un PR (${agent})`, MERGE_HINT))
    return process.exit(0)
  }
  // Monitor runs its command in the same shell as Bash.
  if (input.tool_name && !['Bash', 'Monitor'].includes(input.tool_name)) return process.exit(0)
  const label = input.agent_id || input.agent_type ? ` (subagente ${input.agent_type || 'sin tipo'})` : ''
  try {
    check(input)
    process.exit(0)
  } catch (e) {
    if (e instanceof Deny) return finish(e, label)
    return finish(new Deny(`error interno del guard (${e?.message ?? e})`, 'Avisa en el issue; mientras tanto el comando queda bloqueado'), label)
  }
}

function finish(e, label = '') {
  process.stderr.write(`racimo-harness guard v${GUARD_VERSION} bloqueó este comando${label}: ${e.message}.${e.hint ? ` ${e.hint}.` : ''} No intentes rodear el bloqueo con otra forma del mismo comando: si de verdad hace falta, comenta en el issue y detente (lo hace una persona).\n`)
  process.exit(2)
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('guard.mjs')) {
  main().catch((e) => finish(new Deny(`error interno del guard (${e?.message ?? e})`, 'Avisa en el issue')))
}

#!/usr/bin/env node
// Claude Code PreToolUse hook for Bash: decides git pushes by where they land.
//
//   allow  every target is a claude/* branch on origin (preview deploy only)
//   ask    anything else: main, staging, other branches, no target named,
//          --all/--tags, force or delete on a claude/* branch, or a command
//          this parser can't read with confidence
//   deny   force-push, delete or prune against main, master or staging
//
// Permission rules match command text, so `Bash(git push origin claude/*)`
// would also allow `git push origin claude/x main`. This parses each push into
// its targets instead, and anything it can't parse becomes "ask", never
// "allow". Commands without a git push produce no output: the normal
// permission flow decides them.
//
// GitHub rulesets on main/staging are the real boundary; this is a
// convenience layer for Claude sessions. Tests: node --test scripts/claude-hooks/

import { pathToFileURL } from 'node:url'

const PROTECTED = new Set(['main', 'master', 'staging'])
const ALLOWED_PREFIX = 'claude/'
const SAFE_BRANCH = /^claude\/[A-Za-z0-9._\/-]+$/
// Options that don't change what is pushed or where.
const BENIGN_LONG = new Set([
  '--set-upstream', '--quiet', '--verbose', '--progress', '--no-progress',
  '--porcelain', '--dry-run', '--atomic', '--no-atomic',
])
const BENIGN_SHORT = new Set(['u', 'q', 'v', 'n'])
// Commands that may share a command line with a push (output plumbing, waits).
const SAFE_COMPANIONS = new Set(['tail', 'head', 'cat', 'echo', 'sleep', 'true', 'cd'])

const RANK = { allow: 0, ask: 1, deny: 2 }
const worst = (a, b) => (RANK[b.decision] > RANK[a.decision] ? b : a)
const ask = (reason) => ({ decision: 'ask', reason })
const deny = (reason) => ({ decision: 'deny', reason })
const allow = (reason) => ({ decision: 'allow', reason })

/**
 * Split a shell command into simple commands. Returns null when it holds
 * constructs this guard won't reason about (substitution, heredocs, loops,
 * redirects other than fd duplication and /dev/null, unbalanced quotes).
 */
export function splitCommands(command) {
  const segments = [[]]
  let word = null
  let quote = null
  const push = () => {
    if (word !== null) segments[segments.length - 1].push(word)
    word = null
  }
  for (let i = 0; i < command.length; i++) {
    const c = command[i]
    if (quote === "'") {
      if (c === "'") quote = null
      else word += c
      continue
    }
    if (quote === '"') {
      if (c === '"') quote = null
      else if (c === '\\' && i + 1 < command.length) word += command[++i]
      else if (c === '$' || c === '`') return null
      else word += c
      continue
    }
    if (c === "'" || c === '"') {
      quote = c
      word = word ?? ''
      continue
    }
    if (c === '\\' && i + 1 < command.length) {
      word = (word ?? '') + command[++i]
      continue
    }
    if (c === '$' || c === '`' || c === '(' || c === ')' || c === '{' || c === '}' || c === '<') return null
    if (c === '>') {
      // Only `N>&M` and `>/dev/null`-style discards are accepted.
      const rest = command.slice(i)
      const m = rest.match(/^>&\d|^>\s*\/dev\/null\b/)
      const prev = word
      if (!m || (prev !== null && !/^\d?$/.test(prev))) return null
      word = null
      i += m[0].length - 1
      continue
    }
    if (c === ';' || c === '|' || c === '&' || c === '\n') {
      push()
      if ((c === '|' || c === '&') && command[i + 1] === c) i++
      segments.push([])
      continue
    }
    if (c === ' ' || c === '\t') {
      push()
      continue
    }
    word = (word ?? '') + c
  }
  if (quote) return null
  push()
  return segments.filter((s) => s.length > 0)
}

/** The arguments after `push`, or null when the segment isn't a git push. */
function pushArgs(words) {
  if (words.length === 0) return null
  const cmd = words[0]
  if (cmd !== 'git' && !cmd.endsWith('/git')) return null
  let i = 1
  while (i < words.length && words[i].startsWith('-')) {
    if (words[i] === '-C') i += 2
    else return { unsafeGlobals: true, args: words.slice(i) }
  }
  if (words[i] !== 'push') return null
  return { unsafeGlobals: false, args: words.slice(i + 1) }
}

const stripHeads = (ref) => ref.replace(/^refs\/heads\//, '')

/** Decide one `git push` from its arguments. */
export function decidePush(args) {
  let force = false
  let del = false
  let prune = false
  let all = false
  let unsure = null
  const positional = []
  let endOfOptions = false

  for (const a of args) {
    if (endOfOptions || !a.startsWith('-') || a === '-') {
      positional.push(a)
      continue
    }
    if (a === '--') {
      endOfOptions = true
      continue
    }
    if (a.startsWith('--')) {
      const name = a.split('=')[0]
      if (BENIGN_LONG.has(name)) continue
      if (name === '--force' || name === '--force-with-lease' || name === '--force-if-includes') force = true
      else if (name === '--delete') del = true
      else if (name === '--prune') prune = true
      else if (name === '--mirror') { all = true; force = true; del = true }
      else if (name === '--all' || name === '--branches' || name === '--tags' || name === '--follow-tags') all = true
      else unsure = unsure ?? `option ${name}`
      continue
    }
    for (const ch of a.slice(1)) {
      if (BENIGN_SHORT.has(ch)) continue
      if (ch === 'f') force = true
      else if (ch === 'd') del = true
      else unsure = unsure ?? `option -${ch}`
    }
  }

  const [remote, ...refspecs] = positional
  const targets = refspecs.map((spec) => {
    const plus = spec.startsWith('+')
    const body = plus ? spec.slice(1) : spec
    const colon = body.lastIndexOf(':')
    const src = colon === -1 ? body : body.slice(0, colon)
    const dst = stripHeads(colon === -1 ? body : body.slice(colon + 1))
    return { dst, force: plus, delete: colon !== -1 && src === '' }
  })

  const destructive = force || del || prune
  const hitsProtected = targets.some((t) => PROTECTED.has(t.dst))
  if ((destructive || targets.some((t) => t.force || t.delete)) && (hitsProtected || all)) {
    return deny(
      'Force-push, delete or prune against main, master or staging (or every branch) is blocked. Ask Joe to do it, or open a PR.'
    )
  }
  if (targets.some((t) => (t.force || t.delete) && PROTECTED.has(t.dst))) {
    return deny('Force-push or delete of a protected branch is blocked.')
  }

  if (unsure) return ask(`Push uses ${unsure}, which this guard doesn't pre-approve.`)
  if (all) return ask('Push of every branch or tag needs approval.')
  if (remote === undefined) return ask('No remote named, so the target depends on git config.')
  if (remote !== 'origin') return ask(`Push to remote "${remote}" needs approval.`)
  if (targets.length === 0) return ask('No branch named, so the target depends on git config.')
  if (hitsProtected) return ask(`Push to ${targets.find((t) => PROTECTED.has(t.dst)).dst} needs approval (it deploys).`)
  if (destructive || targets.some((t) => t.force || t.delete)) {
    return ask('Force-push or delete of a feature branch needs approval.')
  }
  const bad = targets.find((t) => !t.dst.startsWith(ALLOWED_PREFIX) || !SAFE_BRANCH.test(t.dst) || t.dst.includes('..'))
  if (bad) return ask(`Push to ${bad.dst || '(empty)'} needs approval: only claude/* branches are pre-approved.`)
  return allow(`Push to ${targets.map((t) => t.dst).join(', ')} on origin is pre-approved (feature branch, preview deploy only).`)
}

/** Decide a whole Bash command line. Null means "not a push; no opinion". */
export function decide(command) {
  if (typeof command !== 'string' || !/\bpush\b/.test(command) || !/\bgit\b/.test(command)) return null
  const segments = splitCommands(command)
  if (segments === null) return ask("Command mentions git push in a form this guard can't parse.")

  let result = null
  let companionsSafe = true
  for (const words of segments) {
    const parsed = pushArgs(words)
    if (parsed === null) {
      // `do git push`, `env X=1 git push`, `xargs git push`: a push this parser didn't reach.
      const gitAt = words.findIndex((w, i) => i > 0 && (w === 'git' || w.endsWith('/git')))
      if (gitAt !== -1 && words.slice(gitAt + 1).includes('push')) {
        const d = ask('git push is wrapped in another command; asking.')
        result = result ? worst(result, d) : d
        continue
      }
      const name = words[0]
      const gitRead = name === 'git' && ['status', 'log', 'fetch', 'branch', 'rev-parse'].includes(words[1])
      if (!SAFE_COMPANIONS.has(name) && !gitRead) companionsSafe = false
      continue
    }
    const d = parsed.unsafeGlobals ? ask('git global options before push need approval.') : decidePush(parsed.args)
    result = result ? worst(result, d) : d
  }
  if (result === null) return null
  if (result.decision === 'allow' && !companionsSafe) {
    return ask('The push is fine, but it shares a command line with other commands.')
  }
  return result
}

async function main() {
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  let command
  try {
    command = JSON.parse(input)?.tool_input?.command
  } catch {
    return
  }
  let d
  try {
    d = decide(command)
  } catch {
    d = /\bgit\b[\s\S]*\bpush\b/.test(String(command)) ? ask('Push guard failed; asking to be safe.') : null
  }
  if (!d) return
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: d.decision,
        permissionDecisionReason: d.reason,
      },
    })
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()

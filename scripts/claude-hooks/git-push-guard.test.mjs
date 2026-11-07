// Run: node --test scripts/claude-hooks/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { decide } from './git-push-guard.mjs'

const BR = 'claude/affectionate-babbage-yyjfit'

const cases = [
  // Pre-approved: every target is a claude/* branch on origin.
  ['allow', `git push -u origin ${BR}`],
  ['allow', `git push origin ${BR} 2>&1 | tail -3`],
  ['allow', `git push origin HEAD:${BR}`],
  ['allow', `git push origin HEAD:refs/heads/${BR}`],
  ['allow', `git push origin claude/a claude/b`],
  ['allow', `git push --dry-run origin ${BR}`],
  ['allow', `git -C /home/user/hifinder push -u origin ${BR}`],
  ['allow', `cd /home/user/hifinder && git push -u origin ${BR}`],

  // Deploys or depends on config: ask.
  ['ask', 'git push origin staging'],
  ['ask', 'git push origin main'],
  ['ask', 'git push origin HEAD:main'],
  ['ask', `git push origin ${BR}:main`],
  ['ask', `git push origin ${BR} main`], // the `*` glob hole in permission rules
  ['ask', 'git push'],
  ['ask', 'git push origin'],
  ['ask', 'git push origin HEAD'],
  ['ask', 'git push origin feature/x'],
  ['ask', `git push upstream ${BR}`],
  ['ask', 'git push --tags origin'],
  ['ask', `git push --no-verify origin ${BR}`],
  ['ask', `git push -o ci.skip origin ${BR}`],
  ['ask', `git push --force-with-lease origin ${BR}`],
  ['ask', `git push origin +${BR}`],
  ['ask', `git push origin :${BR}`],
  ['ask', `git -c remote.origin.url=x push origin ${BR}`],
  ['ask', `git push origin ${BR} && npm publish`],
  ['ask', `git push origin $(git branch --show-current)`],
  ['ask', `for i in 1 2; do git push -u origin ${BR} && break; sleep 2; done`],
  ['ask', `git push origin claude/../main`],
  ['ask', `env GIT_TRACE=1 git push origin ${BR}`],
  ['ask', `echo x | xargs git push origin`],

  // Destructive against protected branches: deny.
  ['deny', 'git push --force origin main'],
  ['deny', 'git push -f origin staging'],
  ['deny', 'git push origin +main'],
  ['deny', 'git push origin +HEAD:staging'],
  ['deny', 'git push origin :staging'],
  ['deny', 'git push --delete origin main'],
  ['deny', 'git push --mirror origin'],
  ['deny', 'git push --all --force origin'],
  ['deny', `git push --force origin ${BR} main`],
]

for (const [want, cmd] of cases) {
  test(`${want}: ${cmd}`, () => {
    assert.equal(decide(cmd)?.decision, want)
  })
}

test('non-push commands get no opinion', () => {
  for (const cmd of [
    'git status',
    'git commit -m "require approval for every git push"',
    'npm run build',
    'echo push',
    'git log --grep push',
  ]) {
    assert.equal(decide(cmd), null, cmd)
  }
})

test('hook entrypoint prints a PreToolUse decision', () => {
  const script = fileURLToPath(new URL('./git-push-guard.mjs', import.meta.url))
  const run = (command) =>
    execFileSync('node', [script], { input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }) }).toString()
  const out = JSON.parse(run(`git push -u origin ${BR}`))
  assert.equal(out.hookSpecificOutput.hookEventName, 'PreToolUse')
  assert.equal(out.hookSpecificOutput.permissionDecision, 'allow')
  assert.equal(run('git status'), '')
})

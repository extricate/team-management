import { readFileSync, writeFileSync, openSync, readSync, closeSync } from 'fs'
import { execSync, spawn } from 'child_process'
import { fileURLToPath } from 'url'

const VALID_BUMP_TYPES = ['major', 'minor', 'patch']
const MAX_DIFF_LENGTH = 8000
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export function bumpVersion(version, bump) {
  const parts = version.split('.').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid semver version: ${version}`)
  }
  const [major, minor, patch] = parts
  if (bump === 'major') return `${major + 1}.0.0`
  if (bump === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

export function parseClaudeResponse(text) {
  const jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) throw new Error('No JSON found in Claude response')

  let parsed
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('Malformed JSON in Claude response')
  }

  if (!VALID_BUMP_TYPES.includes(parsed.bump)) {
    throw new Error(`Invalid bump type: "${parsed.bump}". Expected major, minor, or patch`)
  }
  if (typeof parsed.message !== 'string' || !parsed.message.trim()) {
    throw new Error(`Invalid commit message: must be a non-empty string`)
  }

  return { bump: parsed.bump, message: parsed.message.trim() }
}

function buildPrompt(diff) {
  const truncated =
    diff.length > MAX_DIFF_LENGTH
      ? diff.substring(0, MAX_DIFF_LENGTH) + '\n... (diff truncated)'
      : diff

  return `Analyze this git diff and return ONLY a valid JSON object — no markdown, no backticks, no explanation — with exactly these two keys:
- "bump": one of "major", "minor", or "patch" (semantic versioning rules):
  - major: breaking API or database changes, removed features
  - minor: new pages, new features, significant new functionality
  - patch: bug fixes, refactors, style tweaks, copy changes, dependency updates, tests
- "message": a concise conventional commit message (e.g. "feat: add team search" or "fix: correct redirect after login")

The project is a Dutch government team management application (Next.js, PostgreSQL).

Git diff:
${truncated}`
}

function findClaudeBin() {
  try {
    const npmBin = execSync('npm -g bin', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
    return `${npmBin}/claude`
  } catch {
    return 'claude'
  }
}

// Synchronously reads one line from /dev/tty, bypassing any stdin redirection.
function readLineFromTTY(prompt) {
  process.stderr.write(prompt)
  const fd = openSync('/dev/tty', 'r+')
  const buf = Buffer.alloc(256)
  let input = ''
  try {
    while (true) {
      const n = readSync(fd, buf, 0, 1, null)
      if (n === 0) break
      const char = buf.toString('utf8', 0, n)
      if (char === '\n' || char === '\r') break
      input += char
    }
  } finally {
    closeSync(fd)
  }
  return input
}

function promptUseAI() {
  if (process.env.NO_AI === '1') return false
  // In non-interactive contexts (CI, pipes) default to yes so commits still work.
  if (!process.stderr.isTTY) return true
  try {
    const answer = readLineFromTTY('Use Claude for commit message and version bump? [Y/n] ')
    process.stderr.write('\n')
    return answer.trim().toLowerCase() !== 'n'
  } catch {
    return true
  }
}

async function callClaudeWithSpinner(prompt, claudeBin) {
  let frameIdx = 0
  const spinner = setInterval(() => {
    process.stderr.write(`\r  ${SPINNER_FRAMES[frameIdx]} Claude is analyzing your changes...`)
    frameIdx = (frameIdx + 1) % SPINNER_FRAMES.length
  }, 80)

  return new Promise((resolve) => {
    const proc = spawn(claudeBin, ['-p', prompt])
    let stdout = ''

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString() })

    const finish = (ok) => {
      clearInterval(spinner)
      process.stderr.write('\r\x1b[K') // erase spinner line
      resolve(ok ? stdout : null)
    }

    proc.on('close', (code) => finish(code === 0))
    proc.on('error', () => finish(false))
  })
}

// Entry point — only runs when invoked directly, not when imported for testing
const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  (async () => {
    const [commitMsgFile, commitSource] = process.argv.slice(2)

    // Skip automated / non-interactive commits
    if (commitSource === 'merge' || commitSource === 'squash' || commitSource === 'commit') {
      process.exit(0)
    }

    let diff
    try {
      diff = execSync('git diff --cached', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
    } catch {
      process.exit(0)
    }

    if (!diff.trim()) process.exit(0)

    if (!promptUseAI()) {
      process.stderr.write('commit-helper: Skipping AI — write your message manually.\n')
      process.exit(0)
    }

    process.stderr.write('\n')
    const claudeBin = findClaudeBin()
    const raw = await callClaudeWithSpinner(buildPrompt(diff), claudeBin)

    if (!raw) {
      process.stderr.write('commit-helper: Claude not available, skipping version bump and message generation.\n')
      process.exit(0)
    }

    let result
    try {
      result = parseClaudeResponse(raw)
    } catch (err) {
      process.stderr.write(`commit-helper: Could not parse Claude response — ${err.message}\n`)
      process.exit(0)
    }

    // Bump version in package.json
    try {
      const pkgPath = new URL('../package.json', import.meta.url).pathname
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      const oldVersion = pkg.version
      pkg.version = bumpVersion(oldVersion, result.bump)
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
      execSync('git add package.json')
      process.stderr.write(`  ✓ ${result.bump} bump · ${oldVersion} → ${pkg.version}\n`)
    } catch (err) {
      process.stderr.write(`commit-helper: Could not bump version — ${err.message}\n`)
    }

    // Pre-fill commit message for the editor
    writeFileSync(commitMsgFile, result.message + '\n')
    process.stderr.write(`  ✓ Message pre-filled — edit or accept it in the next step\n\n`)
  })().catch((err) => {
    process.stderr.write(`commit-helper: Unexpected error — ${err.message}\n`)
    process.exit(0)
  })
}

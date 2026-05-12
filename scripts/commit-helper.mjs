import { readFileSync, writeFileSync } from 'fs'
import { execSync, spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const VALID_BUMP_TYPES = ['major', 'minor', 'patch']
const MAX_DIFF_LENGTH = 8000

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

function callClaude(prompt, claudeBin) {
  const result = spawnSync(claudeBin, ['-p', prompt], {
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  })
  if (result.error || result.status !== 0) return null
  return result.stdout
}

// Entry point — only runs when invoked directly, not when imported for testing
const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
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

  const claudeBin = findClaudeBin()
  const raw = callClaude(buildPrompt(diff), claudeBin)

  if (!raw) {
    process.stderr.write('commit-helper: Claude not available, skipping version bump and message generation\n')
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
    process.stderr.write(`commit-helper: ${oldVersion} → ${pkg.version} (${result.bump} bump)\n`)
  } catch (err) {
    process.stderr.write(`commit-helper: Could not bump version — ${err.message}\n`)
  }

  // Pre-fill commit message for the editor
  writeFileSync(commitMsgFile, result.message + '\n')
}

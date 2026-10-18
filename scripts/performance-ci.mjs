import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const isWindows = process.platform === 'win32'
const previewPort = 4173
const previewUrl = `http://127.0.0.1:${previewPort}`

// Ensure reports output directory exists
const reportDir = resolve(process.cwd(), '.lighthouseci')
if (!existsSync(reportDir)) {
  mkdirSync(reportDir, { recursive: true })
}

// Ensure configuration path is resolved
const configPath = existsSync(resolve(process.cwd(), '.lighthouserc.cjs'))
  ? './.lighthouserc.cjs'
  : existsSync(resolve(process.cwd(), 'lighthouse.config.js'))
    ? './lighthouse.config.js'
    : './.lighthouserc.cjs'

const preview = spawn(
  'npx',
  ['vite', 'preview', '--host', '127.0.0.1', '--port', String(previewPort)],
  {
    stdio: 'ignore',
    detached: !isWindows,
    shell: isWindows,
  }
)

preview.unref()

function killPreview() {
  try {
    if (preview && preview.pid) {
      if (isWindows) {
        spawn('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' })
      } else {
        preview.kill('SIGTERM')
      }
    }
  } catch {}
}

process.on('SIGINT', () => {
  killPreview()
  process.exit(130)
})

process.on('SIGTERM', () => {
  killPreview()
  process.exit(143)
})

async function waitForPreview(maxWaitMs = 180000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < maxWaitMs) {
    try {
      const response = await fetch(previewUrl)
      if (response.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  throw new Error(`Preview server was not ready at ${previewUrl}`)
}

try {
  await waitForPreview()

  // Lighthouse CI is fetched on demand (pinned) instead of being a devDependency:
  // its puppeteer/proxy chain carries advisories, and only this job needs it.
  const lighthouse = spawn(
    'npx',
    ['--yes', '@lhci/cli@0.15.1', 'autorun', `--config=${configPath}`],
    {
      stdio: 'inherit',
      shell: true,
    }
  )

  lighthouse.on('exit', (code) => {
    killPreview()
    process.exit(code ?? 1)
  })

  lighthouse.on('error', (err) => {
    console.error('Failed to run Lighthouse CI:', err)
    killPreview()
    process.exit(1)
  })
} catch (error) {
  killPreview()
  console.error(error)
  process.exit(1)
}

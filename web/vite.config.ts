import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// Build identity shown in Settings. BUILD_NUMBER (e.g. a CI run number) wins; otherwise the git commit count.
function git(args: string): string {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}
const buildNumber = process.env.BUILD_NUMBER || git('rev-list --count HEAD') || '0'
const buildCommit = process.env.BUILD_COMMIT || git('rev-parse --short HEAD') || 'unknown'
// Only tracked changes count as "dirty"; untracked files (binaries, caches) do not.
const buildDirty = git('status --porcelain --untracked-files=no') !== ''
const buildDate = new Date().toISOString().slice(0, 10)

// SPEC: DC-01, FR-UI-01
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
    __BUILD_COMMIT__: JSON.stringify(buildCommit),
    __BUILD_DIRTY__: JSON.stringify(buildDirty),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})

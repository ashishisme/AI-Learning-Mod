import { defineConfig, devices } from '@playwright/test'

// SPEC: §10 Frontend ACs (AC-19..26)
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    // SPEC-011 FR-UI-16: tests start as a learner who has already chosen Standard, so the first-time
    // journey chooser does not cover the page. Chooser and Kids tests set their own storage.
    storageState: 'tests/fixtures/journey-chosen.json',
  },
  // UI-test environment: Go API (tutor defaults to local Ollama) + Vite dev server.
  // Existing servers on :8080 / :3000 are reused, so a manually started stack still works.
  // Override the tutor backend with UI_TEST_AI_BASE_URL / UI_TEST_AI_MODEL.
  webServer: [
    {
      command: 'go run ./cmd/server',
      cwd: '..',
      url: 'http://localhost:8080/api/health',
      reuseExistingServer: true,
      timeout: 120000,
      env: {
        PORT: '8080',
        OPENAI_BASE_URL: process.env.UI_TEST_AI_BASE_URL ?? 'http://localhost:11434/v1',
        OPENAI_MODEL: process.env.UI_TEST_AI_MODEL ?? 'llama3.2:1b',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

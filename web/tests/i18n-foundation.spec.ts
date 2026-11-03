// SPEC: SPEC-009 US3, FR-027, SC-007 (English unchanged while the language foundation ships)
// The text snapshots were recorded from the English UI before any string moved into the catalogue
// (2026-11-03), so a passing run proves the move changed no visible English text.
import { test, expect, Page } from '@playwright/test'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// One platform-neutral baseline (Playwright snapshots are per-OS, and CI runs Linux).
// Record it only on purpose: UPDATE_I18N_BASELINE=1 npx playwright test tests/i18n-foundation.spec.ts
const BASELINE = join(process.cwd(), 'tests', 'fixtures', 'english-text-baseline.json')
const baseline: Record<string, string> = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {}

async function visibleText(page: Page): Promise<string> {
  // Some pages poll, so "network idle" never comes: wait for content, then let it settle.
  await page.getByRole('heading').first().waitFor()
  // Mermaid diagrams render asynchronously: snapshot only once every one has finished.
  await expect(page.getByText('Rendering visual diagram...')).toHaveCount(0, { timeout: 15000 })
  await page.waitForTimeout(800)
  const text = await page.evaluate(() => document.body.innerText.replace(/[ \t]+\n/g, '\n').trim())
  return maskBuild(text)
}

// The build line (number, commit, date) changes with every build, not with the text: mask it.
const maskBuild = (s: string) => s.replace(/Build #\S+ · \S+ · \S+/g, 'Build #… · … · …')

async function signedIn(p: Page, runtime: Record<string, unknown> = {}, session: Record<string, unknown> = {}) {
  await p.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, authRequired: true, tutorEnabled: false, feedbackEnabled: false, ...runtime } }))
  await p.route('**/api/auth/session', (r) => r.fulfill({
    json: { authenticated: true, betaId: 'BETA-7KQ3-M9XP', label: 'School A', expiresAt: '2027-01-01T08:30:00Z', daysLeft: 61, expiringSoon: false, ...session },
  }))
}

test.describe('English foundation (B1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('shows no language switcher while only English is offered', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page.locator('[data-testid="language-switcher"]')).toHaveCount(0)
  })

  const pages: Array<[string, (p: Page) => Promise<void>]> = [
    ['home', async (p) => { await p.goto('/') }],
    ['lesson-standard', async (p) => { await p.goto('/lesson/1-intro') }],
    ['lesson-junior', async (p) => {
      await p.goto('/lesson/1-intro')
      await p.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()
    }],
    ['lesson-plain', async (p) => {
      await p.goto('/lesson/1-intro')
      await p.locator('button[role="tab"]', { hasText: 'Plain English' }).click()
    }],
    ['quiz', async (p) => { await p.goto('/quiz/1-intro') }],
    ['settings', async (p) => {
      await p.goto('/')
      await p.locator('[data-testid="open-settings-btn"]').click()
    }],
    // Recorded 2026-11-03 from the components before T018 converted them.
    ['settings-hosted-local', async (p) => {
      await p.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, tutorEnabled: false } }))
      await p.goto('/')
      await p.locator('[data-testid="open-settings-btn"]').click()
      await p.locator('#local-llm-enabled').check()
    }],
    // Recorded 2026-11-03 from the components before T019/T020 converted them.
    ['feedback', async (p) => {
      await signedIn(p, { feedbackEnabled: true })
      await p.goto('/')
      await p.getByRole('button', { name: 'Feedback' }).click()
    }],
    ['signin', async (p) => {
      await p.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, authRequired: true, tutorEnabled: false, feedbackEnabled: false } }))
      await p.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
      await p.goto('/')
    }],
    ['invite', async (p) => {
      await p.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, authRequired: true, tutorEnabled: false, feedbackEnabled: false } }))
      await p.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
      await p.goto('/invite/example-token')
    }],
    ['signout-confirm', async (p) => {
      await signedIn(p)
      await p.goto('/')
      await p.getByRole('button', { name: 'Sign out' }).click()
    }],
    ['expiry', async (p) => {
      await signedIn(p, {}, { expiresAt: '2026-11-06T08:30:00Z', daysLeft: 3, expiringSoon: true })
      await p.goto('/')
    }],
    // Recorded 2026-11-03 from the components before T021 converted them.
    ['voice-studio', async (p) => {
      await p.goto('/lesson/1-intro')
      await p.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()
      await p.getByRole('button', { name: 'Voice Studio Settings' }).click()
    }],
    // Recorded 2026-11-03 from the widgets before T022 converted them: every adaptive lesson, both modes.
    ...['2-symbolic', '3-neuralnetworks', '4-computervision', '5-nlp', '7-ethics'].flatMap((id): Array<[string, (p: Page) => Promise<void>]> =>
      (['Kids (8–14)', 'Plain English'] as const).map((tab) => [
        `lesson-${tab === 'Plain English' ? 'plain' : 'junior'}-${id}`,
        async (p) => {
          await p.goto(`/lesson/${id}`)
          await p.locator('button[role="tab"]', { hasText: tab }).click()
        },
      ])),
    ...(['How to Use the App', 'How to Use Local LLM', 'About & Freeware'] as const).map((tab, i): [string, (p: Page) => Promise<void>] => [
      `help-${['usage', 'ollama', 'about'][i]}`,
      async (p) => {
        await p.goto('/')
        await p.locator('[data-testid="open-help-btn"]').click()
        await p.getByRole('dialog').getByRole('button', { name: tab }).click()
      },
    ]),
  ]

  for (const [name, open] of pages) {
    test(`English text is unchanged: ${name}`, async ({ page }) => {
      await open(page)
      const text = await visibleText(page)
      if (process.env.UPDATE_I18N_BASELINE === '1') {
        const current = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {}
        writeFileSync(BASELINE, JSON.stringify({ ...current, [name]: text }, null, 2) + '\n')
        return
      }
      expect(baseline[name], `no baseline for ${name}; record it with UPDATE_I18N_BASELINE=1`).toBeDefined()
      expect(text).toBe(baseline[name])
    })
  }

  // Hidden text (aria-label, title, placeholder) is not in the visible-text baseline, so check that
  // every literal key the source passes to t() exists in English; a typo would render as ''.
  test('every key used in the source exists in en.json', () => {
    const en: Record<string, string> = JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'en.json'), 'utf8'))
    const files = (readdirSync(join(process.cwd(), 'src'), { recursive: true }) as string[])
      .filter((f) => /\.tsx?$/.test(f) && !f.includes('admin'))
    const missing: string[] = []
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), 'src', f), 'utf8')
      for (const m of src.matchAll(/\btr?\(\s*['"]([a-z]+\.[A-Za-z0-9_.]+)['"]/g)) {
        if (!(m[1] in en) && !(`${m[1]}.other` in en)) missing.push(`${f}: ${m[1]}`)
      }
    }
    expect(missing).toEqual([])
  })

  test('English pages never fetch another language or the Devanagari font', async ({ page }) => {
    const urls: string[] = []
    page.on('request', (r) => urls.push(r.url()))
    for (const [, open] of pages) {
      await open(page)
      await page.getByRole('heading').first().waitFor()
    }
    await page.waitForTimeout(800)
    expect(urls.filter((u) => /\/hi\.json|NotoSansDevanagari/.test(u))).toEqual([])
  })
})

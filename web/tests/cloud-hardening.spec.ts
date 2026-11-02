// SPEC: SPEC-008 FR-019, FR-021; NFR-SEC-05, AC-27; FR-TUT-04; FR-ADAPT; FR-REV-22; FR-UI-15
import { test, expect, Page } from '@playwright/test'

const lesson = {
  id: 'cloud-test',
  module: 'Test',
  title: 'Cloud Test Lesson',
  order: 1,
  path: 'cloud-test/README.md',
  commitSha: '1234567890123456789012345678901234567890',
  blocks: [{ type: 'markdown', content: 'Sample lesson content.' }],
}

async function mockLesson(page: Page) {
  await page.route('**/api/lessons/cloud-test*', (route) => route.fulfill({ json: lesson }))
}

function sse(token: string) {
  return `data: ${JSON.stringify({ token })}\n\ndata: {"done":true,"cited":true}\n\ndata: [DONE]\n\n`
}

async function askTutor(page: Page, answerToken: string) {
  let sent: { headers: Record<string, string>; body: any } | null = null
  await page.route('**/api/tutor', async (route) => {
    sent = { headers: route.request().headers(), body: route.request().postDataJSON() }
    await route.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: sse(answerToken) })
  })
  await page.goto('/lesson/cloud-test')
  await page.locator('[data-testid="tutor-input"]').fill('What is a perceptron?')
  await page.locator('[data-testid="tutor-submit"]').click()
  await expect(page.locator('[data-testid="tutor-answer"]')).toBeVisible()
  return () => sent!
}

test.describe('Hosted deployment', () => {
  test('hides AI and certificate controls and sends no AI overrides', async ({ page }) => {
    await mockLesson(page)
    await page.route('**/api/runtime', (route) => route.fulfill({ json: { hosted: true } }))
    await page.goto('/lesson/cloud-test')

    await page.locator('[data-testid="open-settings-btn"]').click()
    await expect(page.locator('[data-testid="settings-hosted-note"]')).toBeVisible()
    for (const selector of [
      '#settings-base-url',
      '#settings-api-key',
      '#settings-model',
      '#settings-insecure-tls',
      '#test-connection-btn',
    ]) {
      await expect(page.locator(selector)).toHaveCount(0)
    }
    // Display preferences are still available.
    await expect(page.locator('#theme-dark-btn')).toBeVisible()
    await page.getByRole('button', { name: 'Close settings' }).click()

    const sent = await askTutor(page, 'Fine. [Cloud Test Lesson § Overview]')
    const headers = sent().headers
    expect(Object.keys(headers).filter((h) => h.startsWith('x-ai-'))).toEqual([])
  })

  test('self-hosted keeps the AI controls and sends the Settings overrides', async ({ page }) => {
    await mockLesson(page)
    await page.route('**/api/runtime', (route) => route.fulfill({ json: { hosted: false } }))
    await page.goto('/lesson/cloud-test')
    await page.locator('[data-testid="open-settings-btn"]').click()
    await expect(page.locator('#settings-base-url')).toBeVisible()
    await page.getByRole('button', { name: 'Close settings' }).click()

    const sent = await askTutor(page, 'Fine. [Cloud Test Lesson § Overview]')
    expect(sent().headers['x-ai-base-url']).toBeTruthy()
  })
})

test.describe('Tutor', () => {
  test('shows model output as plain text: no live links, images or markup', async ({ page }) => {
    await mockLesson(page)
    const payload = 'See [click here](https://phish.example) <img src=x onerror=alert(1)> **bold** [Cloud Test Lesson § Overview]'
    await askTutor(page, payload)

    const answer = page.locator('[data-testid="tutor-answer"]')
    await expect(answer).toContainText('[click here](https://phish.example)')
    await expect(answer).toContainText('**bold**')
    await expect(answer.locator('a, img, strong')).toHaveCount(0)
  })

  test('sends the audience mode as its own field, not inside the question', async ({ page }) => {
    await mockLesson(page)
    await page.addInitScript(() =>
      localStorage.setItem('ai-foundations-audience-mode', JSON.stringify({ state: { mode: 'junior' }, version: 0 })),
    )
    const sent = await askTutor(page, 'Ok. [Cloud Test Lesson § Overview]')
    expect(sent().body).toEqual({ lessonId: 'cloud-test', question: 'What is a perceptron?', mode: 'junior' })
  })

  test('the microphone button stops listening when clicked again', async ({ page }) => {
    await mockLesson(page)
    await page.addInitScript(() => {
      const w = window as any
      w.__rec = { starts: 0, stops: 0 }
      w.SpeechRecognition = class {
        onstart: any
        onend: any
        start() {
          w.__rec.starts++
          this.onstart?.()
        }
        stop() {
          w.__rec.stops++
          this.onend?.()
        }
        abort() {}
      }
      try {
        sessionStorage.setItem('ai-coach-mic-consent', 'yes')
      } catch {
        /* storage unavailable */
      }
    })
    await page.goto('/lesson/cloud-test')

    const mic = page.locator('[data-testid="tutor-mic-btn"]')
    await mic.click()
    await expect(mic).toHaveAttribute('title', /Listening/)
    await mic.click()
    await expect(mic).not.toHaveAttribute('title', /Listening/)
    expect(await page.evaluate(() => (window as any).__rec)).toEqual({ starts: 1, stops: 1 })
  })
})

test.describe('Adaptive lessons', () => {
  test('mark complete and quiz stay available in kids mode', async ({ page }) => {
    await page.goto('/lesson/1-intro')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()
    await expect(page.getByText('Chip the Robot', { exact: true })).toBeVisible()

    await expect(page.locator('[data-testid="lesson-quiz-button"]')).toBeVisible()
    const complete = page.locator('[data-testid="mark-complete-button"]')
    await expect(complete).toContainText('Mark Complete')
    await complete.click()
    await expect(complete).toContainText('Completed')

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ai-foundations-progress') || '{}'))
    expect(saved.state.completedLessons['1-intro']).toBe(true)
  })

  test('switching narration to another section does not replay or stop the new track', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as any
      const queued: any[] = []
      w.__spoken = []
      w.SpeechSynthesisUtterance = class {
        text: string
        onend: any
        onerror: any
        constructor(text: string) {
          this.text = text
        }
      }
      // Like browsers: cancel() reports the interrupted utterance asynchronously.
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          speaking: false,
          onvoiceschanged: null,
          getVoices: () => [],
          speak: (u: any) => {
            queued.push(u)
            w.__spoken.push(u.text)
          },
          cancel: () => {
            const pending = queued.splice(0)
            setTimeout(() => pending.forEach((u) => u.onerror?.({ error: 'interrupted' })), 0)
          },
          pause: () => {},
          resume: () => {},
        },
      })
    })
    await page.goto('/lesson/1-intro')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()
    await expect(page.getByText('Chip the Robot', { exact: true })).toBeVisible()

    const sections = page.locator('article')
    await sections.nth(0).getByRole('button', { name: 'Read section' }).click()
    await expect(sections.nth(0).getByRole('button', { name: 'Stop reading section' })).toBeVisible()
    await sections.nth(1).getByRole('button', { name: 'Read section' }).click()

    // Let the browser's late "interrupted" event for section 1 arrive.
    await page.waitForTimeout(250)
    expect(await page.evaluate(() => (window as any).__spoken.length)).toBe(2)
    await expect(sections.nth(1).getByRole('button', { name: 'Stop reading section' })).toBeVisible()
    await expect(sections.nth(0).getByRole('button', { name: 'Read section' })).toBeVisible()
  })

  test('renders mermaid diagrams as SVG', async ({ page }) => {
    await page.route('**/api/lessons/mermaid-test*', (route) => {
      if (route.request().url().includes('mode=')) {
        return route.fulfill({
          json: {
            lessonId: 'mermaid-test',
            mode: 'plain-english',
            title: 'Diagram Lesson',
            sections: [
              {
                id: 's1',
                heading: 'A diagram',
                bodyMarkdown: 'Body text.',
                diagram: { type: 'mermaid', content: 'graph TD; A[Start] --> B[End]', caption: 'Flow', alt: 'Start to end' },
              },
            ],
          },
        })
      }
      return route.fulfill({ json: { ...lesson, id: 'mermaid-test', title: 'Diagram Lesson' } })
    })
    await page.addInitScript(() =>
      localStorage.setItem('ai-foundations-audience-mode', JSON.stringify({ state: { mode: 'plain-english' }, version: 0 })),
    )
    await page.goto('/lesson/mermaid-test')
    const figure = page.locator('figure')
    await expect(figure.locator('[role="img"] svg')).toBeVisible()
    await expect(figure.locator('svg script, svg foreignObject script')).toHaveCount(0)
  })
})

test.describe('Theme', () => {
  test('first click on the theme button leaves dark when the system theme is dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('ai-foundations-theme'))
    await page.reload()

    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)
    await page.locator('[data-testid="theme-toggle-btn"]').click()
    await expect(html).not.toHaveClass(/dark/)
    await page.locator('[data-testid="theme-toggle-btn"]').click()
    await expect(html).toHaveClass(/dark/)
  })
})

// SPEC-008 FR-021a: a hosted learner can point the tutor at an AI on their own computer.
test.describe('Hosted deployment with the learner\'s own local AI', () => {
  const local = 'http://localhost:11434/v1'
  const plan = {
    messages: [{ role: 'system', content: 'SYS' }, { role: 'user', content: 'USER' }],
    maxTokens: 800,
    citation: '[Cloud Test Lesson § Overview]',
    fallback: "I couldn't find that in this lesson.",
  }
  const openAIStream = (...tokens: string[]) =>
    tokens.map((t) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`).join('') + 'data: [DONE]\n\n'

  async function enableLocalAI(page: Page) {
    await mockLesson(page)
    await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, tutorEnabled: false } }))
    await page.route(`${local}/models`, (r) => r.fulfill({ json: { data: [{ id: 'llama3.2:1b' }, { id: 'qwen2.5:0.5b' }] } }))
    await page.goto('/lesson/cloud-test')
    await expect(page.locator('[data-testid="tutor-panel"]')).toHaveCount(0) // hosted tutor is off
    await page.locator('[data-testid="open-settings-btn"]').click()
    await page.locator('#local-llm-enabled').check()
    await expect(page.locator('#local-llm-base-url')).toHaveValue(local)
    await page.locator('#local-llm-test-btn').click()
    await expect(page.getByText('Connection Verified')).toBeVisible()
    await page.locator('#save-settings-btn').click()
    await expect(page.locator('[data-testid="tutor-panel"]')).toBeVisible()
  }

  test('asks the local AI with the server-built prompt and adds the citation', async ({ page }) => {
    let prepared: any = null
    let localBody: any = null
    let serverTutorCalls = 0
    await page.route('**/api/tutor', (r) => { serverTutorCalls++; return r.fulfill({ status: 503, json: { error: 'tutor disabled' } }) })
    await page.route('**/api/tutor/prepare', (r) => { prepared = r.request().postDataJSON(); return r.fulfill({ json: plan }) })
    await page.route(`${local}/chat/completions`, (r) => {
      localBody = r.request().postDataJSON()
      return r.fulfill({ status: 200, headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' }, body: openAIStream('A perceptron is ', 'a single artificial neuron.') })
    })
    await enableLocalAI(page)

    await page.locator('[data-testid="tutor-input"]').fill('What is a perceptron?')
    await page.locator('[data-testid="tutor-submit"]').click()
    await expect(page.locator('[data-testid="tutor-answer"]')).toContainText('A perceptron is a single artificial neuron.')
    await expect(page.locator('[data-testid="tutor-answer"]')).toContainText('Cloud Test Lesson')
    expect(prepared).toMatchObject({ lessonId: 'cloud-test', question: 'What is a perceptron?' })
    expect(localBody).toMatchObject({ model: 'llama3.2:1b', messages: plan.messages, max_tokens: 800, stream: true })
    expect(serverTutorCalls).toBe(0)
  })

  test('shows the safety reply without contacting the local AI', async ({ page }) => {
    let localCalls = 0
    await page.route('**/api/tutor/prepare', (r) => r.fulfill({ json: { safetyReply: 'Let\'s keep personal details private.' } }))
    await page.route(`${local}/chat/completions`, (r) => { localCalls++; return r.abort() })
    await enableLocalAI(page)

    await page.locator('[data-testid="tutor-input"]').fill('My address is 12 Oak Street')
    await page.locator('[data-testid="tutor-submit"]').click()
    await expect(page.locator('[data-testid="tutor-answer"]')).toContainText('keep personal details private')
    expect(localCalls).toBe(0)
  })

  test('refuses an address that is not on this computer', async ({ page }) => {
    await mockLesson(page)
    await page.route('**/api/runtime', (r) => r.fulfill({ json: { hosted: true, tutorEnabled: false } }))
    await page.goto('/lesson/cloud-test')
    await page.locator('[data-testid="open-settings-btn"]').click()
    await page.locator('#local-llm-enabled').check()
    await page.locator('#local-llm-base-url').fill('https://api.openai.com/v1')
    await expect(page.getByRole('alert')).toContainText('Only addresses on this computer')
    await expect(page.locator('#local-llm-test-btn')).toBeDisabled()
    await page.locator('#save-settings-btn').click()
    await expect(page.locator('[data-testid="tutor-panel"]')).toHaveCount(0)
  })
})

// Live UI test against a real local Ollama model (no mocks).
// Skipped automatically when Ollama is not reachable. Override with UI_TEST_AI_BASE_URL / UI_TEST_AI_MODEL.
import { test, expect } from '@playwright/test'

const OLLAMA_ROOT = (process.env.UI_TEST_AI_BASE_URL ?? 'http://localhost:11434/v1').replace(/\/v1\/?$/, '')
const MODEL = process.env.UI_TEST_AI_MODEL ?? 'llama3.2:1b'

let ollamaUp = false

test.beforeAll(async () => {
  try {
    const res = await fetch(`${OLLAMA_ROOT}/api/tags`, { signal: AbortSignal.timeout(3000) })
    const body = (await res.json()) as { models?: { name: string }[] }
    ollamaUp = !!body.models?.some((m) => m.name === MODEL)
  } catch {
    ollamaUp = false
  }
})

test.describe('Tutor with live local Ollama', () => {
  test('answers a lesson question end to end and shows the answer', async ({ page }) => {
    test.skip(!ollamaUp, `Ollama model ${MODEL} not reachable at ${OLLAMA_ROOT}`)
    test.setTimeout(240_000)

    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/lesson/3-neuralnetworks')

    await page.locator('[data-testid="tutor-input"]').fill('What is a perceptron?')
    await page.locator('[data-testid="tutor-submit"]').click()

    const answer = page.locator('[data-testid="tutor-answer"]')
    await expect(answer).toBeVisible({ timeout: 60_000 })
    // Wait for the stream to finish (cursor disappears), then check we got real text
    await expect(page.locator('[data-testid="streaming-cursor"]')).toHaveCount(0, { timeout: 200_000 })
    const text = (await answer.innerText()).trim()
    expect(text.length).toBeGreaterThan(20)
    await expect(page.locator('[data-testid="tutor-error"]')).toHaveCount(0)
  })

  test('safety filter answers kindly without calling the model', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('/lesson/3-neuralnetworks')
    await page.locator('[data-testid="tutor-input"]').fill('My address is 12 Oak Street')
    await page.locator('[data-testid="tutor-submit"]').click()
    const answer = page.locator('[data-testid="tutor-answer"]')
    await expect(answer).toContainText('trusted adult', { timeout: 15_000 })
    await expect(answer).not.toContainText('Oak Street')
  })
})

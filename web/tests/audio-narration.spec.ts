// SPEC: SPEC-004-AUDIO (US-AUD-01..05, AC-AUD-01.1..04.3)
import { test, expect } from '@playwright/test'

test.describe('Audio Narration & Multi-Modal Sound Effects (SPEC-004)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Web Speech API and Web Audio API inside browser context
    await page.addInitScript(() => {
      // Mock SpeechSynthesis
      const mockSynth = {
        speak: (utterance: any) => {
          setTimeout(() => {
            if (utterance.onstart) utterance.onstart()
          }, 10)
        },
        cancel: () => {},
        pause: () => {},
        resume: () => {},
        getVoices: () => [
          { name: 'Google US English', lang: 'en-US', default: true }
        ],
      }
      window.speechSynthesis = mockSynth as any

      // Mock AudioContext
      class MockAudioContext {
        currentTime = 0
        state = 'running'
        resume() { return Promise.resolve() }
        createOscillator() {
          return {
            type: 'sine',
            frequency: { setValueAtTime: () => {} },
            connect: () => {},
            start: () => {},
            stop: () => {},
          }
        }
        createGain() {
          return {
            gain: {
              setValueAtTime: () => {},
              exponentialRampToValueAtTime: () => {},
            },
            connect: () => {},
          }
        }
        get destination() { return {} }
      }
      (window as any).AudioContext = MockAudioContext
    })

    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('AC-AUD-01: Kids mode renders "Listen to Chip! 🔊" mascot audio button', async ({ page }) => {
    await page.goto('/lesson/1-intro')

    // Switch to Kids Mode
    const juniorTab = page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' })
    await juniorTab.click()

    // Chip's audio button must be visible
    const chipAudioBtn = page.locator('button', { hasText: 'Listen to Chip! 🔊' })
    await expect(chipAudioBtn).toBeVisible()

    // Click button to trigger audio
    await chipAudioBtn.click()

    // Button transitions to playing state with stop indicator
    await expect(page.locator('button', { hasText: 'Stop Chip' })).toBeVisible()

    // Clicking again halts speech
    await page.locator('button', { hasText: 'Stop Chip' }).click()
    await expect(page.locator('button', { hasText: 'Listen to Chip! 🔊' })).toBeVisible()
  })

  test('AC-AUD-02: Section cards display accessible audio narration buttons', async ({ page }) => {
    await page.goto('/lesson/1-intro')

    // Switch to Plain English Mode
    const plainTab = page.locator('button[role="tab"]', { hasText: 'Plain English' })
    await plainTab.click()

    // Wait for plain english content to load and verify Read section button is visible
    const firstBtn = page.locator('button', { hasText: 'Read section' }).first()
    await expect(firstBtn).toBeVisible()

    // Click first section audio
    await firstBtn.click()

    // Active button shows Stop
    await expect(page.locator('button', { hasText: 'Stop' }).first()).toBeVisible()
  })

  test('AC-AUD-03: Answering comprehension quiz triggers procedural acoustic feedback', async ({ page }) => {
    await page.goto('/lesson/1-intro')

    // Switch to Kids Mode
    await page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()

    // Answer the first quiz question
    const correctOption = page.locator('button', { hasText: 'An app that unlocks your phone when it sees your face' })
    await expect(correctOption).toBeVisible()
    await correctOption.click()

    // Affirmation message appears
    await expect(page.locator('text=Awesome job, explorer!')).toBeVisible()
  })
})

  test('AC-AUD-04: Audio Studio Voice Persona selector allows switching narrators', async ({ page }) => {
    await page.goto('/lesson/1-intro')

    // Voice studio trigger button is visible
    const voiceBtn = page.locator('button[aria-label="Voice Studio Settings"]')
    await expect(voiceBtn).toBeVisible()

    // Open settings popover
    await voiceBtn.click()

    // Assert all 3 curated personas are selectable
    await expect(page.locator('text=Nova the Storyteller')).toBeVisible()
    await expect(page.locator('text=Prof. Alan')).toBeVisible()
    await expect(page.locator('text=Chip the Companion')).toBeVisible()

    // Select Nova
    await page.locator('button', { hasText: 'Nova the Storyteller' }).click()

    // Voice trigger button updates to Nova
    await expect(page.locator('button[aria-label="Voice Studio Settings"]')).toContainText('Nova')
  })

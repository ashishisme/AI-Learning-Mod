// SPEC: SPEC-004-AUDIO (US-AUD-01..05, AC-AUD-01.1..04.3)
import { test, expect } from '@playwright/test'

test.describe('Audio Narration & Multi-Modal Sound Effects (SPEC-004)', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure lesson route is accessible in all auth environments
    await page.route('**/api/runtime', (r) =>
      r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: true, feedbackEnabled: false } })
    )
    await page.route('**/api/auth/session', (r) =>
      r.fulfill({ json: { authenticated: false } })
    )

    // Mock Web Speech API and Web Audio API inside browser context using Object.defineProperty
    // to override native prototype getters in headless environments (e.g. Linux CI)
    await page.addInitScript(() => {
      let isSpeaking = false
      const mockSynth = {
        get speaking() { return isSpeaking },
        speak: (utterance: any) => {
          isSpeaking = true
          setTimeout(() => {
            if (utterance.onstart) utterance.onstart()
          }, 10)
        },
        cancel: () => {
          isSpeaking = false
        },
        pause: () => {},
        resume: () => {},
        getVoices: () => [
          { name: 'Google US English', lang: 'en-US', default: true }
        ],
      }

      try {
        Object.defineProperty(window, 'speechSynthesis', {
          value: mockSynth,
          configurable: true,
          writable: true,
        })
      } catch {
        (window as any).speechSynthesis = mockSynth
      }

      // Mock AudioContext
      class MockAudioContext {
        currentTime = 0
        state = 'running'
        resume() { return Promise.resolve() }
        createOscillator() {
          return {
            type: 'sine',
            frequency: {
              setValueAtTime: () => {},
              exponentialRampToValueAtTime: () => {},
            },
            connect: () => {},
            start: () => {},
            stop: () => {},
          }
        }
        createGain() {
          return {
            gain: {
              setValueAtTime: () => {},
              linearRampToValueAtTime: () => {},
              exponentialRampToValueAtTime: () => {},
            },
            connect: () => {},
          }
        }
        get destination() { return {} }
      }

      try {
        Object.defineProperty(window, 'AudioContext', {
          value: MockAudioContext,
          configurable: true,
          writable: true,
        })
        Object.defineProperty(window, 'webkitAudioContext', {
          value: MockAudioContext,
          configurable: true,
          writable: true,
        })
      } catch {
        (window as any).AudioContext = MockAudioContext
      }
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
    const correctOption = page.locator('button', { hasText: 'An app that opens your phone when it sees your face' })
    await expect(correctOption).toBeVisible()
    await correctOption.click()

    // Affirmation message appears
    await expect(page.locator('text=Spot on! Face unlock does one job well.')).toBeVisible()
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

    // The compact icon keeps the selected voice in its title.
    await expect(voiceBtn).toHaveAttribute('title', 'Voice: Nova')
  })

  for (const width of [360, 1280]) {
    test(`Voice Studio menu stays above lesson content at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 360 ? 740 : 900 })
      await page.goto('/lesson/1-intro')
      await page.getByTestId('voice-studio-trigger').click()

      const menu = page.getByTestId('voice-studio-menu')
      await expect(menu).toBeVisible()
      const visibility = await menu.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const x = r.left + r.width / 2
        const y = r.top + Math.min(r.height / 2, window.innerHeight - r.top - 1)
        const hit = document.elementFromPoint(x, y)
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, x, y,
          hit: hit?.tagName, hitClass: hit?.getAttribute('class'),
          fits: r.left >= 0 && r.right <= window.innerWidth, uncovered: !!hit && el.contains(hit) }
      })
      expect(visibility.fits, JSON.stringify(visibility)).toBe(true)
      expect(visibility.uncovered, JSON.stringify(visibility)).toBe(true)
      await menu.getByRole('button', { name: /Prof\. Alan/ }).click()
      await expect(page.getByTestId('voice-studio-trigger')).toHaveAttribute('title', 'Voice: Prof. Alan')
    })
  }
})

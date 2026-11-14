// SPEC: FR-ADAPT-01, FR-ADAPT-02, FR-ADAPT-03, FR-ADAPT-06, NFR-PERF-01
import { test, expect } from '@playwright/test'

test.describe('Adaptive Audience Modes (Kids 8-14 & Plain English)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('AC-ADAPT-01: Audience Mode Selector renders with 3 tabs and defaults to Detailed', async ({ page }) => {
    await page.goto('/lesson/1-intro')

    // Mode selector tablist
    const tablist = page.locator('[role="tablist"]')
    await expect(tablist).toBeVisible()

    const standardTab = page.locator('button[role="tab"]', { hasText: 'Detailed' })
    const juniorTab = page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' })
    const plainTab = page.locator('button[role="tab"]', { hasText: 'Plain English' })

    await expect(standardTab).toBeVisible()
    await expect(juniorTab).toBeVisible()
    await expect(plainTab).toBeVisible()

    // Detailed (stored as standard) is selected by default
    await expect(standardTab).toHaveAttribute('aria-selected', 'true')
    await expect(juniorTab).toHaveAttribute('aria-selected', 'false')

    // Our Detailed lesson title (SPEC-013)
    await expect(page.locator('h1[data-testid="lesson-title"]')).toContainText('Artificial Intelligence: Ideas, Approaches and History')
  })

  test('AC-ADAPT-02: Switching to Kids Mode renders Chip the Robot and interactive Turing Widget', async ({ page }) => {
    await page.goto('/lesson/1-intro')

    // Click Kids tab
    const juniorTab = page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' })
    await juniorTab.click()

    // Verify Tab State
    await expect(juniorTab).toHaveAttribute('aria-selected', 'true')

    // Verify Chip Mascot Banner
    await expect(page.getByText('Chip the Robot', { exact: true })).toBeVisible()
    await expect(page.getByText("Let's find out together!")).toBeVisible()

    // Verify Adapted Title
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What Is AI? 🤖')

    // Verify Physical Metaphor Card
    await expect(page.getByText('Everyday Metaphor: Teaching Your Little Cousin')).toBeVisible()

    // SPEC-006: widgets start with a prediction step; take the free-play path
    await page.locator('[data-testid="widget-skip-predict"]').click()

    // Verify Interactive Turing Widget Mini-Game
    const widget = page.getByText('Game: Spot the Computer')
    await expect(widget).toBeVisible()

    // Play the Turing Game: Vote on Terminal B
    const voteBtnB = page.getByRole('button', { name: '👉 Vote: Terminal B is AI' })
    await expect(voteBtnB).toBeVisible()
    await voteBtnB.click()

    // Verify reveal card
    await expect(page.getByText('Spot On!')).toBeVisible()
    await expect(page.getByText('Terminal B sounds like a fact book.')).toBeVisible()

    // Verify Play Again reset button
    const playAgainBtn = page.getByRole('button', { name: 'Play Again' })
    await expect(playAgainBtn).toBeVisible()
    await playAgainBtn.click()

    // Should return to idle vote state
    await expect(voteBtnB).toBeVisible()
  })

  test('AC-ADAPT-03: Switching to Plain English renders non-tech adult analogies and jargon busters', async ({ page }) => {
    await page.goto('/lesson/1-intro')

    // Click Plain English tab
    const plainTab = page.locator('button[role="tab"]', { hasText: 'Plain English' })
    await plainTab.click()

    await expect(plainTab).toHaveAttribute('aria-selected', 'true')

    // Verify Plain English Title
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What AI Really Is, in Plain English 💡')

    // Verify Workplace / Kitchen Analogy
    await expect(page.getByText('Everyday Metaphor: Training a New Colleague')).toBeVisible()

    // Verify Jargon Buster
    await expect(page.getByText('Jargon Buster').first()).toBeVisible()
    await expect(page.locator('strong', { hasText: 'Algorithm' })).toBeVisible()
  })

  test('AC-ADAPT-04: Audience mode choice persists across page reloads in localStorage', async ({ page }) => {
    await page.goto('/lesson/1-intro')

    // Select Kids mode
    await page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()
    await expect(page.getByText('Chip the Robot', { exact: true })).toBeVisible()

    // Reload page
    await page.reload()

    // Should still be in Kids mode without needing to re-click
    const juniorTab = page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' })
    await expect(juniorTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('Chip the Robot', { exact: true })).toBeVisible()
  })

  test('falls back to the standard lesson when a lesson has no adaptive version', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    const lesson = {
      id: 'no-adaptive',
      module: 'general',
      title: 'Lesson Without Adaptive Version',
      order: 99,
      path: 'no-adaptive/README.md',
      commitSha: 'abc',
      blocks: [{ type: 'markdown', content: 'Standard lesson body.' }],
    }
    // The server answers ?mode=junior with the canonical lesson when no adaptive file exists.
    await page.route('**/api/lessons/no-adaptive*', (route) => route.fulfill({ json: lesson }))
    await page.evaluate(() =>
      localStorage.setItem('ai-foundations-audience-mode', JSON.stringify({ state: { mode: 'junior' }, version: 0 })),
    )

    await page.goto('/lesson/no-adaptive')

    await expect(page.locator('[data-testid="lesson-title"]')).toHaveText(lesson.title)
    await expect(page.getByText('Standard lesson body.')).toBeVisible()
    await expect(page.getByText("isn't available for this lesson yet")).toBeVisible()
    expect(pageErrors).toEqual([])
  })
})

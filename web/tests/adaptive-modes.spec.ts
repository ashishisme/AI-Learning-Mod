// SPEC: FR-ADAPT-01, FR-ADAPT-02, FR-ADAPT-03, FR-ADAPT-06, NFR-PERF-01
import { test, expect } from '@playwright/test'

test.describe('Adaptive Audience Modes (Kids 8-14 & Plain English)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('AC-ADAPT-01: Audience Mode Selector renders with 3 tabs and defaults to Standard', async ({ page }) => {
    await page.goto('/lesson/1-intro')

    // Mode selector tablist
    const tablist = page.locator('[role="tablist"]')
    await expect(tablist).toBeVisible()

    const standardTab = page.locator('button[role="tab"]', { hasText: 'Standard' })
    const juniorTab = page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' })
    const plainTab = page.locator('button[role="tab"]', { hasText: 'Plain English' })

    await expect(standardTab).toBeVisible()
    await expect(juniorTab).toBeVisible()
    await expect(plainTab).toBeVisible()

    // Standard is selected by default
    await expect(standardTab).toHaveAttribute('aria-selected', 'true')
    await expect(juniorTab).toHaveAttribute('aria-selected', 'false')

    // Canonical content title
    await expect(page.locator('h1[data-testid="lesson-title"]')).toHaveText('Introduction to AI')
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
    await expect(page.getByText("Let's crack the code together!")).toBeVisible()

    // Verify Adapted Title
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Teaching Robots How to Think 🤖')

    // Verify Physical Metaphor Card
    await expect(page.getByText('Everyday Metaphor: The Martian Puppy')).toBeVisible()

    // Verify Interactive Turing Widget Mini-Game
    const widget = page.getByText('Mini-Game: Can You Spot the Bot?')
    await expect(widget).toBeVisible()

    // Play the Turing Game: Vote on Terminal B
    const voteBtnB = page.getByRole('button', { name: '👉 Vote: Terminal B is AI' })
    await expect(voteBtnB).toBeVisible()
    await voteBtnB.click()

    // Verify reveal card
    await expect(page.getByText('Spot On!')).toBeVisible()
    await expect(page.getByText('Terminal B sounds like a textbook encyclopedia!')).toBeVisible()

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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Understanding Artificial Intelligence in Everyday Terms 💡')

    // Verify Workplace / Kitchen Analogy
    await expect(page.getByText('Everyday Metaphor: The Calculator vs. The Apprentice')).toBeVisible()

    // Verify Jargon Buster
    await expect(page.getByText('Jargon Buster')).toBeVisible()
    await expect(page.locator('strong', { hasText: 'Probabilistic' })).toBeVisible()
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
})

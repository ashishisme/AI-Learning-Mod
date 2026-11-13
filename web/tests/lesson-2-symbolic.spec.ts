// SPEC: SPEC-005 (Curriculum Expansion Lesson 2 - Symbolic AI)
import { test, expect } from '@playwright/test'

test.describe('Lesson 2: Symbolic AI & Expert Systems (SPEC-005)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('AC-SYM-01: Kids Mode renders Lesson 2 with Chip and rule book theme', async ({ page }) => {
    await page.goto('/lesson/2-symbolic')

    // Switch to Kids Mode
    const juniorTab = page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' })
    await juniorTab.click()

    // Title & Chip banner
    await expect(page.locator('h1', { hasText: 'The Giant Book of If-Then Rules' })).toBeVisible()
    await expect(page.getByText('Chip the Robot', { exact: true })).toBeVisible()

    // First section heading
    await expect(page.locator('text=Meet Symbolic AI: Computers That Love Recipes')).toBeVisible()
  })

  test('AC-SYM-02: Interactive Mars Rover Expert System simulator updates rules in real time', async ({ page }) => {
    await page.goto('/lesson/2-symbolic')

    // Switch to Kids Mode
    await page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()

    // SPEC-006: widgets start with a prediction step; take the free-play path
    await page.locator('[data-testid="widget-skip-predict"]').click()

    // Locate simulation widget
    await expect(page.locator('text=The Mars Rover Expert System')).toBeVisible()

    // Check working memory buttons
    const solarBtn = page.locator('button', { hasText: 'Solar Panels:' })
    await expect(solarBtn).toBeVisible()

    // Toggle solar panels to clean
    await solarBtn.click()
    await expect(page.locator('text=Clean & Clear')).toBeVisible()

    // Toggle battery to normal
    const batteryBtn = page.locator('button', { hasText: 'Battery Voltage:' })
    await batteryBtn.click()
    await expect(page.locator('text=Normal (14V)')).toBeVisible()

    // When panels are clean and battery is normal, diagnosis resolves to All Systems Nominal
    await expect(page.locator('text=All Systems Nominal')).toBeVisible()
  })

  test('AC-SYM-02: every rover conclusion comes from a rule that fired, in all 16 switch states', async ({ page }) => {
    await page.goto('/lesson/2-symbolic')
    await page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()
    await page.locator('[data-testid="widget-skip-predict"]').click()

    const conclusion = page.getByTestId('expert-conclusion')
    const switches = ['Solar Panels:', 'Battery Voltage:', 'Antenna Dish:', 'Environment:'].map((label) =>
      page.locator('button', { hasText: label }),
    )
    const check = async () => {
      const rule = Number(await conclusion.getAttribute('data-rule'))
      const fired = await page.locator('[data-testid^="expert-rule-"][data-fired="true"]').count()
      if (rule === 0) expect(fired).toBe(0) // "All Systems Nominal" only when no rule fired
      else await expect(page.getByTestId(`expert-rule-${rule}`)).toHaveAttribute('data-fired', 'true')
    }

    // Gray code: one switch flips per step, so 15 clicks visit all 16 states.
    await check()
    for (let i = 1; i < 16; i++) {
      await switches[Math.log2(i & -i)].click()
      await check()
    }
  })

  test('AC-SYM-02: low battery is never reported as all systems nominal', async ({ page }) => {
    await page.goto('/lesson/2-symbolic')
    await page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()
    await page.locator('[data-testid="widget-skip-predict"]').click()
    const conclusion = page.getByTestId('expert-conclusion')

    // Start: dusty panels, low battery, daytime. Clean the panels: only the battery is low.
    await page.locator('button', { hasText: 'Solar Panels:' }).click()
    await expect(conclusion).toContainText('Battery low')
    await expect(page.getByTestId('expert-rule-6')).toHaveAttribute('data-fired', 'true')

    // At night, low battery means hibernation, from a rule shown on screen.
    await page.locator('button', { hasText: 'Environment:' }).click()
    await expect(conclusion).toContainText('Hibernation')
    await expect(conclusion).toContainText('🌙')
    await expect(page.getByTestId('expert-rule-5')).toHaveAttribute('data-fired', 'true')
  })

  test('AC-SYM-03: Plain English mode renders healthcare & tax software analogies', async ({ page }) => {
    await page.goto('/lesson/2-symbolic')

    // Switch to Plain English
    await page.locator('button[role="tab"]', { hasText: 'Plain English' })
    await page.locator('button[role="tab"]', { hasText: 'Plain English' }).click()

    // Title
    await expect(page.locator('h1', { hasText: 'Knowledge Representation & Expert Systems' })).toBeVisible()

    // Analogy cards
    await expect(page.locator('text=Tax Preparation Software')).toBeVisible()
    await expect(page.locator('text=Hospital Triage Guidelines')).toBeVisible()
  })
})

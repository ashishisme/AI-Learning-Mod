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

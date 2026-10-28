// SPEC: SPEC-005 (Curriculum Expansion Lesson 6 - Ethical and Responsible AI)
import { test, expect } from '@playwright/test'

test.describe('Lesson 6 (7-ethics): Ethical and Responsible AI (SPEC-005)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('AC-ETH-01: Kids Mode renders Lesson 7 with Chip and ethical superpowers theme', async ({ page }) => {
    await page.goto('/lesson/7-ethics')

    // Switch to Kids Mode
    const juniorTab = page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' })
    await juniorTab.click()

    // Title & Chip banner
    await expect(page.locator('h1', { hasText: 'Superpowers with a Moral Compass: AI Ethics' })).toBeVisible()
    await expect(page.getByText('Chip the Robot', { exact: true })).toBeVisible()

    // Section 1 heading
    await expect(page.locator('text=1. The Magic Mirror: Why Data Matters')).toBeVisible()
  })

  test('AC-ETH-02: Interactive Bias Detective widget toggles between raw disparity and audited parity', async ({ page }) => {
    await page.goto('/lesson/7-ethics')

    // Switch to Kids Mode
    await page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()

    // Locate bias detective simulation
    const widget = page.locator('[data-testid="bias-detective-widget"]')
    await expect(widget).toBeVisible()

    // Initially Raw Historical Model
    await expect(widget.locator('text=Skewed Disparity')).toBeVisible()
    await expect(widget.locator('text=Violates 80% Rule')).toBeVisible()

    // Toggle to Audited & Mitigated
    const mitigateBtn = widget.locator('button', { hasText: 'Audited & Mitigated' })
    await expect(mitigateBtn).toBeVisible()
    await mitigateBtn.click()

    // Updates to Fair & Balanced and Meets EEOC 80% Rule
    await expect(widget.locator('text=Fair & Balanced')).toBeVisible()
    await expect(widget.locator('text=Meets EEOC 80% Rule')).toBeVisible()
  })

  test('AC-ETH-03: Plain English mode renders distorted mirror and calibrated scale analogies', async ({ page }) => {
    await page.goto('/lesson/7-ethics')

    // Switch to Plain English
    await page.locator('button[role="tab"]', { hasText: 'Plain English' }).click()

    // Title
    await expect(page.locator('h1', { hasText: 'Ethical and Responsible AI in Plain English' })).toBeVisible()

    // Analogies
    await expect(page.locator('text=The Calibrated Scale')).toBeVisible()
    await expect(page.locator('text=The Dual Key Safeguard')).toBeVisible()
  })
})

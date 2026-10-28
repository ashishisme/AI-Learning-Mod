// SPEC: SPEC-005 (Curriculum Expansion Lesson 4 - Computer Vision & Convolutions)
import { test, expect } from '@playwright/test'

test.describe('Lesson 4: Computer Vision & Convolutions (SPEC-005)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('AC-CV-01: Kids Mode renders Lesson 4 with Chip and robot eyes theme', async ({ page }) => {
    await page.goto('/lesson/4-computervision')

    // Switch to Kids Mode
    const juniorTab = page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' })
    await juniorTab.click()

    // Title & Chip banner
    await expect(page.locator('h1', { hasText: 'Robot Eyes: How Computers Learn to See' })).toBeVisible()
    await expect(page.getByText('Chip the Robot', { exact: true })).toBeVisible()

    // Section 1 heading
    await expect(page.locator('text=1. Tiny Squares: The Pixel Secret')).toBeVisible()
  })

  test('AC-CV-02: Interactive Convolution widget dynamically extracts edge features', async ({ page }) => {
    await page.goto('/lesson/4-computervision')

    // Switch to Kids Mode
    await page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()

    // Locate convolution simulation
    const widget = page.locator('[data-testid="convolution-widget"]')
    await expect(widget).toBeVisible()

    // Verify initial filter is Vertical Edges
    await expect(page.locator('text=Catches vertical lines, tree trunks, and wall boundaries.')).toBeVisible()

    // Select Horizontal Edges preset
    const horizBtn = page.locator('button', { hasText: 'Horizontal Edges' })
    await expect(horizBtn).toBeVisible()
    await horizBtn.click()

    // Description updates
    await expect(page.locator('text=Catches horizontal lines, ground horizons, and table tops.')).toBeVisible()

    // Select Crisp Sharpen preset
    const sharpenBtn = page.locator('button', { hasText: 'Crisp Sharpen' })
    await expect(sharpenBtn).toBeVisible()
    await sharpenBtn.click()

    // Verify calculation box
    await expect(page.locator('text=Output Pixel Value =')).toBeVisible()
  })

  test('AC-CV-03: Plain English mode renders digital mosaic and visual ladder analogies', async ({ page }) => {
    await page.goto('/lesson/4-computervision')

    // Switch to Plain English
    await page.locator('button[role="tab"]', { hasText: 'Plain English' }).click()

    // Title
    await expect(page.locator('h1', { hasText: 'Computer Vision in Plain English: From Pixels to Recognition' })).toBeVisible()

    // Analogies
    await expect(page.locator('text=The Visual Ladder')).toBeVisible()
    await expect(page.locator('text=The Moving Math Filter')).toBeVisible()
  })
})

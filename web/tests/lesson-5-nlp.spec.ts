// SPEC: SPEC-005 (Curriculum Expansion Lesson 5 - Natural Language Processing & Embeddings)
import { test, expect } from '@playwright/test'

test.describe('Lesson 5: Natural Language Processing & Embeddings (SPEC-005)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('AC-NLP-01: Kids Mode renders Lesson 5 with Chip and word puzzle theme', async ({ page }) => {
    await page.goto('/lesson/5-nlp')

    // Switch to Kids Mode
    const juniorTab = page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' })
    await juniorTab.click()

    // Title & Chip banner
    await expect(page.locator('h1', { hasText: 'Teaching Computers How to Talk' })).toBeVisible()
    await expect(page.getByText('Chip the Robot', { exact: true })).toBeVisible()

    // Section 1 heading
    await expect(page.locator('text=1. Slicing Words: The Secret Tokens')).toBeVisible()
  })

  test('AC-NLP-02: Interactive Vector Math widget solves analogies with semantic distance', async ({ page }) => {
    await page.goto('/lesson/5-nlp')

    // Switch to Kids Mode
    await page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()

    // Locate vector math simulation
    const widget = page.locator('[data-testid="vector-math-widget"]')
    await expect(widget).toBeVisible()

    // Verify default equation is Gender Analogies
    await expect(page.locator('text=Subtracting "male" from "King" leaves royalty.')).toBeVisible()

    // Select World Capitals preset
    const geoBtn = widget.locator('button', { hasText: 'World Capitals' })
    await expect(geoBtn).toBeVisible()
    await geoBtn.click()

    // Formula result updates to Tokyo with high match score in the animated result badge
    const resultBadge = widget.locator('.animate-pulse')
    await expect(resultBadge).toContainText('Tokyo')
    await expect(page.locator('text=Removing France from Paris isolates the "Capital city" vector')).toBeVisible()

    // Select Pet Maturity preset
    const petBtn = widget.locator('button', { hasText: 'Pet Maturity' })
    await expect(petBtn).toBeVisible()
    await petBtn.click()

    // Result updates to Kitten in the animated result badge
    await expect(resultBadge).toContainText('Kitten')
  })

  test('AC-NLP-03: Plain English mode renders tokenization and spotlight analogies', async ({ page }) => {
    await page.goto('/lesson/5-nlp')

    // Switch to Plain English
    await page.locator('button[role="tab"]', { hasText: 'Plain English' }).click()

    // Title
    await expect(page.locator('h1', { hasText: 'Natural Language Processing in Plain English: From Words to Meaning' })).toBeVisible()

    // Analogies
    await expect(page.locator('text=The Spotlight Mechanism')).toBeVisible()
    await expect(page.locator('text=The Multi-Dimensional Map')).toBeVisible()
  })
})

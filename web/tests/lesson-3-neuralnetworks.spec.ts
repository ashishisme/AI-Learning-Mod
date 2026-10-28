// SPEC: SPEC-005 (Curriculum Expansion Lesson 3 - Neural Networks & Perceptrons)
import { test, expect } from '@playwright/test'

test.describe('Lesson 3: Introduction to Neural Networks & Perceptrons (SPEC-005)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('AC-NN-01: Kids Mode renders Lesson 3 with Chip and brain spark plugs theme', async ({ page }) => {
    await page.goto('/lesson/3-neuralnetworks')

    // Switch to Kids Mode
    const juniorTab = page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' })
    await juniorTab.click()

    // Title & Chip banner
    await expect(page.locator('h1', { hasText: "Connecting the Brain's Spark Plugs" })).toBeVisible()
    await expect(page.getByText('Chip the Robot', { exact: true })).toBeVisible()

    // Section 1 heading
    await expect(page.locator('text=Brain Cells vs Computer Cells (Meet the Neuron!)')).toBeVisible()
  })

  test('AC-NN-02: Interactive Perceptron widget dynamically classifies fruits', async ({ page }) => {
    await page.goto('/lesson/3-neuralnetworks')

    // Switch to Kids Mode
    await page.locator('button[role="tab"]', { hasText: 'Kids (8–14)' }).click()

    // Locate perceptron simulation
    await expect(page.locator('text=The Single Neuron Fruit Sorter')).toBeVisible()

    // Select Lemon preset
    const lemonBtn = page.locator('button', { hasText: 'Sour & Oblong Lemon' })
    await expect(lemonBtn).toBeVisible()
    await lemonBtn.click()

    // Classification updates to LEMON
    await expect(page.locator('text=Classified as LEMON')).toBeVisible()

    // Select Apple preset
    const appleBtn = page.locator('button', { hasText: 'Sweet & Round Apple' })
    await expect(appleBtn).toBeVisible()
    await appleBtn.click()

    // Classification updates to APPLE
    await expect(page.locator('text=Classified as APPLE')).toBeVisible()
  })

  test('AC-NN-03: Plain English mode renders committee vote & mixer analogies', async ({ page }) => {
    await page.goto('/lesson/3-neuralnetworks')

    // Switch to Plain English
    await page.locator('button[role="tab"]', { hasText: 'Plain English' }).click()

    // Title
    await expect(page.locator('h1', { hasText: 'Introduction to Neural Networks & Perceptrons' })).toBeVisible()

    // Analogies
    await expect(page.locator('text=The Weighted Committee Vote')).toBeVisible()
    await expect(page.locator('text=The Audio Mixing Board')).toBeVisible()
  })
})

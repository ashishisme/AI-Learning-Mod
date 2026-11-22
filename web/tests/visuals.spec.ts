// SPEC: SPEC-011 FR-008, FR-009, FR-015, SC-004
import { test, expect, Page } from '@playwright/test'

async function asKids(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'ai-foundations-audience-mode',
      JSON.stringify({ state: { mode: 'junior', hasChosenJourney: true }, version: 1 })
    )
  })
}

test.describe('Brand Visual Assets (SPEC-011 User Story 3)', () => {
  test('all brand graphics have non-empty alt text or aria-hidden decorative attributes', async ({ page }) => {
    await asKids(page)
    await page.goto('/')

    // Wait for page to load
    await expect(page.getByTestId('kids-home')).toBeVisible()

    // Find all images referencing /brand/
    const brandImages = page.locator('img[src*="/brand/"]')
    const count = await brandImages.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const img = brandImages.nth(i)
      const alt = await img.getAttribute('alt')
      const ariaHidden = await img.getAttribute('aria-hidden')
      const isDecorative = ariaHidden === 'true'

      if (!isDecorative) {
        expect(alt).not.toBeNull()
        expect(alt!.trim().length).toBeGreaterThan(0)
      } else {
        expect(alt === '' || alt === null).toBe(true)
      }
    }
  })

  test('pages remain usable and render fallbacks when brand assets are blocked', async ({ page }) => {
    await asKids(page)

    // Abort all requests to /brand/** simulating privacy/content blocker
    await page.route('**/brand/**', (route) => route.abort())

    await page.goto('/')
    await expect(page.getByTestId('kids-home')).toBeVisible()

    // Fallback boxes should be displayed with role="img" or presentation
    const fallbacks = page.locator('[data-testid^="kid-visual-fallback-"]')
    await expect(fallbacks.first()).toBeVisible()

    // The Continue button is still visible and clickable
    const continueBtn = page.getByTestId('kids-continue-button')
    await expect(continueBtn).toBeVisible()
    await expect(continueBtn).toHaveAttribute('href', '/lesson/1-intro')
  })

  test('visual elements reserve width and height avoiding layout shifts', async ({ page }) => {
    await asKids(page)
    await page.goto('/')

    const brandImages = page.locator('img[src*="/brand/"]')
    const firstImg = brandImages.first()
    await expect(firstImg).toBeVisible()

    // Has explicit width and height attributes or style reservation
    const widthAttr = await firstImg.getAttribute('width')
    const heightAttr = await firstImg.getAttribute('height')
    expect(Number(widthAttr)).toBeGreaterThan(0)
    expect(Number(heightAttr)).toBeGreaterThan(0)

    const box = await firstImg.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })
})

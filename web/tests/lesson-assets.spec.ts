// SPEC: FR-033, FR-034, SC-014
import { test, expect, type Response } from '@playwright/test'

// Needs a real server and lessons ingested with bundled images, as the release build produces.
// Every image a lesson's data refers to must really arrive as an image and really be drawn.
test('every lesson renders all its images with third-party code hosts blocked', async ({ page, request }) => {
  test.setTimeout(180_000)
  const index = await (await request.get('/api/lessons')).json()
  const lessons: { id: string }[] = index.lessons
  expect(lessons.length).toBeGreaterThanOrEqual(6)

  const thirdParty: string[] = []
  await page.route(/githubusercontent\.com|github\.com/, (route) => {
    thirdParty.push(route.request().url())
    return route.abort()
  })
  const violations: string[] = []
  page.on('console', (msg) => {
    if (msg.text().includes('Content Security Policy')) violations.push(msg.text())
  })
  // SPEC-013: every lesson now has our Detailed version. These checks cover the Markdown view, which
  // the page shows when the server answers ?mode=detailed with the standard lesson (no Detailed file).
  await page.route(/\/api\/lessons\/[^/?]+\?mode=detailed/, (route) => {
    const url = new URL(route.request().url())
    url.searchParams.delete('mode')
    return route.continue({ url: url.toString() })
  })
  const responses = new Map<string, Response>()
  page.on('response', (r) => {
    const path = new URL(r.url()).pathname
    if (path.startsWith('/lesson-assets/')) responses.set(path, r)
  })

  const allExpected = new Set<string>()
  for (const { id } of lessons) {
    // What the lesson says it contains, so an image dropped by the renderer cannot go unnoticed.
    const lessonJson = await (await request.get(`/api/lessons/${id}`)).text()
    const expected = new Set(lessonJson.match(/\/lesson-assets\/[0-9a-f]{32}\.[a-z]+/g) ?? [])
    expected.forEach((src) => allExpected.add(src))

    await page.goto(`/lesson/${id}`)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

    for (const src of expected) {
      const img = page.locator(`img[src="${src}"]`).first()
      await expect(img, `${id}: ${src} is missing from the page`).toBeAttached({ timeout: 10_000 })
      await img.scrollIntoViewIfNeeded()
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0 && el.naturalHeight > 0), {
          message: `${id}: ${src} did not decode`,
          timeout: 15_000,
        })
        .toBe(true)
      const box = await img.boundingBox()
      expect(box && box.width > 0 && box.height > 0, `${id}: ${src} takes up no space`).toBe(true)

      const res = responses.get(src)
      expect(res, `${id}: ${src} was not requested`).toBeTruthy()
      expect(res!.status(), src).toBe(200)
      expect(res!.headers()['content-type'], src).toMatch(/^image\//)
    }
    // Nothing on the page may load from anywhere else.
    const others = await page.locator('main img').evaluateAll((els) =>
      els.map((el) => el.getAttribute('src') ?? '').filter((s) => !s.startsWith('/lesson-assets/'))
    )
    expect(others, `${id}: images from outside the app`).toEqual([])
  }

  // The count of the current curriculum pin. Update it deliberately when INGEST_PINNED_SHA changes.
  expect(allExpected.size, 'distinct bundled images across all lessons').toBe(20)
  expect(thirdParty).toEqual([])
  expect(violations).toEqual([])
})

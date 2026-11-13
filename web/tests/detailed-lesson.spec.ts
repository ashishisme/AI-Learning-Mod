// SPEC: SPEC-013 FR-003, FR-004, FR-016 (Detailed lessons in the Standard journey, our own notebook)
import { test, expect } from '@playwright/test'

const detailed = {
  lessonId: '1-intro',
  mode: 'detailed',
  origin: 'own',
  title: 'What AI Is, in Detail',
  colabUrl: 'https://colab.research.google.com/github/ashishisme/AI-Learning-Mod/blob/cloud-beta/notebooks/1-intro.ipynb',
  sections: [
    { heading: 'What it is', bodyMarkdown: 'AI is software that learns patterns from examples.' },
    { heading: 'Worked example', bodyMarkdown: 'Sorting fruit by weight, step by step.' },
  ],
  goFurther: [
    { title: 'A free course', url: 'https://example.org/course', note: 'Short videos.' },
    { title: 'A glossary', url: 'https://example.org/glossary', note: 'Terms explained.' },
    { title: 'A paper', url: 'https://example.org/paper', note: 'For the curious.' },
  ],
}

test.describe('Detailed lessons (SPEC-013)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/runtime', (r) =>
      r.fulfill({ json: { hosted: false, authRequired: false, tutorEnabled: false, feedbackEnabled: false } })
    )
    await page.route('**/api/auth/session', (r) => r.fulfill({ json: { authenticated: false } }))
  })

  test('the Standard journey shows our Detailed lesson with Read section, Go further and our notebook', async ({ page }) => {
    await page.route('**/api/lessons/1-intro?mode=detailed*', (r) => r.fulfill({ json: detailed }))
    await page.goto('/lesson/1-intro')

    await expect(page.getByRole('heading', { name: 'What it is' })).toBeVisible()
    await expect(page.getByTestId('lesson-content')).toHaveCount(0) // not the Markdown view
    await expect(page.getByRole('button', { name: /read section/i })).toHaveCount(2)

    const links = page.getByTestId('go-further-link')
    await expect(links).toHaveCount(3)
    await expect(links.first()).toHaveAttribute('rel', 'noreferrer')

    const colab = page.getByTestId('colab-button')
    await expect(colab).toHaveAttribute('href', detailed.colabUrl)
  })

  test('an own Detailed lesson never links to a notebook outside our repository', async ({ page }) => {
    await page.route('**/api/lessons/1-intro?mode=detailed*', (r) =>
      r.fulfill({ json: { ...detailed, colabUrl: 'https://colab.research.google.com/github/someone-else/x/blob/main/a.ipynb' } })
    )
    await page.goto('/lesson/1-intro')
    await expect(page.getByRole('heading', { name: 'What it is' })).toBeVisible()
    await expect(page.getByTestId('colab-button')).toHaveCount(0)
  })

  test('a lesson without a Detailed version still shows the standard text', async ({ page }) => {
    await page.goto('/lesson/2-symbolic')
    await expect(page.getByTestId('lesson-content')).toBeVisible()
    await expect(page.getByTestId('go-further')).toHaveCount(0)
  })
})

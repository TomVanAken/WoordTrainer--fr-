// @vitest-environment node
import { checkChapters } from '../../scripts/checkChapters.ts'

// Warnings are allowed by the spec (the deploy only fails on errors), so only errors are asserted.
test('the shipped chapters pass check-chapters with no errors', () => {
  expect(checkChapters('public/chapters').errors).toEqual([])
})

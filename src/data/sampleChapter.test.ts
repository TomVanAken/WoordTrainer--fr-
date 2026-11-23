// @vitest-environment node
import { checkChapters } from '../../scripts/checkChapters.ts'

test('the shipped chapters pass check-chapters with no errors and no warnings', () => {
  expect(checkChapters('public/chapters')).toEqual({ errors: [], warnings: [] })
})

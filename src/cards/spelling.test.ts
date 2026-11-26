import { diffMark, editDistance } from './spelling'

test('editDistance', () => {
  expect(editDistance('maison', 'maisson')).toBe(1)
  expect(editDistance('chat', 'chta')).toBe(1) // adjacent swap
  expect(editDistance('Chat', 'chat')).toBe(0)
  expect(editDistance('', 'abc')).toBe(3)
})

test('diffMark marks the differing character and keeps both texts intact', () => {
  const { a, b } = diffMark('maisson', 'maison')
  expect(a.map((s) => s.text).join('')).toBe('maisson')
  expect(b.map((s) => s.text).join('')).toBe('maison')
  expect(a.filter((s) => s.diff).map((s) => s.text).join('')).toBe('s')
  expect(b.some((s) => s.diff)).toBe(false) // pure insertion: nothing to mark in the correction
})

test('diffMark marks a substituted letter on both sides', () => {
  const { a, b } = diffMark('hand', 'hind')
  expect(a.filter((s) => s.diff).map((s) => s.text).join('')).toBe('a')
  expect(b.filter((s) => s.diff).map((s) => s.text).join('')).toBe('i')
})

test('diffMark is case-insensitive', () => {
  const { a } = diffMark('Chat', 'chat')
  expect(a.some((s) => s.diff)).toBe(false)
})

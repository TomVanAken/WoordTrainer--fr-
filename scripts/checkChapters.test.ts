// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { checkChapters } from './checkChapters.ts'

function makeDir(files: Record<string, unknown>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chapters-'))
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), typeof content === 'string' ? content : JSON.stringify(content))
  }
  return dir
}
const chapter = (id: string, entryIds: string[], fr = 'une maison') => ({
  id,
  title: 'T',
  entries: entryIds.map((e) => ({ id: e, fr: [fr], nl: ['het huis'], hint: '' })),
})

test('reports a listed file that does not exist', () => {
  const dir = makeDir({ 'index.json': { chapters: ['ch01.json'] } })
  const r = checkChapters(dir)
  expect(r.errors).toHaveLength(1)
  expect(r.errors[0]).toContain('ch01.json')
})
test('reports invalid JSON and an invalid list', () => {
  expect(checkChapters(makeDir({ 'index.json': { chapters: ['ch01.json'] }, 'ch01.json': '{nope' })).errors).toHaveLength(1)
  expect(checkChapters(makeDir({ 'index.json': { nope: 1 } })).errors).toHaveLength(1)
})
test('reports an entry id used in two chapters', () => {
  const dir = makeDir({
    'index.json': { chapters: ['ch01.json', 'ch02.json'] },
    'ch01.json': chapter('ch01', ['ch01-001']),
    'ch02.json': chapter('ch02', ['ch01-001']),
  })
  const r = checkChapters(dir)
  expect(r.errors.some((e) => e.includes('ch01-001') && e.includes('two chapters'))).toBe(true)
})
test('reports malformed ids (ch3, ch03-14)', () => {
  const dir = makeDir({
    'index.json': { chapters: ['ch3.json', 'ch03.json'] },
    'ch3.json': chapter('ch3', ['ch3-001']),
    'ch03.json': chapter('ch03', ['ch03-14']),
  })
  const r = checkChapters(dir)
  expect(r.errors.some((e) => e.includes('ch3'))).toBe(true)
  expect(r.errors.some((e) => e.includes('ch03-14'))).toBe(true)
})
test('article warnings are warnings, not errors', () => {
  const dir = makeDir({ 'index.json': { chapters: ['ch01.json'] }, 'ch01.json': chapter('ch01', ['ch01-001'], 'la maison') })
  const r = checkChapters(dir)
  expect(r.errors).toEqual([])
  expect(r.warnings).toHaveLength(1)
})
test('an entry without a hint property is a warning, not an error', () => {
  const ch = { id: 'ch01', title: 'T', entries: [{ id: 'ch01-001', fr: ['une maison'], nl: ['het huis'] }] }
  const r = checkChapters(makeDir({ 'index.json': { chapters: ['ch01.json'] }, 'ch01.json': ch }))
  expect(r.errors).toEqual([])
  expect(r.warnings).toHaveLength(1)
  expect(r.warnings[0]).toContain('hint')
})

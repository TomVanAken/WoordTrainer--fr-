import { articleWarnings, validateChapter, validateChapterList } from './validateChapter.ts'

const good = { id: 'ch03', title: 'Hoofdstuk 3', entries: [{ id: 'ch03-001', fr: ['une maison'], nl: ['het huis'] }] }

test('a valid chapter passes and extra fields are dropped', () => {
  const r = validateChapter({ ...good, extra: 1, entries: [{ ...good.entries[0], junk: true }] }, 'ch03.json')
  expect(r).toEqual({ ok: true, value: good })
})
test('id must match the file name', () => expect(validateChapter(good, 'ch04.json').ok).toBe(false))
test.each([
  ['missing title', { ...good, title: '' }],
  ['no entries', { ...good, entries: [] }],
  ['empty nl', { ...good, entries: [{ id: 'ch03-001', fr: ['x'], nl: [] }] }],
  ['blank form', { ...good, entries: [{ id: 'ch03-001', fr: ['  '], nl: ['y'] }] }],
  ['caps not boolean', { ...good, entries: [{ id: 'ch03-001', fr: ['x'], nl: ['y'], frCaps: 'yes' }] }],
  ['duplicate entry id', { ...good, entries: [good.entries[0], good.entries[0]] }],
  ['not an object', 'oops'],
])('rejects %s', (_, data) => expect(validateChapter(data, 'ch03.json').ok).toBe(false))

test('validateChapterList accepts {chapters:[...json]} and rejects other shapes and duplicates', () => {
  expect(validateChapterList({ chapters: ['ch00.json', 'ch01.json'] })).toEqual({ ok: true, value: ['ch00.json', 'ch01.json'] })
  for (const bad of [null, [], {}, { chapters: 'ch00.json' }, { chapters: [''] }, { chapters: ['ch00.txt'] }, { chapters: [1] }, { chapters: ['a.json', 'a.json'] }]) {
    expect(validateChapterList(bad).ok).toBe(false)
  }
})

const chapterWith = (fr: string[]) => ({ id: 'ch01', title: 't', entries: fr.map((f, i) => ({ id: `ch01-00${i}`, fr: [f], nl: ['x'] })) })
test("articleWarnings flags le/la/les/l' forms only", () => {
  expect(articleWarnings(chapterWith(['la maison', "l'école", 'les vacances']))).toHaveLength(3)
  expect(articleWarnings(chapterWith(['une maison', 'à la maison', 'lundi']))).toHaveLength(0)
  expect(articleWarnings(chapterWith(['l’eau']))).toHaveLength(1)
})

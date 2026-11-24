import { articleWarnings, desGenderWarnings, missingHintWarnings, validateChapter, validateChapterList } from './validateChapter.ts'

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
  ['hint not a string', { ...good, entries: [{ id: 'ch03-001', fr: ['x'], nl: ['y'], hint: 3 }] }],
  ['gender not m or f', { ...good, entries: [{ id: 'ch03-001', fr: ['des x'], nl: ['y'], gender: 'n' }] }],
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

const withHint = (hint: unknown) => ({ ...good, entries: [{ ...good.entries[0], hint }] })
test('a hint is kept, trimmed; an empty or blank hint means no hint', () => {
  const r = validateChapter(withHint('  over het weer '), 'ch03.json')
  expect(r.ok && r.value.entries[0].hint).toBe('over het weer')
  for (const empty of ['', '   ']) {
    const e = validateChapter(withHint(empty), 'ch03.json')
    expect(e).toEqual({ ok: true, value: good })
  }
  expect(validateChapter(good, 'ch03.json')).toEqual({ ok: true, value: good })
})
test('missingHintWarnings flags only entries without a hint property', () => {
  const raw = { ...good, entries: [{ id: 'ch03-001', fr: ['x'], nl: ['y'] }, { id: 'ch03-002', fr: ['x'], nl: ['y'], hint: '' }] }
  const w = missingHintWarnings(raw)
  expect(w).toHaveLength(1)
  expect(w[0]).toContain('ch03-001')
  expect(missingHintWarnings('oops')).toEqual([])
})

test('a gender of an entry is kept; des-forms without one are warned about', () => {
  const r = validateChapter({ ...good, entries: [{ id: 'ch03-001', fr: ['des vacances'], nl: ['vakantie'], gender: 'f' }] }, 'ch03.json')
  expect(r.ok && r.value.entries[0].gender).toBe('f')
  const none = validateChapter({ ...good, entries: [{ id: 'ch03-001', fr: ['des vacances'], nl: ['vakantie'] }] }, 'ch03.json')
  expect(none.ok && desGenderWarnings(none.value)).toHaveLength(1)
  expect(r.ok && desGenderWarnings(r.value)).toEqual([])
})

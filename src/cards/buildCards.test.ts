import type { Chapter } from '../types'
import { buildCards, cardsForChapters } from './buildCards'
import { checkAnswer } from './checkAnswer'

const chapters: Chapter[] = [
  {
    id: 'ch1',
    title: 'Een',
    entries: [
      { id: 'ch1-001', fr: ['une maison'], nl: ['het huis', 'de woning'] },
      { id: 'ch1-002', fr: ['Frans'], nl: ['Frans'], nlCaps: true },
    ],
  },
  {
    id: 'ch2',
    title: 'Twee',
    entries: [{ id: 'ch2-001', fr: ['un logement'], nl: ['de woning'] }],
  },
]

test('two cards per entry with ids entryId|direction', () => {
  const cards = buildCards(chapters)
  expect(cards).toHaveLength(6)
  expect(cards.map((c) => c.id)).toContain('ch1-001|fr-nl')
  expect(cards.map((c) => c.id)).toContain('ch1-001|nl-fr')
  const c = cards.find((x) => x.id === 'ch2-001|nl-fr')!
  expect(c.entryId).toBe('ch2-001')
  expect(c.chapterId).toBe('ch2')
  expect(c.direction).toBe('nl-fr')
})

test('prompt joins source forms with " / "', () => {
  const cards = buildCards(chapters)
  expect(cards.find((c) => c.id === 'ch1-001|fr-nl')!.prompt).toBe('une maison')
  expect(cards.find((c) => c.id === 'ch1-001|nl-fr')!.prompt).toBe('het huis / de woning')
})

test('entries sharing a source form accept each other’s answers', () => {
  const cards = buildCards(chapters)
  const c = cards.find((x) => x.id === 'ch1-001|nl-fr')!
  expect(checkAnswer('un logement', c)).toBe(true)
  expect(checkAnswer('une maison', c)).toBe(true)
  expect(c.display).toBe('une maison')
  const other = cards.find((x) => x.id === 'ch2-001|nl-fr')!
  expect(checkAnswer('une maison', other)).toBe(true)
  expect(other.display).toBe('un logement')
})

test('answers carry their own entry’s caps flag and have no duplicates', () => {
  const cards = buildCards(chapters)
  const c = cards.find((x) => x.id === 'ch1-002|fr-nl')!
  expect(c.answers).toEqual([{ text: 'Frans', caseSensitive: true }])
  const m = cards.find((x) => x.id === 'ch1-001|nl-fr')!
  expect(m.answers.map((a) => a.text)).toEqual(['une maison', 'un logement'])
})

test('cardsForChapters keeps only the selected chapters', () => {
  const cards = buildCards(chapters)
  const sel = cardsForChapters(cards, ['ch2'])
  expect(sel).toHaveLength(2)
  expect(sel.every((c) => c.chapterId === 'ch2')).toBe(true)
  expect(cardsForChapters(cards, [])).toEqual([])
})

import type { Card, Progress } from '../types'
import { seeded } from '../test/rng'
import { emptyProgress } from '../progress/rules'
import { ROUND_SIZE, pickExamCards, pickRoundCards } from './select'

const makeCards = (entries: number): Card[] =>
  Array.from({ length: entries }, (_, i) =>
    (['fr-nl', 'nl-fr'] as const).map((direction): Card => ({
      id: `e${i}|${direction}`, entryId: `e${i}`, chapterId: 'ch1', direction,
      prompt: 'p', answers: [{ text: 'a', caseSensitive: false }], display: 'a',
    })),
  ).flat()
const known = (ids: string[]): Progress => {
  const p = emptyProgress()
  for (const id of ids) p.cards[id] = { inARow: 3, wrongTotal: 0 }
  return p
}

test('round: never more than 20, never a known card, never both directions of an entry', () => {
  const cards = makeCards(60)
  const p = known(cards.filter((_, i) => i % 5 === 0).map((c) => c.id))
  for (let seed = 1; seed <= 20; seed++) {
    const picked = pickRoundCards(cards, p, seeded(seed))
    expect(picked).toHaveLength(ROUND_SIZE)
    expect(picked.every((c) => !p.cards[c.id])).toBe(true)
    expect(new Set(picked.map((c) => c.entryId)).size).toBe(picked.length)
  }
})

test('round: fewer unknown cards than 20 gives all of them, one per entry', () => {
  const picked = pickRoundCards(makeCards(7), emptyProgress(), seeded(3))
  expect(picked).toHaveLength(7)
  expect(new Set(picked.map((c) => c.entryId)).size).toBe(7)
})

test('round: an entry with one known direction still offers its other direction', () => {
  const picked = pickRoundCards(makeCards(1), known(['e0|fr-nl']), seeded(1))
  expect(picked.map((c) => c.id)).toEqual(['e0|nl-fr'])
})

test('round: everything known gives an empty array', () => {
  const cards = makeCards(10)
  expect(pickRoundCards(cards, known(cards.map((c) => c.id)), seeded(1))).toEqual([])
})

test('round: a 1-entry chapter gives exactly 1 card', () => {
  expect(pickRoundCards(makeCards(1), emptyProgress(), seeded(1))).toHaveLength(1)
})

test('round: order differs from textbook order for some seed', () => {
  const cards = makeCards(10)
  const textbook = Array.from({ length: 10 }, (_, i) => `e${i}`).join()
  const differs = [1, 2, 3, 4, 5].some(
    (seed) => pickRoundCards(cards, emptyProgress(), seeded(seed)).map((c) => c.entryId).join() !== textbook,
  )
  expect(differs).toBe(true)
})

test('exam: 50 cards out of 120 entries, includes known cards, no entry twice', () => {
  const cards = makeCards(120)
  const p = known(cards.map((c) => c.id))
  const picked = pickExamCards(cards, p, seeded(7))
  expect(picked).toHaveLength(50)
  expect(new Set(picked.map((c) => c.entryId)).size).toBe(50)
  expect(picked.every((c) => p.cards[c.id].inARow >= 3)).toBe(true)
})

test('exam: the 25 highest wrongTotal cards are all included', () => {
  // both directions of an entry get the same wrongTotal, so whichever one is a candidate is hard
  const cards = makeCards(120)
  const p = emptyProgress()
  for (let i = 0; i < 30; i++) {
    p.cards[`e${i}|fr-nl`] = { inARow: 0, wrongTotal: i + 1 }
    p.cards[`e${i}|nl-fr`] = { inARow: 0, wrongTotal: i + 1 }
  }
  for (let seed = 1; seed <= 10; seed++) {
    const picked = pickExamCards(cards, p, seeded(seed))
    expect(picked).toHaveLength(50)
    const entries = new Set(picked.map((c) => c.entryId))
    for (let i = 5; i < 30; i++) expect(entries.has(`e${i}`)).toBe(true)
  }
})

test('exam: fewer than 50 cards in total gives all of them, with pairs far apart', () => {
  const picked = pickExamCards(makeCards(10), emptyProgress(), seeded(5))
  expect(picked).toHaveLength(20)
  expect(new Set(picked.map((c) => c.id)).size).toBe(20)
  for (const c of picked) {
    const idx = picked.map((x, i) => (x.entryId === c.entryId ? i : -1)).filter((i) => i >= 0)
    expect(idx).toHaveLength(2)
    expect(idx[1] - idx[0]).toBeGreaterThanOrEqual(5)
  }
})

test('exam: with 30 entries (60 cards) 50 are picked and the hardest card is kept', () => {
  // only ONE direction is hard: that exact card must be among the 50, whatever the seed
  const p = emptyProgress()
  p.cards['e0|nl-fr'] = { inARow: 0, wrongTotal: 9 }
  for (let seed = 1; seed <= 20; seed++) {
    const picked = pickExamCards(makeCards(30), p, seeded(seed))
    expect(picked).toHaveLength(50)
    expect(new Set(picked.map((c) => c.id)).size).toBe(50)
    expect(picked.map((c) => c.id)).toContain('e0|nl-fr')
  }
})

test('exam: hard cards on one direction only are all in the hard half', () => {
  // 30 cards wrongTotal 1..30, each on the nl-fr direction only; their fr-nl twins are at 0
  const cards = makeCards(120)
  const p = emptyProgress()
  for (let i = 0; i < 30; i++) p.cards[`e${i}|nl-fr`] = { inARow: 0, wrongTotal: i + 1 }
  for (let seed = 1; seed <= 10; seed++) {
    const ids = new Set(pickExamCards(cards, p, seeded(seed)).map((c) => c.id))
    for (let i = 5; i < 30; i++) expect(ids.has(`e${i}|nl-fr`)).toBe(true)
  }
})

test('exam: cards with wrongTotal > 0 outside the top half are still eligible as easy cards', () => {
  const cards = makeCards(120)
  const p = emptyProgress()
  // 40 entries, both directions wrong, wrongTotal 1..40
  for (let i = 0; i < 40; i++) {
    p.cards[`e${i}|fr-nl`] = { inARow: 0, wrongTotal: i + 1 }
    p.cards[`e${i}|nl-fr`] = { inARow: 0, wrongTotal: i + 1 }
  }
  let sawOutsideTop = false
  for (let seed = 1; seed <= 10; seed++) {
    const picked = pickExamCards(cards, p, seeded(seed))
    expect(picked).toHaveLength(50)
    const entries = new Set(picked.map((c) => c.entryId))
    for (let i = 15; i < 40; i++) expect(entries.has(`e${i}`)).toBe(true) // top 25
    if ([...entries].some((e) => Number(e.slice(1)) < 15)) sawOutsideTop = true
  }
  expect(sawOutsideTop).toBe(true)
})

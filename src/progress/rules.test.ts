import type { Card } from '../types'
import {
  awardBadges, chapterStats, emptyProgress, examResumable, isKnown, recordPractice, recordTyped,
} from './rules'

const card = (chapterId: string, n: number): Card => ({
  id: `${chapterId}-${n}|fr-nl`, entryId: `${chapterId}-${n}`, chapterId, direction: 'fr-nl',
  prompt: 'p', answers: [{ text: 'a', caseSensitive: false }], display: 'a',
})
const cards = (chapterId: string, count: number) => Array.from({ length: count }, (_, i) => card(chapterId, i))
const withKnown = (ids: string[]) => {
  let p = emptyProgress()
  for (const id of ids) for (let i = 0; i < 3; i++) p = recordTyped(p, id, true, 'test')
  return p
}

test('known only after 3 correct typed answers in a row', () => {
  let p = emptyProgress()
  p = recordTyped(p, 'a|fr-nl', true, 'test'); p = recordTyped(p, 'a|fr-nl', true, 'exam')
  expect(isKnown(p, 'a|fr-nl')).toBe(false)
  p = recordTyped(p, 'a|fr-nl', true, 'test'); expect(isKnown(p, 'a|fr-nl')).toBe(true)
  p = recordTyped(p, 'a|fr-nl', false, 'exam'); expect(isKnown(p, 'a|fr-nl')).toBe(false)
  expect(p.cards['a|fr-nl'].wrongTotal).toBe(1)
})

test('points: test and exam +3, practice +1, wrong 0', () => {
  let p = emptyProgress()
  p = recordTyped(p, 'a', true, 'test'); expect(p.points).toBe(3)
  p = recordTyped(p, 'a', true, 'exam'); expect(p.points).toBe(6)
  p = recordPractice(p, true); expect(p.points).toBe(7)
  p = recordPractice(p, false); expect(p.points).toBe(7)
  p = recordTyped(p, 'a', false, 'test'); expect(p.points).toBe(7)
  p = recordTyped(p, 'a', false, 'exam'); expect(p.points).toBe(7)
})

test('practice changes nothing but points', () => {
  const p = recordPractice(emptyProgress(), true)
  expect(p).toEqual({ ...emptyProgress(), points: 1 })
})

test('streak counts only in test mode', () => {
  let p = emptyProgress()
  p = recordTyped(p, 'a', true, 'test'); p = recordTyped(p, 'b', true, 'test')
  expect([p.currentStreak, p.bestStreak]).toEqual([2, 2])
  p = recordTyped(p, 'c', false, 'exam')
  expect([p.currentStreak, p.bestStreak]).toEqual([2, 2])
  p = recordTyped(p, 'c', true, 'exam')
  expect([p.currentStreak, p.bestStreak]).toEqual([2, 2])
  p = recordTyped(p, 'd', false, 'test')
  expect([p.currentStreak, p.bestStreak]).toEqual([0, 2])
})

test('does not mutate its input', () => {
  const p = emptyProgress()
  const snapshot = JSON.stringify(p)
  recordTyped(p, 'a', true, 'test'); recordPractice(p, true)
  awardBadges(p, cards('ch01', 2))
  expect(JSON.stringify(p)).toBe(snapshot)
})

test('badge needs strictly more than 85% and is never removed', () => {
  const all = cards('ch01', 20)
  let r = awardBadges(withKnown(all.slice(0, 17).map(c => c.id)), all)
  expect(r.progress.badges).toEqual([]); expect(r.newBadges).toEqual([])
  r = awardBadges(withKnown(all.slice(0, 18).map(c => c.id)), all)
  expect(r.progress.badges).toContain('ch01'); expect(r.newBadges).toEqual(['ch01'])
  const again = awardBadges({ ...r.progress, cards: {} }, all)
  expect(again.progress.badges).toContain('ch01'); expect(again.newBadges).toEqual([])
})

test('a badge of a chapter that is not loaded is kept', () => {
  const p = { ...emptyProgress(), badges: ['ch02'] }
  const r = awardBadges(p, cards('ch01', 3))
  expect(r.progress.badges).toEqual(['ch02']); expect(r.newBadges).toEqual([])
})

test('chapterStats ignores progress for cards no longer in the data', () => {
  const all = cards('ch01', 4)
  const p = withKnown([all[0].id, all[1].id, 'gone|fr-nl'])
  expect(chapterStats(p, [...all, ...cards('ch02', 5)], 'ch01')).toEqual({ known: 2, total: 4, percent: 50 })
  expect(chapterStats(p, all, 'ch09')).toEqual({ known: 0, total: 0, percent: 0 })
  expect(chapterStats(withKnown([all[0].id]), cards('ch01', 3).concat(), 'ch01').percent).toBe(33)
})

test('examResumable is false when one card is missing', () => {
  const byId = new Map(cards('ch01', 2).map(c => [c.id, c]))
  expect(examResumable({ cardIds: ['ch01-0|fr-nl', 'ch01-1|fr-nl'], answers: [] }, byId)).toBe(true)
  expect(examResumable({ cardIds: ['ch01-0|fr-nl', 'zzz'], answers: [] }, byId)).toBe(false)
})

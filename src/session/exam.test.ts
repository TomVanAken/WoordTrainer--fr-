import type { Card, ExamState } from '../types'
import { emptyProgress, isKnown } from '../progress/rules'
import { answerExam, applyExam, createExam, examFinished, scoreExam } from './exam'

const card = (chapterId: string, n: number): Card => ({
  id: `${chapterId}-${n}|fr-nl`, entryId: `${chapterId}-${n}`, chapterId, direction: 'fr-nl',
  prompt: 'p', answers: [{ text: 'ok', caseSensitive: false }], display: 'ok',
})
const many = (chapterId: string, count: number) => Array.from({ length: count }, (_, i) => card(chapterId, i))
const byId = (cards: Card[]) => new Map(cards.map((c) => [c.id, c]))

function runExam(cards: Card[], wrongCount: number) {
  let s = createExam(cards.map((c) => c.id))
  cards.forEach((_, i) => { s = answerExam(s, i < wrongCount ? 'nope' : 'ok') })
  return s
}

test('scoreExam counts correct answers and percent', () => {
  const cards = many('c', 50)
  const s = runExam(cards, 6)
  expect(examFinished(s)).toBe(true)
  const r = scoreExam(s, byId(cards))
  expect(r.correct).toBe(44)
  expect(r.total).toBe(50)
  expect(r.percent).toBe(88)
  expect(r.results[0]).toEqual({ cardId: cards[0].id, typed: 'nope', correct: false })
})

test('examFinished only after every question is answered', () => {
  const s = createExam(['a', 'b'])
  expect(examFinished(s)).toBe(false)
  expect(examFinished(answerExam(s, 'x'))).toBe(false)
  expect(examFinished(answerExam(answerExam(s, 'x'), 'y'))).toBe(true)
})

test('applyExam updates known status, points +3 each, does not touch streak, clears exam', () => {
  const cards = many('c', 4)
  const p = { ...emptyProgress(), currentStreak: 5, bestStreak: 8, exam: createExam(cards.map((c) => c.id)) }
  p.cards[cards[0].id] = { inARow: 2, wrongTotal: 0 }
  const s = runExam(cards, 1) // first wrong, three right
  const { progress } = applyExam(p, scoreExam(s, byId(cards)), cards)
  expect(progress.points).toBe(9)
  expect(progress.currentStreak).toBe(5)
  expect(progress.bestStreak).toBe(8)
  expect(progress.exam).toBeNull()
  expect(progress.cards[cards[0].id]).toEqual({ inARow: 0, wrongTotal: 1 })
  expect(progress.cards[cards[1].id].inARow).toBe(1)
  expect(isKnown(progress, cards[0].id)).toBe(false)
})

test('applyExam awards a badge once the chapter crosses 85%', () => {
  const cards = many('c', 20)
  const p = emptyProgress()
  for (const c of cards.slice(0, 18)) p.cards[c.id] = { inARow: 2, wrongTotal: 0 }
  const r = scoreExam(runExam(cards, 0), byId(cards))
  const first = applyExam(p, r, cards)
  expect(first.newBadges).toEqual(['c'])
  expect(first.progress.badges).toEqual(['c'])
  const again = applyExam(first.progress, r, cards)
  expect(again.newBadges).toEqual([])
  expect(again.progress.badges).toEqual(['c'])
})

test('answerExam stores the gender with each answer and scoreExam uses it', () => {
  const ecole: Card = {
    id: 'e|nl-fr', entryId: 'e', chapterId: 'c', direction: 'nl-fr',
    prompt: 'school', answers: [{ text: 'une école', caseSensitive: false }], display: 'école (f)',
  }
  const ok = card('c', 1)
  let s = createExam([ecole.id, ok.id, ecole.id])
  s = answerExam(s, "l'école", 'f')
  s = answerExam(s, 'ok')
  s = answerExam(s, "l'école", 'm')
  expect(s.answers).toEqual(["l'école", 'ok', "l'école"])
  expect(s.genders).toEqual(['f', null, 'm'])
  const r = scoreExam(s, byId([ecole, ok]))
  expect(r.results.map((x) => x.correct)).toEqual([true, true, false])
  expect(r.results[0].gender).toBe('f')
  expect(r.results[2].gender).toBe('m')
})

test('an exam saved before genders existed still continues and scores', () => {
  const cards = many('c', 3)
  let s: ExamState = { cardIds: cards.map((c) => c.id), answers: ['ok'] } // no genders
  s = answerExam(s, 'ok')
  s = answerExam(s, 'nope')
  expect(s.genders).toEqual([null, null, null])
  expect(scoreExam(s, byId(cards)).correct).toBe(2)
  expect(scoreExam({ cardIds: cards.map((c) => c.id), answers: ['ok', 'ok', 'ok'] }, byId(cards)).correct).toBe(3)
})

test('scoreExam flags a spelling slip as almost, but scores it as wrong', () => {
  const c: Card = { ...card('c', 1), answers: [{ text: 'maandag', caseSensitive: false }], display: 'maandag' }
  const slip = scoreExam(answerExam(createExam([c.id]), 'maandga'), byId([c]))
  const far = scoreExam(answerExam(createExam([c.id]), 'xxxxxxx'), byId([c]))
  expect(slip.results[0].correct).toBe(false)
  expect(slip.results[0].almost).toBe('maandag')
  expect(far.results[0].almost).toBeUndefined()
  expect(slip.percent).toBe(far.percent)
  expect(slip.correct).toBe(0)
})

import type { Card, ExamState, Gender, Progress } from '../types'
import { awardBadges, recordTyped } from '../progress/rules'
import { checkAnswer } from '../cards/checkAnswer'

export function createExam(cardIds: string[]): ExamState {
  return { cardIds, answers: [] }
}

export function answerExam(s: ExamState, typed: string, gender: Gender | null = null): ExamState {
  if (examFinished(s)) return s
  const genders = s.genders ?? s.answers.map(() => null) // an exam saved before genders existed
  return { ...s, answers: [...s.answers, typed], genders: [...genders, gender] }
}

export function examFinished(s: ExamState): boolean {
  return s.answers.length >= s.cardIds.length
}

export interface ExamResult {
  correct: number
  total: number
  percent: number
  results: { cardId: string; typed: string; gender?: Gender; correct: boolean }[]
}

export function scoreExam(s: ExamState, cardsById: Map<string, Card>): ExamResult {
  const results = s.cardIds.map((cardId, i) => {
    const typed = s.answers[i] ?? ''
    const gender = s.genders?.[i] ?? undefined
    const card = cardsById.get(cardId)
    return { cardId, typed, gender, correct: card ? checkAnswer(typed, card, gender) : false }
  })
  const correct = results.filter(r => r.correct).length
  const total = results.length
  return { correct, total, percent: total === 0 ? 0 : Math.round((correct / total) * 100), results }
}

export function applyExam(p: Progress, r: ExamResult, cards: Card[]): { progress: Progress; newBadges: string[] } {
  let progress = p
  for (const res of r.results) progress = recordTyped(progress, res.cardId, res.correct, 'exam')
  const awarded = awardBadges(progress, cards)
  return { progress: { ...awarded.progress, exam: null }, newBadges: awarded.newBadges }
}

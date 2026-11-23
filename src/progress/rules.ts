import type { Card, ExamState, Progress } from '../types'

export const KNOWN_AFTER = 3
export const BADGE_THRESHOLD = 0.85

export function emptyProgress(): Progress {
  return { version: 1, points: 0, currentStreak: 0, bestStreak: 0, badges: [], cards: {}, exam: null }
}

export function isKnown(p: Progress, cardId: string): boolean {
  return (p.cards[cardId]?.inARow ?? 0) >= KNOWN_AFTER
}

export function recordTyped(p: Progress, cardId: string, correct: boolean, mode: 'test' | 'exam'): Progress {
  const prev = p.cards[cardId] ?? { inARow: 0, wrongTotal: 0 }
  const card = correct
    ? { ...prev, inARow: prev.inARow + 1 }
    : { inARow: 0, wrongTotal: prev.wrongTotal + 1 }
  let { currentStreak, bestStreak } = p
  if (mode === 'test') {
    if (correct) {
      currentStreak += 1
      bestStreak = Math.max(bestStreak, currentStreak)
    } else currentStreak = 0
  }
  return {
    ...p,
    points: p.points + (correct ? 3 : 0),
    currentStreak,
    bestStreak,
    cards: { ...p.cards, [cardId]: card },
  }
}

export function recordPractice(p: Progress, knewIt: boolean): Progress {
  return knewIt ? { ...p, points: p.points + 1 } : p
}

export function chapterStats(
  p: Progress, cards: Card[], chapterId: string,
): { known: number; total: number; percent: number } {
  const inChapter = cards.filter(c => c.chapterId === chapterId)
  const total = inChapter.length
  const known = inChapter.filter(c => isKnown(p, c.id)).length
  return { known, total, percent: total === 0 ? 0 : Math.floor((known * 100) / total) }
}

export function awardBadges(p: Progress, cards: Card[]): { progress: Progress; newBadges: string[] } {
  const chapterIds = [...new Set(cards.map(c => c.chapterId))]
  const newBadges = chapterIds.filter(id => {
    if (p.badges.includes(id)) return false
    const { known, total } = chapterStats(p, cards, id)
    return total > 0 && known / total > BADGE_THRESHOLD
  })
  if (newBadges.length === 0) return { progress: p, newBadges }
  return { progress: { ...p, badges: [...p.badges, ...newBadges] }, newBadges }
}

export function examResumable(exam: ExamState, cardsById: Map<string, Card>): boolean {
  return exam.cardIds.every(id => cardsById.has(id))
}

import type { QueueItem, RoundState } from '../types'

export const RETRY_GAP = 3

export function createRound(cardIds: string[]): RoundState {
  return { queue: cardIds.map(cardId => ({ cardId, retry: false })), total: cardIds.length, firstTryCorrect: 0 }
}

export function currentItem(s: RoundState): QueueItem | null {
  return s.queue[0] ?? null
}

export function answerRound(s: RoundState, correct: boolean): RoundState {
  if (s.queue.length === 0) return s
  const [head, ...rest] = s.queue
  if (correct) {
    return { ...s, queue: rest, firstTryCorrect: s.firstTryCorrect + (head.retry ? 0 : 1) }
  }
  const at = Math.min(RETRY_GAP - 1, rest.length)
  const queue = [...rest.slice(0, at), { cardId: head.cardId, retry: true }, ...rest.slice(at)]
  return { ...s, queue }
}

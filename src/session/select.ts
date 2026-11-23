import type { Card, Progress } from '../types'
import { isKnown } from '../progress/rules'
import { shuffle, type Rng } from './random'

export const ROUND_SIZE = 20
export const EXAM_SIZE = 50

function groupByEntry(cards: Card[]): Map<string, Card[]> {
  const groups = new Map<string, Card[]>()
  for (const c of cards) {
    const g = groups.get(c.entryId)
    if (g) g.push(c)
    else groups.set(c.entryId, [c])
  }
  return groups
}

export function pickRoundCards(cards: Card[], p: Progress, rng: Rng): Card[] {
  const unknown = cards.filter(c => !isKnown(p, c.id))
  const picked: Card[] = []
  for (const group of groupByEntry(unknown).values()) {
    picked.push(group[Math.floor(rng() * group.length)])
  }
  return shuffle(picked, rng).slice(0, ROUND_SIZE)
}

export function pickExamCards(cards: Card[], p: Progress, rng: Rng): Card[] {
  const n = Math.min(EXAM_SIZE, cards.length)
  if (n === 0) return []

  const firstPass: Card[] = []
  const secondPass: Card[] = []
  for (const group of shuffle([...groupByEntry(cards).values()], rng)) {
    const i = Math.floor(rng() * group.length)
    firstPass.push(group[i])
    secondPass.push(...group.filter((_, k) => k !== i))
  }
  const candidates = [...firstPass]
  if (candidates.length < n) candidates.push(...shuffle(secondPass, rng).slice(0, n - candidates.length))
  const firstIds = new Set(firstPass.map(c => c.id))

  const wrong = (c: Card) => p.cards[c.id]?.wrongTotal ?? 0
  const hardAll = shuffle(candidates.filter(c => wrong(c) > 0), rng).sort((a, b) => wrong(b) - wrong(a))
  const hard = hardAll.slice(0, Math.floor(n / 2))
  const hardIds = new Set(hard.map(c => c.id))
  const easy = shuffle(candidates.filter(c => wrong(c) === 0), rng)
  let selected = [...hard, ...easy.slice(0, n - hard.length)]
  if (selected.length < n) {
    selected = [...selected, ...hardAll.filter(c => !hardIds.has(c.id)).slice(0, n - selected.length)]
  }

  const partnerSelected = (c: Card) => selected.some(o => o.entryId === c.entryId && o.id !== c.id)
  if (!selected.some(partnerSelected)) return shuffle(selected, rng)

  const first = selected.filter(c => firstIds.has(c.id))
  const paired = shuffle(first.filter(partnerSelected), rng)
  const unpaired = shuffle(first.filter(c => !partnerSelected(c)), rng)
  const second = paired.map(c => selected.find(o => o.entryId === c.entryId && o.id !== c.id)!)
  return [...paired, ...unpaired, ...second]
}

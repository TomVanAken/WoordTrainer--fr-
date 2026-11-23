import { useCallback, useRef, useState } from 'react'
import { Celebration } from '../components/Celebration.tsx'
import { pickRoundCards } from '../session/select.ts'
import { createRound } from '../session/round.ts'
import type { Rng } from '../session/random.ts'
import type { Card, Gender, Progress, RoundState } from '../types.ts'

export type ScreenProps = {
  cards: Card[]
  /** Cards of all loaded chapters; badges need the chapter percentages over everything. */
  allCards?: Card[]
  chapterTitles?: Record<string, string>
  progress: Progress
  update: (fn: (p: Progress) => Progress) => void
  rng: Rng
  onExit: (goToExam?: boolean) => void
}

export type CelebrationItem = { kind: 'badge' | 'record'; label: string }

export const directionLabel = (c: Card) => (c.direction === 'fr-nl' ? 'FR → NL' : 'NL → FR')

/** The word to translate, with its Dutch context hint (if any) underneath, in both directions. */
export function PromptText({ card }: { card: Card }) {
  return (
    <>
      <p className="prompt" data-testid="prompt">
        {card.prompt}
      </p>
      {card.hint && (
        <p className="prompt-hint" data-testid="prompt-hint">
          {card.hint}
        </p>
      )}
    </>
  )
}

/** How his un/une choice is shown next to what he typed: (m) mannelijk, (v) vrouwelijk. */
export const genderLabel = (g: Gender) => (g === 'm' ? 'm' : 'v')

export function useRound({ cards, progress, rng }: Pick<ScreenProps, 'cards' | 'progress' | 'rng'>) {
  const make = () => createRound(pickRoundCards(cards, progress, rng).map((c) => c.id))
  const [round, setRound] = useState<RoundState>(make)
  const [points, setPoints] = useState(0)
  const startBest = useRef(progress.bestStreak)
  const recordShown = useRef(false)
  const restart = () => {
    setRound(make())
    setPoints(0)
    startBest.current = progress.bestStreak
    recordShown.current = false
  }
  return { round, setRound, points, setPoints, restart, startBest, recordShown }
}

export function useCelebrations() {
  const [queue, setQueue] = useState<CelebrationItem[]>([])
  const add = useCallback((items: CelebrationItem[]) => {
    if (items.length) setQueue((q) => [...q, ...items])
  }, [])
  const next = useCallback(() => setQueue((q) => q.slice(1)), [])
  const [first] = queue
  const node = first ? <Celebration key={first.label} kind={first.kind} label={first.label} onDone={next} /> : null
  return { add, node }
}

export function EmptyRound({ onExit }: { onExit: ScreenProps['onExit'] }) {
  return (
    <main className="screen">
      <p>Je kent alle woorden van deze hoofdstukken al! Probeer een Examen.</p>
      <button type="button" className="btn btn-exam" onClick={() => onExit(true)}>
        Examen
      </button>
      <button type="button" className="btn" onClick={() => onExit()}>
        Home
      </button>
    </main>
  )
}

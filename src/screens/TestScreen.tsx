import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { AnswerInput } from '../components/AnswerInput.tsx'
import { checkAnswer } from '../cards/checkAnswer.ts'
import { answerRound, currentItem } from '../session/round.ts'
import { awardBadges, recordTyped } from '../progress/rules.ts'
import { RoundSummary } from './RoundSummary.tsx'
import {
  EmptyRound,
  directionLabel,
  useCelebrations,
  useRound,
  type CelebrationItem,
  type ScreenProps,
} from './roundCommon.tsx'

type Feedback = { correct: boolean; typed: string; retry: boolean; dontKnow: boolean }

export function TestScreen(props: ScreenProps) {
  const { cards, allCards, chapterTitles = {}, progress, update, onExit } = props
  const { round, setRound, points, setPoints, restart, startBest, recordShown } = useRound(props)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const celebrations = useCelebrations()
  const inputRef = useRef<HTMLInputElement>(null)
  // One answer per question, however fast Enter is pressed twice; released by next().
  const answered = useRef(false)

  if (round.total === 0) return <EmptyRound onExit={onExit} />
  const item = currentItem(round)
  if (!item && !feedback) {
    return (
      <>
        {celebrations.node}
        <RoundSummary
          firstTryCorrect={round.firstTryCorrect}
          total={round.total}
          pointsEarned={points}
          onAgain={() => {
            restart()
            answered.current = false
            setFeedback(null)
          }}
          onHome={() => onExit()}
        />
      </>
    )
  }
  const current = item!
  const card = cards.find((c) => c.id === current.cardId)!

  // "Weet ik niet" (dontKnow) counts exactly like a wrong answer.
  const answer = (typed: string, dontKnow: boolean) => {
    if (answered.current) return
    answered.current = true
    const correct = !dontKnow && checkAnswer(typed, card)
    if (!current.retry) {
      // update() runs the callback synchronously on the latest progress, so we can read its result.
      let best = progress.bestStreak
      let newBadges: string[] = []
      update((p) => {
        const awarded = awardBadges(recordTyped(p, card.id, correct, 'test'), allCards ?? cards)
        best = awarded.progress.bestStreak
        newBadges = awarded.newBadges
        return awarded.progress
      })
      if (correct) setPoints((n) => n + 3)
      const items: CelebrationItem[] = []
      // No record on his very first streak ever: there was nothing to beat yet.
      if (startBest.current > 0 && best > startBest.current && !recordShown.current) {
        recordShown.current = true
        items.push({ kind: 'record', label: `Nieuw record! Reeks van ${best}` })
      }
      for (const id of newBadges) {
        items.push({ kind: 'badge', label: `Badge verdiend: ${chapterTitles[id] ?? id}!` })
      }
      celebrations.add(items)
    }
    setFeedback({ correct, typed, retry: current.retry, dontKnow })
  }

  // Render the input again synchronously and focus it inside this click/Enter, so a phone opens
  // its keyboard (iOS ignores a focus() that happens outside a user gesture).
  const next = () => {
    if (!feedback) return
    flushSync(() => {
      setRound(answerRound(round, feedback.correct))
      setFeedback(null)
    })
    answered.current = false
    inputRef.current?.focus()
  }

  return (
    <main className="screen">
      <div className="statbar">
        <span>
          Reeks: <strong data-testid="streak">{progress.currentStreak}</strong>
        </span>
        <span>
          Punten: <strong data-testid="round-points">{points}</strong>
        </span>
      </div>
      <div className="prompt-card">
        <span className="direction">{directionLabel(card)}</span>
        <p className="prompt" data-testid="prompt">
          {card.prompt}
        </p>
      </div>
      {/* During feedback the input is replaced by the feedback; the words and icon say right or
          wrong, not just the colour. */}
      {feedback ? (
        <div className={`feedback ${feedback.correct ? 'feedback-ok' : 'feedback-bad'}`} role="status" data-testid="feedback">
          {feedback.correct ? (
            <p className="feedback-title">
              <span aria-hidden="true">✓</span> {feedback.retry ? 'Goed!' : 'Goed! +3'}
            </p>
          ) : feedback.dontKnow ? (
            <p className="feedback-title">
              <span aria-hidden="true">✗</span> Je wist het niet.
            </p>
          ) : (
            <>
              <p className="feedback-title">
                <span aria-hidden="true">✗</span> Fout
              </p>
              <p>
                Jij typte: <em>{feedback.typed}</em>
              </p>
            </>
          )}
          {!feedback.correct && (
            <p>
              Juist: <strong>{card.display}</strong>
            </p>
          )}
          {/* Focused so Enter on a hardware keyboard continues. */}
          <button type="button" className="btn btn-primary" autoFocus onClick={next}>
            Volgende
          </button>
        </div>
      ) : (
        <AnswerInput
          inputRef={inputRef}
          onSubmit={(typed) => answer(typed, false)}
          onDontKnow={() => answer('', true)}
        />
      )}
      {celebrations.node}
      <button type="button" className="btn btn-link" onClick={() => onExit()}>
        Stoppen
      </button>
    </main>
  )
}

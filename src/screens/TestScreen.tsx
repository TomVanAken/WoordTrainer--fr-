import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { AnswerInput } from '../components/AnswerInput.tsx'
import { asksGender, checkAnswer, nearMiss } from '../cards/checkAnswer.ts'
import { answerRound, currentItem } from '../session/round.ts'
import { awardBadges, recordTyped } from '../progress/rules.ts'
import { markedDisplay, markedTyped } from '../components/Marked.tsx'
import { RoundSummary } from './RoundSummary.tsx'
import type { Gender } from '../types.ts'
import {
  EmptyRound,
  PromptText,
  directionLabel,
  genderLabel,
  useCelebrations,
  useRound,
  type CelebrationItem,
  type ScreenProps,
} from './roundCommon.tsx'

type Feedback = { correct: boolean; typed: string; gender?: Gender; retry: boolean; dontKnow: boolean; almost: string | null }

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
  const answer = (typed: string, dontKnow: boolean, gender?: Gender) => {
    if (answered.current) return
    answered.current = true
    const correct = !dontKnow && checkAnswer(typed, card, gender)
    // Retries score like any other answer.
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
    const almost = !correct && !dontKnow ? nearMiss(typed, card, gender) : null
    setFeedback({ correct, typed, gender, retry: current.retry, dontKnow, almost })
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
        <PromptText card={card} />
      </div>
      {/* During feedback the input is replaced by the feedback; the words and icon say right or
          wrong, not just the colour. */}
      {feedback ? (
        <div className={`feedback ${feedback.correct ? 'feedback-ok' : feedback.almost ? 'feedback-almost' : 'feedback-bad'}`} role="status" data-testid="feedback">
          {feedback.correct ? (
            <p className="feedback-title">
              <span aria-hidden="true">✓</span> Goed! +3
            </p>
          ) : feedback.dontKnow ? (
            <p className="feedback-title">
              <span aria-hidden="true">✗</span> Je wist het niet.
            </p>
          ) : (
            <>
              <p className="feedback-title">
                {feedback.almost ? (
                  <>
                    <span aria-hidden="true">≈</span> Bijna goed, let op de spelling
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">✗</span> Fout
                  </>
                )}
              </p>
              <p>
                Jij typte: <em>{feedback.almost ? markedTyped(feedback.typed, feedback.almost) : feedback.typed}</em>
                {feedback.gender && ` (${genderLabel(feedback.gender)})`}
              </p>
            </>
          )}
          {!feedback.correct && (
            <p>
              Juist: <strong>{feedback.almost ? markedDisplay(card.display, feedback.typed, feedback.almost) : card.display}</strong>
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
          onSubmit={(typed, gender) => answer(typed, false, gender)}
          askGender={asksGender(card)}
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

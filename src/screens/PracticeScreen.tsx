import { useState } from 'react'
import { answerRound, currentItem } from '../session/round.ts'
import { recordPractice } from '../progress/rules.ts'
import { RoundSummary } from './RoundSummary.tsx'
import { EmptyRound, directionLabel, useRound, type ScreenProps } from './roundCommon.tsx'

export function PracticeScreen(props: ScreenProps) {
  const { cards, update, onExit } = props
  const { round, setRound, points, setPoints, restart } = useRound(props)
  const [revealed, setRevealed] = useState(false)

  if (round.total === 0) return <EmptyRound onExit={onExit} />
  const item = currentItem(round)
  if (!item) {
    return (
      <RoundSummary
        firstTryCorrect={round.firstTryCorrect}
        total={round.total}
        pointsEarned={points}
        onAgain={() => {
          restart()
          setRevealed(false)
        }}
        onHome={() => onExit()}
      />
    )
  }
  const card = cards.find((c) => c.id === item.cardId)!

  const answer = (knew: boolean) => {
    if (knew && !item.retry) {
      update((p) => recordPractice(p, true))
      setPoints((n) => n + 1)
    }
    setRound(answerRound(round, knew))
    setRevealed(false)
  }

  return (
    <main className="screen">
      <div className="prompt-card">
        <span className="direction">{directionLabel(card)}</span>
        <p className="prompt" data-testid="prompt">
          {card.prompt}
        </p>
        {revealed && <p className="reveal">{card.display}</p>}
      </div>
      {revealed ? (
        <div className="row">
          <button type="button" className="btn btn-practice" onClick={() => answer(true)}>
            Ik wist het
          </button>
          <button type="button" className="btn" onClick={() => answer(false)}>
            Wist ik niet
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)}>
          Toon antwoord
        </button>
      )}
      <button type="button" className="btn btn-link" onClick={() => onExit()}>
        Stoppen
      </button>
    </main>
  )
}

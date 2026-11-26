import type { ExamResult } from '../session/exam.ts'
import type { Card } from '../types.ts'
import { markedDisplay, markedTyped } from '../components/Marked.tsx'
import { genderLabel } from './roundCommon.tsx'

type Props = { result: ExamResult; cardsById: Map<string, Card>; onHome: () => void }

export function ExamResultView({ result, cardsById, onHome }: Props) {
  const wrong = result.results.filter((r) => !r.correct)
  return (
    <main className="screen">
      <h2>Examen klaar</h2>
      <p className="score-percent" data-testid="exam-percent">
        {result.percent}%
      </p>
      <p className="score-count">
        {result.correct} / {result.total}
      </p>
      {wrong.length === 0 ? (
        <p>Geen fouten, goed gedaan!</p>
      ) : (
        <>
          <h3>Fout beantwoord</h3>
          <ul className="wrong-list" data-testid="wrong-list">
            {wrong.map((r, i) => {
              const card = cardsById.get(r.cardId)
              return (
                <li key={`${r.cardId}-${i}`}>
                  <strong>{card?.prompt}</strong>
                  {card?.hint && <em> ({card.hint})</em>}
                  <br />
                  {r.almost && (
                    <>
                      <span aria-hidden="true">≈</span> Bijna goed, let op de spelling
                      <br />
                    </>
                  )}
                  {r.typed.trim() === '' ? (
                    '(weet ik niet)'
                  ) : (
                    <>
                      Jij typte: <em>{r.almost ? markedTyped(r.typed, r.almost) : r.typed}</em>
                      {r.gender && ` (${genderLabel(r.gender)})`}
                    </>
                  )}
                  <br />
                  Juist: <strong>{r.almost && card ? markedDisplay(card.display, r.typed, r.almost) : card?.display}</strong>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <button type="button" className="btn btn-primary" onClick={onHome}>
        Home
      </button>
    </main>
  )
}

import type { ExamResult } from '../session/exam.ts'
import type { Card } from '../types.ts'
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
                  <br />
                  {r.typed.trim() === '' ? (
                    '(weet ik niet)'
                  ) : (
                    <>
                      Jij typte: <em>{r.typed}</em>
                      {r.gender && ` (${genderLabel(r.gender)})`}
                    </>
                  )}
                  <br />
                  Juist: <strong>{card?.display}</strong>
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

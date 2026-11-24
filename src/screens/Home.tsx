import type { Card, Chapter, Progress } from '../types.ts'
import { chapterStats, examResumable } from '../progress/rules.ts'
import { ChapterTile } from '../components/ChapterTile.tsx'

export type Mode = 'practice' | 'test' | 'exam'

type Props = {
  progress: Progress
  chapters: Chapter[]
  cards: Card[]
  onStart: (mode: Mode) => void
  onResumeExam: () => void
  onSettings: () => void
}

export function Home({ progress, chapters, cards, onStart, onResumeExam, onSettings }: Props) {
  const cardsById = new Map(cards.map((c) => [c.id, c]))
  const exam = progress.exam
  const resumable = exam !== null && examResumable(exam, cardsById)

  return (
    <main className="screen">
      <div className="stats">
        <div className="stat">
          <span className="stat-label">⭐ Punten</span>
          <strong className="stat-value">{progress.points}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">🔥 Beste reeks</span>
          <strong className="stat-value">{progress.bestStreak}</strong>
        </div>
      </div>

      {/* Modes first, so they stay above the fold on a phone as chapters are added. */}
      <div className="modes">
        <button type="button" className="btn btn-practice" onClick={() => onStart('practice')}>
          🃏 Oefenen
        </button>
        <button type="button" className="btn btn-test" onClick={() => onStart('test')}>
          ⚡ Toets
        </button>
        <button type="button" className="btn btn-exam" onClick={() => onStart('exam')}>
          🎓 Examen
        </button>
        {exam !== null && (
          <>
            <button type="button" className="btn btn-resume" disabled={!resumable} onClick={onResumeExam}>
              Examen hervatten
            </button>
            {!resumable && <p className="note">Kan pas verder als alle hoofdstukken geladen zijn.</p>}
          </>
        )}
      </div>

      <ul className="tiles">
        {chapters.map((ch) => {
          const { known, total, percent } = chapterStats(progress, cards, ch.id)
          return (
            <ChapterTile
              key={ch.id}
              title={ch.title}
              known={known}
              total={total}
              percent={percent}
              earned={progress.badges.includes(ch.id)}
            />
          )
        })}
      </ul>

      <button type="button" className="btn btn-link" onClick={onSettings}>
        ⚙️ Instellingen
      </button>
    </main>
  )
}

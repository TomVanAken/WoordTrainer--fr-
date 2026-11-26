import { useState } from 'react'
import type { Chapter, Direction } from '../types.ts'
import type { Mode } from './Home.tsx'

type Props = {
  chapters: Chapter[]
  mode: Mode
  /** An exam is saved; starting a new one replaces it. */
  hasSavedExam?: boolean
  /** `directions` is always both for an exam. */
  onConfirm: (chapterIds: string[], directions: Direction[]) => void
  onBack: () => void
}

const BOTH: Direction[] = ['fr-nl', 'nl-fr']
const DIRECTION_CHOICES: { label: string; value: Direction[] }[] = [
  { label: 'FR → NL', value: ['fr-nl'] },
  { label: 'NL → FR', value: ['nl-fr'] },
  { label: 'Beide richtingen', value: BOTH },
]

const TITLES: Record<Mode, string> = { practice: 'Oefenen', test: 'Toets', exam: 'Examen' }

export function ChapterPicker({ chapters, mode, hasSavedExam, onConfirm, onBack }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(mode === 'exam' ? chapters.map((c) => c.id) : []),
  )

  const [directions, setDirections] = useState<Direction[]>(BOTH)

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <main className="screen">
      <h2>{TITLES[mode]}: kies hoofdstukken</h2>
      <div className="row">
        <button type="button" className="btn btn-small" onClick={() => setSelected(new Set(chapters.map((c) => c.id)))}>
          Alles
        </button>
        <button type="button" className="btn btn-small" onClick={() => setSelected(new Set())}>
          Niets
        </button>
      </div>
      {mode !== 'exam' && (
        <fieldset className="checks">
          <legend>Richting</legend>
          {DIRECTION_CHOICES.map((d) => (
            <label key={d.label} className="check">
              <input
                type="radio"
                name="direction"
                checked={d.value.join() === directions.join()}
                onChange={() => setDirections(d.value)}
              />
              <span>{d.label}</span>
            </label>
          ))}
        </fieldset>
      )}
      <ul className="checks">
        {chapters.map((ch) => (
          <li key={ch.id}>
            <label className="check">
              <input type="checkbox" checked={selected.has(ch.id)} onChange={() => toggle(ch.id)} />
              <span>{ch.title}</span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-primary"
        disabled={selected.size === 0}
        onClick={() =>
          onConfirm(
            chapters.filter((c) => selected.has(c.id)).map((c) => c.id),
            mode === 'exam' ? BOTH : directions,
          )
        }
      >
        {mode === 'exam' && hasSavedExam ? 'Nieuw examen (het vorige vervalt)' : 'Starten'}
      </button>
      <button type="button" className="btn btn-link" onClick={onBack}>
        ← Terug
      </button>
    </main>
  )
}

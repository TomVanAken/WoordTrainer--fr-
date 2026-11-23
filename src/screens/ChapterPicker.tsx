import { useState } from 'react'
import type { Chapter } from '../types.ts'
import type { Mode } from './Home.tsx'

type Props = {
  chapters: Chapter[]
  mode: Mode
  onConfirm: (chapterIds: string[]) => void
  onBack: () => void
}

const TITLES: Record<Mode, string> = { practice: 'Oefenen', test: 'Test', exam: 'Examen' }

export function ChapterPicker({ chapters, mode, onConfirm, onBack }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(mode === 'exam' ? chapters.map((c) => c.id) : []),
  )

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
        onClick={() => onConfirm(chapters.filter((c) => selected.has(c.id)).map((c) => c.id))}
      >
        Starten
      </button>
      <button type="button" className="btn btn-link" onClick={onBack}>
        ← Terug
      </button>
    </main>
  )
}

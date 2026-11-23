import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Chapter } from '../types.ts'
import type { LoadResult } from '../data/loadChapters.ts'

type Props = {
  load: () => Promise<LoadResult>
  children: (chapters: Chapter[], failed: string[]) => ReactNode
}

export function ChapterGate({ load, children }: Props) {
  const [result, setResult] = useState<LoadResult | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])

  const run = useCallback(() => {
    setResult(null)
    setDismissed([])
    let cancelled = false
    load()
      .catch((): LoadResult => ({ status: 'error' }))
      .then((r) => {
        if (!cancelled) setResult(r)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  useEffect(() => run(), [run])

  if (result === null) return <p>Woorden laden…</p>

  if (result.status === 'error') {
    return (
      <div>
        <p>De woorden konden niet geladen worden.</p>
        <button type="button" onClick={run}>
          Opnieuw proberen
        </button>
      </div>
    )
  }

  return (
    <>
      {result.failed
        .filter((name) => !dismissed.includes(name))
        .map((name) => (
          <div key={name} role="status" className="notice">
            <span>
              <em>{name}</em> kon niet geladen worden.
            </span>{' '}
            <button type="button" aria-label="Sluiten" onClick={() => setDismissed((d) => [...d, name])}>
              ×
            </button>
          </div>
        ))}
      {children(result.chapters, result.failed)}
    </>
  )
}

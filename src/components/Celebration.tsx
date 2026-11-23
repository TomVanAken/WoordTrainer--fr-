import { useEffect } from 'react'

type Props = { kind: 'badge' | 'record'; label: string; onDone: () => void }

const AUTO_DISMISS_MS = 1500

// Non-modal banner: it never blocks the input and dismisses itself.
export function Celebration({ kind, label, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className={`celebration celebration-${kind}`} role="status">
      <span aria-hidden="true">{kind === 'badge' ? '🏅' : '🔥'}</span>
      <span className="celebration-label">{label}</span>
      <button type="button" aria-label="Sluiten" onClick={onDone}>
        ✕
      </button>
    </div>
  )
}

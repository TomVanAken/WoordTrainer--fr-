import { useState } from 'react'

type Props = { onReset: () => void; onBack: () => void }

export function Settings({ onReset, onBack }: Props) {
  const [confirming, setConfirming] = useState(false)

  return (
    <main className="screen">
      <h2>Instellingen</h2>
      {confirming ? (
        <div className="confirm" role="alertdialog" aria-label="Bevestiging">
          <p>Weet je het zeker? Al je punten en voortgang gaan verloren.</p>
          <div className="row">
            <button type="button" className="btn btn-danger" onClick={onReset}>
              Ja
            </button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Nee
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
          Alles resetten
        </button>
      )}
      <button type="button" className="btn btn-link" onClick={onBack}>
        ← Terug
      </button>
    </main>
  )
}

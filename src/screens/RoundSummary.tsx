type Props = { firstTryCorrect: number; total: number; pointsEarned: number; onAgain: () => void; onHome: () => void }

export function RoundSummary({ firstTryCorrect, total, pointsEarned, onAgain, onHome }: Props) {
  return (
    <main className="screen summary">
      <h2>Ronde klaar! 🎉</h2>
      <p className="summary-big">
        {firstTryCorrect} van de {total} meteen goed
      </p>
      <p className="summary-big">+{pointsEarned} punten</p>
      <button type="button" className="btn btn-primary" onClick={onAgain}>
        Nog een ronde
      </button>
      <button type="button" className="btn" onClick={onHome}>
        Home
      </button>
    </main>
  )
}

type Props = { title: string; known: number; total: number; percent: number; earned: boolean }

export function ChapterTile({ title, known, total, percent, earned }: Props) {
  return (
    <li className="tile">
      <div className="tile-head">
        <span className="tile-title">{title} ({known}/{total})</span>
        <span
          role="img"
          className={earned ? 'badge badge-earned' : 'badge'}
          data-earned={earned ? 'true' : 'false'}
          aria-label={earned ? "Badge 'I got this' behaald" : "Badge 'I got this' nog niet behaald"}
        >
          🏅
        </span>
      </div>
      <div
        className="bar"
        role="progressbar"
        aria-label={`Voortgang ${title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="tile-percent">{percent}%</span>
    </li>
  )
}

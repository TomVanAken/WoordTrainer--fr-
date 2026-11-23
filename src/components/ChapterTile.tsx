type Props = { title: string; percent: number; earned: boolean }

export function ChapterTile({ title, percent, earned }: Props) {
  return (
    <li className="tile">
      <div className="tile-head">
        <span className="tile-title">{title}</span>
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

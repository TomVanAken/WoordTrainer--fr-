import type { ReactNode } from 'react'
import { diffMark, type Seg } from '../cards/spelling.ts'

/** Differing letters get bold red + underline (not colour alone). */
export function Marked({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map((s, i) =>
        s.diff ? (
          <mark key={i} className="spell-diff">
            {s.text}
          </mark>
        ) : (
          s.text
        ),
      )}
    </>
  )
}

/** What he typed, with the letters that differ from the accepted form `form` marked. */
export function markedTyped(typed: string, form: string): ReactNode {
  return <Marked segs={diffMark(typed, form).a} />
}

const LEADING_ARTICLE = /^(?:(?:une|un|les|le|la|des)\s+|l'\s*)/i

/**
 * The correction `display` with the matching part of `form` marked against `typed`.
 * `display` shows a noun without its article, so the article is dropped from both when `form`
 * itself is not in it; with no match at all the display is shown plain.
 */
export function markedDisplay(display: string, typed: string, form: string): ReactNode {
  const at = display.indexOf(form)
  if (at >= 0) return withMarks(display, at, form, diffMark(typed.trim(), form).b)
  const f = form.replace(LEADING_ARTICLE, '')
  const t = typed.trim().replace(LEADING_ARTICLE, '')
  const i = f === '' ? -1 : display.indexOf(f)
  return i >= 0 ? withMarks(display, i, f, diffMark(t, f).b) : display
}

function withMarks(display: string, at: number, form: string, segs: Seg[]): ReactNode {
  return (
    <>
      {display.slice(0, at)}
      <Marked segs={segs} />
      {display.slice(at + form.length)}
    </>
  )
}

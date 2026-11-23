import type { Card, Lang } from '../types'

/** Every combination with each "(...)" part kept (without brackets) or dropped. */
export function expandOptional(form: string): string[] {
  const results: string[] = []
  const walk = (s: string) => {
    const m = /\(([^()]*)\)/.exec(s)
    if (!m) {
      const clean = s.replace(/\s+/g, ' ').trim()
      if (!results.includes(clean)) results.push(clean)
      return
    }
    const before = s.slice(0, m.index)
    const after = s.slice(m.index + m[0].length)
    walk(before + m[1] + after)
    walk(before + after)
  }
  walk(form)
  return results
}

export function normalize(text: string, caseSensitive: boolean): string {
  let s = text.normalize('NFC')
  s = s.replace(/[’‘ʼ]/g, "'").replace(/[“”]/g, '"')
  s = s.replace(/œ/g, 'oe').replace(/Œ/g, 'Oe').replace(/æ/g, 'ae').replace(/Æ/g, 'Ae')
  s = s.replace(/\s+/g, ' ').trim()
  s = s.replace(/[.!?]+$/, '').trim()
  return caseSensitive ? s : s.toLowerCase()
}

/** Article removal shared by matchesForm and promptKey (steps 3-4). `f` decides the French rule. */
function stripArticle(s: string, f: string, lang: Lang): string {
  if (lang === 'nl') return s.replace(/^(de|het) /i, '')
  if (/^des /i.test(f)) return s.replace(/^(des|les) /i, '')
  return s
}

export function matchesForm(
  typed: string,
  form: string,
  lang: Lang,
  caseSensitive: boolean,
): boolean {
  let t = normalize(typed, caseSensitive)
  let f = normalize(form, caseSensitive)
  const fOrig = f
  t = stripArticle(t, fOrig, lang)
  f = stripArticle(f, fOrig, lang)
  if (caseSensitive && f.length > 0 && f[0] === f[0].toLowerCase() && f[0] !== f[0].toUpperCase()) {
    t = t.charAt(0).toLowerCase() + t.slice(1)
  }
  return t === f
}

export function checkAnswer(typed: string, card: Card): boolean {
  if (typed.trim() === '') return false
  const lang: Lang = card.direction === 'fr-nl' ? 'nl' : 'fr'
  return card.answers.some((a) =>
    expandOptional(a.text).some((variant) => matchesForm(typed, variant, lang, a.caseSensitive)),
  )
}

export function promptKey(form: string, lang: Lang): string {
  const n = normalize(form, false)
  return stripArticle(n, n, lang)
}

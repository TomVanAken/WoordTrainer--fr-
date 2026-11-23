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
  s = s.replace(/[\s.!?]+$/, '')
  return caseSensitive ? s : s.toLowerCase()
}

/** Article removal shared by matchesForm and promptKey (steps 3-4). `f` decides the French rule.
 *  Dutch de/het/een are all optional (een Fransman = Fransman). */
function stripArticle(s: string, f: string, lang: Lang): string {
  if (lang === 'nl') return s.replace(/^(de|het|een) /i, '')
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

/**
 * Typed text may itself use the book's "(...)" notation (être fatigué(e)): it is correct when
 * EVERY form it stands for is an accepted form, so une clim(e) for une clim(atisation) is wrong
 * (une clime is not a form) and a hedge like (une) maison for une maison is wrong too.
 */
export function checkAnswer(typed: string, card: Card): boolean {
  if (typed.trim() === '') return false
  const lang: Lang = card.direction === 'fr-nl' ? 'nl' : 'fr'
  const typedVariants = expandOptional(typed)
  if (typedVariants.some((t) => t === '')) return false
  return typedVariants.every((t) =>
    card.answers.some((a) =>
      expandOptional(a.text).some((variant) => matchesForm(t, variant, lang, a.caseSensitive)),
    ),
  )
}

export function promptKey(form: string, lang: Lang): string {
  const n = normalize(form, false)
  return stripArticle(n, n, lang)
}

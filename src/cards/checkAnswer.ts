import type { Card, Gender, Lang } from '../types'

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

// y is a consonant here: no elision before it (le yaourt, le yoga).
const VOWEL_START = /^[aeiouàâäéèêëîïôöùûüœæ]/i

const UN_UNE = /^\s*(un|une)\s+(\S.*)$/i
const DES = /^\s*des\s+(\S.*)$/i

/** A form to compare against; `gender` is set on a noun form, whose gender he has to choose too. */
type Form = { text: string; gender?: Gender }

/**
 * A noun is stored with un/une (singular) or des (plural-only). He may type it with or without
 * an article, but a typed article must be right: un/une as stored, or the matching definite one
 * (elision follows the first letter: a vowel or œ takes only l', an h takes l' as well as le/la,
 * anything else takes le (un) or la (une); y is a consonant). des also accepts les.
 * Every noun form carries its gender (from the article, or from the entry for des).
 * Other forms (phrases, verbs...) are returned unchanged and have no gender.
 */
export function frenchArticleForms(form: string, desGender?: Gender): Form[] {
  const m = UN_UNE.exec(form)
  if (m) {
    const noun = m[2]
    const gender: Gender = m[1].toLowerCase() === 'un' ? 'm' : 'f'
    const forms: Form[] = [{ text: noun, gender }, { text: form, gender }]
    if (VOWEL_START.test(noun) || /^h/i.test(noun)) forms.push({ text: `l'${noun}`, gender })
    if (!VOWEL_START.test(noun)) forms.push({ text: `${gender === 'm' ? 'le' : 'la'} ${noun}`, gender })
    return forms
  }
  const d = DES.exec(form)
  if (d && desGender) return [{ text: d[1], gender: desGender }, { text: form, gender: desGender }]
  return [{ text: form }]
}

/** Whether to ask for the gender: an NL→FR card with at least one noun answer (un/une, or des with a known gender). */
export function asksGender(card: Card): boolean {
  if (card.direction !== 'nl-fr') return false
  return card.answers.some((a) =>
    expandOptional(a.text).some((v) => UN_UNE.test(v) || (DES.test(v) && a.gender !== undefined)),
  )
}

/**
 * Typed text may itself use the book's "(...)" notation (être fatigué(e)): it is correct when
 * EVERY form it stands for is an accepted form, so une clim(e) for une clim(atisation) is wrong
 * (une clime is not a form) and a hedge like (une) maison for une maison is wrong too.
 * The article is optional but must be right if typed. `gender` is his choice; for a noun answer
 * it has to match the noun's gender (no choice = never correct).
 */
export function checkAnswer(typed: string, card: Card, gender?: Gender): boolean {
  if (checkSingle(typed, card, gender)) return true
  // Several accepted answers may be entered together (verpakken, inpakken / verpakken / inpakken):
  // correct when every part is an accepted answer.
  const parts = typed.split(/\s*[,/;]\s*/)
  if (parts.length < 2 || parts.some((p) => p.trim() === '')) return false
  return parts.every((p) => checkSingle(p, card, gender))
}

function checkSingle(typed: string, card: Card, gender?: Gender): boolean {
  if (typed.trim() === '') return false
  const lang: Lang = card.direction === 'fr-nl' ? 'nl' : 'fr'
  const typedVariants = expandOptional(typed)
  if (typedVariants.some((t) => t === '')) return false
  const forms = (text: string, desGender?: Gender): Form[] =>
    expandOptional(text).flatMap((variant) =>
      lang === 'fr' ? frenchArticleForms(variant, desGender) : [{ text: variant }],
    )
  return typedVariants.every((t) =>
    card.answers.some((a) =>
      forms(a.text, a.gender).some(
        (form) => matchesForm(t, form.text, lang, a.caseSensitive) && (form.gender === undefined || form.gender === gender),
      ),
    ),
  )
}

export function promptKey(form: string, lang: Lang): string {
  const n = normalize(form, false)
  return stripArticle(n, n, lang)
}

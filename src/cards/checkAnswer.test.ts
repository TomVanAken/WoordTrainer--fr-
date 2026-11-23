import type { Card, Direction } from '../types'
import { checkAnswer, expandOptional, normalize, promptKey } from './checkAnswer'

function card(direction: Direction, answers: [string, boolean][]): Card {
  return {
    id: `x|${direction}`,
    entryId: 'x',
    chapterId: 'c',
    direction,
    prompt: 'p',
    answers: answers.map(([text, caseSensitive]) => ({ text, caseSensitive })),
    display: answers.map(([t]) => t).join(' / '),
  }
}

test.each([
  ['une maison', true],
  ['Une maison.', true],
  ['  une   maison ', true],
  ['maison', false],
  ['la maison', true],
  ['un maison', false],
  ['le maison', false],
  ["l'maison", false],
  ['une maisons', false],
  ['', false],
  ['   ', false],
])('fr singular noun: %s → %s', (typed, expected) => {
  expect(checkAnswer(typed, card('nl-fr', [['une maison', false]]))).toBe(expected)
})

test("noun starting with a vowel: the definite form is l' only", () => {
  const c = card('nl-fr', [['une école', false]])
  expect(checkAnswer('une école', c)).toBe(true)
  expect(checkAnswer("l'école", c)).toBe(true)
  expect(checkAnswer('l’école', c)).toBe(true)
  expect(checkAnswer('la école', c)).toBe(false)
  expect(checkAnswer('le école', c)).toBe(false)
  expect(checkAnswer('un école', c)).toBe(false)
  expect(checkAnswer('école', c)).toBe(false)
  expect(checkAnswer('une ecole', c)).toBe(false)
  const y = card('nl-fr', [['un yaourt', false]])
  expect(checkAnswer("l'yaourt", y)).toBe(true)
  expect(checkAnswer('le yaourt', y)).toBe(false)
  const oe = card('nl-fr', [['un œuf', false]])
  expect(checkAnswer("l'oeuf", oe)).toBe(true)
  expect(checkAnswer("l'œuf", oe)).toBe(true)
  expect(checkAnswer('le oeuf', oe)).toBe(false)
  const acc = card('nl-fr', [['un été', false]])
  expect(checkAnswer("l'été", acc)).toBe(true)
  expect(checkAnswer('le été', acc)).toBe(false)
})

test("noun starting with h: l' and le/la are both accepted", () => {
  const c = card('nl-fr', [['un hôtel', false]])
  for (const ok of ['un hôtel', "l'hôtel", 'le hôtel']) expect(checkAnswer(ok, c)).toBe(true)
  for (const bad of ['la hôtel', 'une hôtel', 'hôtel']) expect(checkAnswer(bad, c)).toBe(false)
  const f = card('nl-fr', [['une histoire', false]])
  for (const ok of ['une histoire', "l'histoire", 'la histoire']) expect(checkAnswer(ok, f)).toBe(true)
  expect(checkAnswer('le histoire', f)).toBe(false)
})

test("consonant: le for un, la for une; l' is wrong", () => {
  const m = card('nl-fr', [['un chat', false]])
  expect(checkAnswer('le chat', m)).toBe(true)
  expect(checkAnswer('Le chat.', m)).toBe(true)
  expect(checkAnswer('la chat', m)).toBe(false)
  expect(checkAnswer("l'chat", m)).toBe(false)
  expect(checkAnswer('chat', m)).toBe(false)
})

test('definite article: only for un/une forms; caps and optional parts still work', () => {
  // des-forms and other forms are unchanged
  const des = card('nl-fr', [['des vacances', false]])
  expect(checkAnswer('les vacances', des)).toBe(true)
  const phrase = card('nl-fr', [['à la maison', false]])
  expect(checkAnswer('à maison', phrase)).toBe(false)
  const verb = card('nl-fr', [['manger', false]])
  expect(checkAnswer('le manger', verb)).toBe(false)
  // caps-marked nationality noun
  const fr = card('nl-fr', [['un Français', true]])
  expect(checkAnswer('le Français', fr)).toBe(true)
  expect(checkAnswer('Le Français', fr)).toBe(true)
  expect(checkAnswer('le français', fr)).toBe(false)
  const am = card('nl-fr', [['un Américain', true]])
  expect(checkAnswer("l'Américain", am)).toBe(true)
  expect(checkAnswer("l'américain", am)).toBe(false)
  // optional part
  const clim = card('nl-fr', [['une clim(atisation)', false]])
  for (const ok of ['la clim', 'la climatisation', 'la clim(atisation)']) expect(checkAnswer(ok, clim)).toBe(true)
  expect(checkAnswer('le clim', clim)).toBe(false)
  // un(e) in the data: each gender gets its own definite form
  const el = card('nl-fr', [['un(e) élève', false]])
  for (const ok of ['un élève', 'une élève', "l'élève"]) expect(checkAnswer(ok, el)).toBe(true)
  // the Dutch side is untouched
  expect(checkAnswer('de huis', card('fr-nl', [['het huis', false]]))).toBe(true)
})

test('plural-only noun: article optional, des or les', () => {
  const c = card('nl-fr', [['des vacances', false]])
  expect(checkAnswer('vacances', c)).toBe(true)
  expect(checkAnswer('des vacances', c)).toBe(true)
  expect(checkAnswer('les vacances', c)).toBe(true)
  expect(checkAnswer('la vacances', c)).toBe(false)
})

test('phrase is compared as written', () => {
  const c = card('nl-fr', [['à la maison', false]])
  expect(checkAnswer('à la maison', c)).toBe(true)
  expect(checkAnswer('maison', c)).toBe(false)
  expect(checkAnswer('a la maison', c)).toBe(false)
})

test('optional ending and placeholder', () => {
  const c = card('nl-fr', [['content(e)', false]])
  expect(checkAnswer('content', c)).toBe(true)
  expect(checkAnswer('contente', c)).toBe(true)
  expect(checkAnswer('contents', c)).toBe(false)
  const d = card('nl-fr', [["s'occuper de (qn)", false]])
  expect(checkAnswer("s'occuper de", d)).toBe(true)
  expect(checkAnswer("s'occuper de qn", d)).toBe(true)
})

test('Dutch article optional and never checked', () => {
  const c = card('fr-nl', [['het huis', false], ['de woning', false]])
  for (const ok of ['huis', 'het huis', 'de huis', 'woning']) expect(checkAnswer(ok, c)).toBe(true)
  expect(checkAnswer('huizen', c)).toBe(false)
})

test('capitals required only when marked; a starting capital is fine', () => {
  const a = card('nl-fr', [['un Français', true]])
  expect(checkAnswer('un Français', a)).toBe(true)
  expect(checkAnswer('Un Français', a)).toBe(true)
  expect(checkAnswer('un français', a)).toBe(false)
  const b = card('fr-nl', [['Frans', true]])
  expect(checkAnswer('Frans', b)).toBe(true)
  expect(checkAnswer('frans', b)).toBe(false)
  const c = card('nl-fr', [['lundi', false]])
  expect(checkAnswer('Lundi', c)).toBe(true)
})

test('caps-marked forms with an optional article keep their capital', () => {
  const nl = card('fr-nl', [['het Nederlands', true]])
  expect(checkAnswer('Nederlands', nl)).toBe(true)
  expect(checkAnswer('Het Nederlands', nl)).toBe(true)
  expect(checkAnswer('het Nederlands', nl)).toBe(true)
  expect(checkAnswer('nederlands', nl)).toBe(false)
  const fr = card('nl-fr', [['des Français', true]])
  expect(checkAnswer('Français', fr)).toBe(true)
  expect(checkAnswer('les Français', fr)).toBe(true)
  expect(checkAnswer('français', fr)).toBe(false)
})

test('keyboard artifacts are accepted', () => {
  expect(checkAnswer('aujourd’hui', card('nl-fr', [["aujourd'hui", false]]))).toBe(true)
  expect(checkAnswer('une soeur', card('nl-fr', [['une sœur', false]]))).toBe(true)
  const m = card('nl-fr', [['une maison', false]])
  expect(checkAnswer('une maison. ', m)).toBe(true)
  expect(checkAnswer('une maison', m)).toBe(true)
  expect(checkAnswer('une école', card('nl-fr', [['une école', false]]))).toBe(true)
  const s = card('nl-fr', [['Ça va ?', false]])
  expect(checkAnswer('ça va', s)).toBe(true)
  expect(checkAnswer('Ça va?', s)).toBe(true)
  expect(checkAnswer('ca va', s)).toBe(false)
})

test('non-breaking spaces count as spaces', () => {
  expect(checkAnswer('une maison', card('nl-fr', [['une maison', false]]))).toBe(true)
})

test('expandOptional', () => {
  expect(expandOptional('content(e)')).toEqual(['contente', 'content'])
  expect(expandOptional("s'occuper de (qn)")).toEqual(["s'occuper de qn", "s'occuper de"])
  expect(expandOptional('une maison')).toEqual(['une maison'])
})

test('normalize', () => {
  expect(normalize('  Œuf ?! ', false)).toBe('oeuf')
  expect(normalize('Œuf', true)).toBe('Oeuf')
})

test('promptKey drops Dutch de/het and French des/les only for des-forms', () => {
  expect(promptKey('het huis', 'nl')).toBe('huis')
  expect(promptKey('des vacances', 'fr')).toBe('vacances')
  expect(promptKey('une maison', 'fr')).toBe('une maison')
})

test('typing the optional part with its brackets, as the book shows it, is accepted', () => {
  const tired = card('nl-fr', [['être fatigué(e)', false]])
  for (const ok of ['être fatigué(e)', 'être fatigué', 'être fatiguée']) expect(checkAnswer(ok, tired)).toBe(true)
  expect(checkAnswer('fatigué(e)', card('nl-fr', [['fatigué(e)', false]]))).toBe(true)
  const clim = card('nl-fr', [['une clim(atisation)', false]])
  expect(checkAnswer('une clim(atisation)', clim)).toBe(true)
  expect(checkAnswer('une clim(e)', clim)).toBe(false)
  const occ = card('nl-fr', [["s'occuper de (qn)", false]])
  expect(checkAnswer("s'occuper de (qn)", occ)).toBe(true)
  expect(checkAnswer('()', card('nl-fr', [['une maison', false]]))).toBe(false)
})

test('Dutch "een" is an optional article like de/het', () => {
  const c = card('fr-nl', [['een Fransman', true]])
  expect(checkAnswer('Fransman', c)).toBe(true)
  expect(checkAnswer('een Fransman', c)).toBe(true)
  expect(checkAnswer('Een Fransman', c)).toBe(true)
  expect(checkAnswer('fransman', c)).toBe(false)
  expect(promptKey('een Fransman', 'nl')).toBe('fransman')
})

test('repeated closing punctuation is stripped', () => {
  expect(normalize('une maison. .', false)).toBe('une maison')
  expect(normalize('Ça va ? !', false)).toBe('ça va')
  expect(checkAnswer('une maison. .', card('nl-fr', [['une maison', false]]))).toBe(true)
})

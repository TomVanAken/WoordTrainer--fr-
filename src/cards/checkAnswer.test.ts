import type { Card, Direction } from '../types'
import { asksGender, checkAnswer, expandOptional, nearMiss, normalize, promptKey } from './checkAnswer'

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
  ['une maison', 'f', true],
  ['Une maison.', 'f', true],
  ['  une   maison ', 'f', true],
  ['maison', 'f', true], // the article is optional
  ['la maison', 'f', true],
  ['un maison', 'f', false], // but a typed article must be right
  ['le maison', 'f', false],
  ["l'maison", 'f', false],
  ['une maisons', 'f', false],
  ['une maison', 'm', false], // the gender is always required and must be right
  ['maison', 'm', false],
  ['maison', undefined, false],
  ['une maison', undefined, false],
  ['', 'f', false],
  ['   ', 'f', false],
] as const)('fr singular noun: %s (%s) → %s', (typed, gender, expected) => {
  expect(checkAnswer(typed, card('nl-fr', [['une maison', false]]), gender)).toBe(expected)
})

test("noun starting with a vowel: the definite form is l' only", () => {
  const c = card('nl-fr', [['une école', false]])
  expect(checkAnswer('une école', c, 'f')).toBe(true)
  expect(checkAnswer('école', c, 'f')).toBe(true)
  expect(checkAnswer("l'école", c, 'f')).toBe(true)
  expect(checkAnswer('l’école', c, 'f')).toBe(true)
  expect(checkAnswer("l'école", c, 'm')).toBe(false)
  expect(checkAnswer("l'école", c)).toBe(false)
  expect(checkAnswer('la école', c, 'f')).toBe(false)
  expect(checkAnswer('le école', c, 'f')).toBe(false)
  expect(checkAnswer('un école', c, 'f')).toBe(false)
  expect(checkAnswer('une ecole', c, 'f')).toBe(false)
  const oe = card('nl-fr', [['un œuf', false]])
  expect(checkAnswer("l'oeuf", oe, 'm')).toBe(true)
  expect(checkAnswer("l'œuf", oe, 'm')).toBe(true)
  expect(checkAnswer('oeuf', oe, 'm')).toBe(true)
  expect(checkAnswer('le oeuf', oe, 'm')).toBe(false)
  const acc = card('nl-fr', [['un été', false]])
  expect(checkAnswer("l'été", acc, 'm')).toBe(true)
  expect(checkAnswer('le été', acc, 'm')).toBe(false)
})

test("noun starting with h: l' and le/la are both accepted", () => {
  const c = card('nl-fr', [['un hôtel', false]])
  for (const ok of ['un hôtel', "l'hôtel", 'le hôtel', 'hôtel']) expect(checkAnswer(ok, c, 'm')).toBe(true)
  for (const bad of ['la hôtel', 'une hôtel']) expect(checkAnswer(bad, c, 'm')).toBe(false)
  expect(checkAnswer("l'hôtel", c, 'f')).toBe(false)
  const f = card('nl-fr', [['une histoire', false]])
  for (const ok of ['une histoire', "l'histoire", 'la histoire', 'histoire']) expect(checkAnswer(ok, f, 'f')).toBe(true)
  expect(checkAnswer('le histoire', f, 'f')).toBe(false)
})

test("consonant: le for un, la for une; l' is wrong", () => {
  const m = card('nl-fr', [['un chat', false]])
  expect(checkAnswer('le chat', m, 'm')).toBe(true)
  expect(checkAnswer('Le chat.', m, 'm')).toBe(true)
  expect(checkAnswer('chat', m, 'm')).toBe(true)
  expect(checkAnswer('la chat', m, 'm')).toBe(false)
  expect(checkAnswer("l'chat", m, 'm')).toBe(false)
  expect(checkAnswer('chat', m, 'f')).toBe(false)
})

test('definite article: only for un/une forms; caps and optional parts still work', () => {
  const phrase = card('nl-fr', [['à la maison', false]])
  expect(checkAnswer('à maison', phrase)).toBe(false)
  const verb = card('nl-fr', [['manger', false]])
  expect(checkAnswer('le manger', verb)).toBe(false)
  expect(checkAnswer('manger', verb)).toBe(true) // no gender for a verb
  // caps-marked nationality noun
  const fr = card('nl-fr', [['un Français', true]])
  expect(checkAnswer('le Français', fr, 'm')).toBe(true)
  expect(checkAnswer('Le Français', fr, 'm')).toBe(true)
  expect(checkAnswer('Français', fr, 'm')).toBe(true)
  expect(checkAnswer('le français', fr, 'm')).toBe(false)
  expect(checkAnswer('français', fr, 'm')).toBe(false)
  const am = card('nl-fr', [['un Américain', true]])
  expect(checkAnswer("l'Américain", am, 'm')).toBe(true)
  expect(checkAnswer("l'américain", am, 'm')).toBe(false)
  // optional part
  const clim = card('nl-fr', [['une clim(atisation)', false]])
  for (const ok of ['la clim', 'la climatisation', 'la clim(atisation)', 'clim']) expect(checkAnswer(ok, clim, 'f')).toBe(true)
  expect(checkAnswer('le clim', clim, 'f')).toBe(false)
  // un(e) in the data: each gender gets its own forms
  const el = card('nl-fr', [['un(e) élève', false]])
  for (const g of ['m', 'f'] as const) expect(checkAnswer("l'élève", el, g)).toBe(true)
  expect(checkAnswer('un élève', el, 'm')).toBe(true)
  expect(checkAnswer('une élève', el, 'f')).toBe(true)
  expect(checkAnswer('un élève', el, 'f')).toBe(false)
  // the Dutch side is untouched
  expect(checkAnswer('de huis', card('fr-nl', [['het huis', false]]))).toBe(true)
})

test("a form written with l' in the data is compared as written", () => {
  expect(checkAnswer("l'emporter", card('nl-fr', [["l'emporter", false]]))).toBe(true)
})

test('asksGender: every NL→FR card with a noun answer, from the start', () => {
  expect(asksGender(card('nl-fr', [['une école', false]]))).toBe(true)
  expect(asksGender(card('nl-fr', [['un chat', false]]))).toBe(true)
  expect(asksGender(card('nl-fr', [['un(e) élève', false]]))).toBe(true)
  expect(asksGender(card('nl-fr', [['des vacances', false]]))).toBe(false) // no gender known
  const des = card('nl-fr', [['des vacances', false]])
  des.answers[0].gender = 'f'
  expect(asksGender(des)).toBe(true)
  expect(asksGender(card('nl-fr', [['manger', false], ['à la maison', false]]))).toBe(false)
  expect(asksGender(card('fr-nl', [['een school', false]]))).toBe(false)
})

test('y counts as a consonant: le yaourt, never l’yaourt', () => {
  const y = card('nl-fr', [['un yaourt', false]])
  expect(checkAnswer('un yaourt', y, 'm')).toBe(true)
  expect(checkAnswer('le yaourt', y, 'm')).toBe(true)
  expect(checkAnswer("l'yaourt", y, 'm')).toBe(false)
  expect(checkAnswer('la yaourt', y, 'm')).toBe(false)
  const f = card('nl-fr', [['une yourte', false]])
  expect(checkAnswer('la yourte', f, 'f')).toBe(true)
  expect(checkAnswer("l'yourte", f, 'f')).toBe(false)
})

test('plural-only noun: article optional, des or les; the entry gender is required', () => {
  const c = card('nl-fr', [['des vacances', false]])
  c.answers[0].gender = 'f'
  for (const ok of ['vacances', 'des vacances', 'les vacances']) {
    expect(checkAnswer(ok, c, 'f')).toBe(true)
    expect(checkAnswer(ok, c, 'm')).toBe(false)
    expect(checkAnswer(ok, c)).toBe(false)
  }
  expect(checkAnswer('la vacances', c, 'f')).toBe(false)
  expect(checkAnswer('une vacances', c, 'f')).toBe(false)
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
  expect(checkAnswer('un Français', a, 'm')).toBe(true)
  expect(checkAnswer('Un Français', a, 'm')).toBe(true)
  expect(checkAnswer('un français', a, 'm')).toBe(false)
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
  expect(checkAnswer('une soeur', card('nl-fr', [['une sœur', false]]), 'f')).toBe(true)
  const m = card('nl-fr', [['une maison', false]])
  expect(checkAnswer('une maison. ', m, 'f')).toBe(true)
  expect(checkAnswer('une maison', m, 'f')).toBe(true)
  expect(checkAnswer('une école', card('nl-fr', [['une école', false]]), 'f')).toBe(true)
  const s = card('nl-fr', [['Ça va ?', false]])
  expect(checkAnswer('ça va', s)).toBe(true)
  expect(checkAnswer('Ça va?', s)).toBe(true)
  expect(checkAnswer('ca va', s)).toBe(false)
})

test('non-breaking spaces count as spaces', () => {
  expect(checkAnswer('une maison', card('nl-fr', [['une maison', false]]), 'f')).toBe(true)
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
  expect(checkAnswer('une clim(atisation)', clim, 'f')).toBe(true)
  expect(checkAnswer('une clim(e)', clim, 'f')).toBe(false)
  const occ = card('nl-fr', [["s'occuper de (qn)", false]])
  expect(checkAnswer("s'occuper de (qn)", occ)).toBe(true)
  expect(checkAnswer('()', card('nl-fr', [['une maison', false]]), 'f')).toBe(false)
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
  expect(checkAnswer('une maison. .', card('nl-fr', [['une maison', false]]), 'f')).toBe(true)
})

test.each([
  ['verpakken', true],
  ['verpakken, inpakken', true],
  ['inpakken / verpakken', true],
  ['verpakken; inpakken', true],
  ['verpakken / uitdoen', false],
  ['verpakken /', false],
])('several accepted answers entered together: %s', (typed, ok) => {
  const c = card('fr-nl', [['verpakken', false], ['inpakken', false]])
  expect(checkAnswer(typed, c)).toBe(ok)
})

describe('nearMiss', () => {
  const maison = card('nl-fr', [['une maison', false]])
  test('a one-letter slip is almost', () => {
    const form = nearMiss('une maisson', maison, 'f')
    expect(form).not.toBeNull()
    expect(form).toContain('maison')
  })
  test.each([
    ['une maison', 'f'], // correct
    ['un maisson', 'f'], // wrong article
    ['maisson', 'm'], // wrong gender
    ['maisson', undefined], // no gender chosen
    ['', 'f'],
  ] as const)('not almost: %s (%s)', (typed, gender) => {
    expect(nearMiss(typed, maison, gender)).toBeNull()
  })
  test('far, short, multi-part and bracket answers are not almost', () => {
    expect(nearMiss('chien', card('fr-nl', [['hond', false]]))).toBeNull()
    expect(nearMiss('ik', card('fr-nl', [['il', false]]))).toBeNull()
    expect(nearMiss('hnd', card('fr-nl', [['hond', false]]))).not.toBeNull()
    expect(nearMiss('verpakken, inpakkn', card('fr-nl', [['inpakken', false]]))).toBeNull()
    expect(nearMiss('inpakke(n)', card('fr-nl', [['inpakkenn', false]]))).toBeNull()
  })
  test('threshold: 1 edit up to 7 letters, 2 edits for longer words', () => {
    const c = card('fr-nl', [['onderwijzer', false]]) // 11 letters
    expect(nearMiss('onderwyzer', c)).not.toBeNull() // 1
    expect(nearMiss('onderwizr', c)).not.toBeNull() // 2
    expect(nearMiss('onderwiz', c)).toBeNull() // 3
    expect(nearMiss('kaas', card('fr-nl', [['kaasje', false]]))).toBeNull() // 2 edits on a short word
  })
})

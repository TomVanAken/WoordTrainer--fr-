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
  ['la maison', false],
  ['un maison', false],
  ['une maisons', false],
  ['', false],
  ['   ', false],
])('fr singular noun: %s → %s', (typed, expected) => {
  expect(checkAnswer(typed, card('nl-fr', [['une maison', false]]))).toBe(expected)
})

test("noun the book writes with l'", () => {
  const c = card('nl-fr', [['une école', false]])
  expect(checkAnswer('une école', c)).toBe(true)
  expect(checkAnswer("l'école", c)).toBe(false)
  expect(checkAnswer('école', c)).toBe(false)
  expect(checkAnswer('une ecole', c)).toBe(false)
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

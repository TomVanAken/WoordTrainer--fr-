import { emptyProgress } from './rules'
import { STORAGE_KEY, clearProgress, loadProgress, saveProgress } from './storage'

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks() })

const sample = () => ({
  ...emptyProgress(), points: 12, currentStreak: 2, bestStreak: 5, badges: ['ch01'],
  cards: { 'a|fr-nl': { inARow: 2, wrongTotal: 1 } },
  exam: { cardIds: ['a|fr-nl', 'b|fr-nl'], answers: ['x'] },
})

test('round-trips progress', () => {
  saveProgress(sample())
  expect(loadProgress(new Set(['a|fr-nl', 'b|fr-nl']), true)).toEqual(sample())
})

test('nothing saved gives empty progress', () => {
  expect(loadProgress(new Set(), true)).toEqual(emptyProgress())
})

test('clearProgress removes the data', () => {
  saveProgress(sample()); clearProgress()
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
})

test('corrupt JSON gives empty progress', () => {
  localStorage.setItem(STORAGE_KEY, '{oops')
  expect(loadProgress(new Set(), true)).toEqual(emptyProgress())
})

test('wrong shape gives empty progress', () => {
  for (const bad of [
    '{"version":2}', '{"points":"x"}', 'null', '[]', '5',
    JSON.stringify({ ...sample(), badges: 'x' }),
    JSON.stringify({ ...sample(), cards: null }),
    JSON.stringify({ ...sample(), exam: { cardIds: [] } }),
    JSON.stringify({ ...sample(), bestStreak: '1' }),
  ]) {
    localStorage.setItem(STORAGE_KEY, bad)
    expect(loadProgress(new Set(), true)).toEqual(emptyProgress())
  }
})

test('progress of unknown cards is kept', () => {
  saveProgress(sample())
  expect(loadProgress(new Set(), true).cards).toEqual(sample().cards)
})

test('saved exam with unknown card ids is dropped when all chapters loaded', () => {
  saveProgress(sample())
  expect(loadProgress(new Set(['a|fr-nl']), true).exam).toBeNull()
})

test('saved exam with unknown card ids is kept when a chapter failed to load', () => {
  saveProgress(sample())
  expect(loadProgress(new Set(['a|fr-nl']), false).exam).toEqual(sample().exam)
})

test('localStorage throwing gives empty progress and save does not throw', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('x') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('x') })
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('x') })
  expect(loadProgress(new Set(), true)).toEqual(emptyProgress())
  expect(() => saveProgress(sample())).not.toThrow()
  expect(() => clearProgress()).not.toThrow()
})

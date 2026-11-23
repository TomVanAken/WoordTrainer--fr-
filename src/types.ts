export type Lang = 'fr' | 'nl'
export type Direction = 'fr-nl' | 'nl-fr'
export interface Entry {
  id: string // globally unique and stable, e.g. "ch03-014"
  fr: string[] // accepted French forms; the first one is the main form. "(...)" = optional part
  nl: string[] // accepted Dutch forms
  frCaps?: boolean // true = French answers must match capitals exactly
  nlCaps?: boolean
  hint?: string // Dutch context shown under the prompt in both directions; never typed
}
export interface Chapter {
  id: string
  title: string
  entries: Entry[]
}
export interface Answer {
  text: string
  caseSensitive: boolean
}
export interface Card {
  id: string // `${entryId}|${direction}`
  entryId: string
  chapterId: string
  direction: Direction
  prompt: string // source forms joined with " / "
  answers: Answer[] // accepted target forms (including same-prompt entries, see Task 3)
  display: string // the entry's own target forms joined with " / " (shown as "the correct answer")
  hint?: string // the entry's Dutch context hint, if any
}
export interface CardProgress {
  inARow: number
  wrongTotal: number
}
export type Gender = 'm' | 'f'
export interface ExamState {
  cardIds: string[]
  answers: string[]
  /** The un/une choice per answer (null = none asked). Missing in exams saved before it existed. */
  genders?: (Gender | null)[]
}
export interface Progress {
  version: 1
  points: number
  currentStreak: number
  bestStreak: number
  badges: string[] // chapter ids
  cards: Record<string, CardProgress> // keyed by card id
  exam: ExamState | null
}
export interface QueueItem {
  cardId: string
  retry: boolean
}
export interface RoundState {
  queue: QueueItem[]
  total: number
  firstTryCorrect: number
}

import type { Answer, Card, Chapter, Direction, Entry, Lang } from '../types'
import { promptKey } from './checkAnswer'

const DIRECTIONS: Direction[] = ['fr-nl', 'nl-fr']

export function buildCards(chapters: Chapter[]): Card[] {
  const all: { entry: Entry; chapterId: string }[] = chapters.flatMap((ch) =>
    ch.entries.map((entry) => ({ entry, chapterId: ch.id })),
  )

  // Index entries by source-language prompt key, per language.
  const index: Record<Lang, Map<string, Entry[]>> = { fr: new Map(), nl: new Map() }
  for (const { entry } of all) {
    for (const lang of ['fr', 'nl'] as Lang[]) {
      for (const form of entry[lang]) {
        const key = promptKey(form, lang)
        const list = index[lang].get(key) ?? []
        if (!list.includes(entry)) list.push(entry)
        index[lang].set(key, list)
      }
    }
  }

  const cards: Card[] = []
  for (const { entry, chapterId } of all) {
    for (const direction of DIRECTIONS) {
      const source: Lang = direction === 'fr-nl' ? 'fr' : 'nl'
      const target: Lang = direction === 'fr-nl' ? 'nl' : 'fr'

      const related: Entry[] = [entry]
      for (const form of entry[source]) {
        for (const other of index[source].get(promptKey(form, source)) ?? []) {
          if (!related.includes(other)) related.push(other)
        }
      }

      const answers: Answer[] = []
      for (const e of related) {
        const caseSensitive = (target === 'fr' ? e.frCaps : e.nlCaps) ?? false
        for (const text of e[target]) {
          if (!answers.some((a) => a.text === text && a.caseSensitive === caseSensitive)) {
            answers.push({ text, caseSensitive })
          }
        }
      }

      cards.push({
        id: `${entry.id}|${direction}`,
        entryId: entry.id,
        chapterId,
        direction,
        prompt: entry[source].join(' / '),
        answers,
        display: entry[target].join(' / '),
      })
    }
  }
  return cards
}

export function cardsForChapters(cards: Card[], chapterIds: string[]): Card[] {
  return cards.filter((c) => chapterIds.includes(c.chapterId))
}

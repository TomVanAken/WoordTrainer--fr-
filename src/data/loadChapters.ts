import type { Chapter } from '../types.ts'
import { validateChapter, validateChapterList } from './validateChapter.ts'

export function chaptersBaseUrl(): string {
  return import.meta.env.VITE_CHAPTERS_URL || './chapters/'
}

export type LoadResult = { status: 'ok'; chapters: Chapter[]; failed: string[] } | { status: 'error' }

const INIT: RequestInit = { cache: 'no-cache' }

async function fetchJson(fetchFn: typeof fetch, url: string): Promise<unknown> {
  const response = await fetchFn(url, INIT)
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response.json()
}

export async function loadChapters(baseUrl: string, fetchFn: typeof fetch = fetch): Promise<LoadResult> {
  let names: string[]
  try {
    const list = validateChapterList(await fetchJson(fetchFn, baseUrl + 'index.json'))
    if (!list.ok) return { status: 'error' }
    names = list.value
  } catch {
    return { status: 'error' }
  }

  const loaded = await Promise.all(
    names.map(async (name): Promise<Chapter | null> => {
      try {
        const checked = validateChapter(await fetchJson(fetchFn, baseUrl + name), name)
        return checked.ok ? checked.value : null
      } catch {
        return null
      }
    }),
  )

  const chapters: Chapter[] = []
  const failed: string[] = []
  const usedIds = new Set<string>()
  loaded.forEach((chapter, i) => {
    if (!chapter || chapter.entries.some((e) => usedIds.has(e.id))) {
      failed.push(names[i])
      return
    }
    chapter.entries.forEach((e) => usedIds.add(e.id))
    chapters.push(chapter)
  })

  if (chapters.length === 0) return { status: 'error' }
  return { status: 'ok', chapters, failed }
}

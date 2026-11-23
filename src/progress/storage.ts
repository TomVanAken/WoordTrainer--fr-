import type { Progress } from '../types'
import { emptyProgress } from './rules'

export const STORAGE_KEY = 'woordtrainer.progress.v1'

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function validShape(v: unknown): v is Progress {
  if (!isObject(v)) return false
  if (v.version !== 1) return false
  if (typeof v.points !== 'number' || typeof v.currentStreak !== 'number' || typeof v.bestStreak !== 'number') return false
  if (!Array.isArray(v.badges) || !isObject(v.cards)) return false
  if (v.exam !== null) {
    if (!isObject(v.exam) || !Array.isArray(v.exam.cardIds) || !Array.isArray(v.exam.answers)) return false
    // genders is optional: exams saved before it existed have none
    if (v.exam.genders !== undefined && !Array.isArray(v.exam.genders)) return false
  }
  return true
}

export function loadProgress(validCardIds: Set<string>, allChaptersLoaded: boolean): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return emptyProgress()
    const data: unknown = JSON.parse(raw)
    if (!validShape(data)) return emptyProgress()
    if (allChaptersLoaded && data.exam && !data.exam.cardIds.every(id => validCardIds.has(id))) {
      return { ...data, exam: null }
    }
    return data
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // storage full or unavailable: progress just isn't persisted
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

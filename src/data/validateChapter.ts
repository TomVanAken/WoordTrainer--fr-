import type { Chapter, Entry } from '../types.ts'

export const CHAPTER_ID = /^ch\d{2}$/
export const ENTRY_ID = /^ch\d{2}-\d{3}$/

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string }

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const isNonEmptyString = (x: unknown): x is string => typeof x === 'string' && x.trim() !== ''

export function validateChapterList(data: unknown): Checked<string[]> {
  if (!isObject(data) || !Array.isArray(data.chapters)) return fail('index: expected { "chapters": [...] }')
  const seen = new Set<string>()
  for (const name of data.chapters) {
    if (!isNonEmptyString(name) || !name.endsWith('.json')) return fail(`index: "${String(name)}" is not a .json file name`)
    if (seen.has(name)) return fail(`index: "${name}" is listed twice`)
    seen.add(name)
  }
  return { ok: true, value: [...data.chapters] as string[] }
}

function validateForms(entryId: string, field: 'fr' | 'nl', forms: unknown): Checked<string[]> {
  if (!Array.isArray(forms) || forms.length === 0) return fail(`entry ${entryId}: ${field} is empty`)
  if (!forms.every(isNonEmptyString)) return fail(`entry ${entryId}: ${field} has a blank or non-string form`)
  return { ok: true, value: [...forms] }
}

export function validateChapter(data: unknown, fileName: string): Checked<Chapter> {
  if (!isObject(data)) return fail(`${fileName}: not an object`)
  const expectedId = fileName.replace(/\.json$/, '')
  if (data.id !== expectedId) return fail(`${fileName}: id must be "${expectedId}"`)
  if (!isNonEmptyString(data.title)) return fail(`${fileName}: title is empty`)
  if (!Array.isArray(data.entries) || data.entries.length === 0) return fail(`${fileName}: entries is empty`)

  const entries: Entry[] = []
  const ids = new Set<string>()
  for (const raw of data.entries) {
    if (!isObject(raw)) return fail(`${fileName}: an entry is not an object`)
    if (!isNonEmptyString(raw.id)) return fail(`${fileName}: an entry has no id`)
    const id = raw.id
    if (ids.has(id)) return fail(`entry ${id}: duplicate id`)
    ids.add(id)
    const fr = validateForms(id, 'fr', raw.fr)
    if (!fr.ok) return fr
    const nl = validateForms(id, 'nl', raw.nl)
    if (!nl.ok) return nl
    const entry: Entry = { id, fr: fr.value, nl: nl.value }
    for (const key of ['frCaps', 'nlCaps'] as const) {
      const v = raw[key]
      if (v === undefined) continue
      if (typeof v !== 'boolean') return fail(`entry ${id}: ${key} must be a boolean`)
      entry[key] = v
    }
    entries.push(entry)
  }
  return { ok: true, value: { id: expectedId, title: data.title, entries } }
}

const ARTICLE = /^(le|la|les) |^l['’]/i

export function articleWarnings(chapter: Chapter): string[] {
  const out: string[] = []
  for (const entry of chapter.entries) {
    for (const form of entry.fr) {
      if (ARTICLE.test(form)) out.push(`entry ${entry.id}: "${form}" starts with le/la/les/l' (use un/une?)`)
    }
  }
  return out
}

import fs from 'node:fs'
import path from 'node:path'
import { articleWarnings, CHAPTER_ID, missingHintWarnings, ENTRY_ID, validateChapter, validateChapterList } from '../src/data/validateChapter.ts'

function readJson(file: string): { ok: true; value: unknown } | { ok: false; error: string } {
  let text: string
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    return { ok: false, error: `${path.basename(file)}: file not found or unreadable` }
  }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false, error: `${path.basename(file)}: not valid JSON` }
  }
}

export function checkChapters(dir: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  const indexRaw = readJson(path.join(dir, 'index.json'))
  if (!indexRaw.ok) return { errors: [indexRaw.error], warnings }
  const list = validateChapterList(indexRaw.value)
  if (!list.ok) return { errors: [list.error], warnings }

  const entryOwner = new Map<string, string>()
  for (const fileName of list.value) {
    const raw = readJson(path.join(dir, fileName))
    if (!raw.ok) {
      errors.push(raw.error)
      continue
    }
    const checked = validateChapter(raw.value, fileName)
    if (!checked.ok) {
      errors.push(checked.error)
      continue
    }
    const chapter = checked.value
    if (!CHAPTER_ID.test(chapter.id)) errors.push(`${fileName}: chapter id "${chapter.id}" must look like ch03`)
    for (const entry of chapter.entries) {
      if (!ENTRY_ID.test(entry.id)) errors.push(`${fileName}: entry id "${entry.id}" must look like ch03-014`)
      const owner = entryOwner.get(entry.id)
      if (owner !== undefined && owner !== chapter.id) {
        errors.push(`entry ${entry.id}: used in two chapters (${owner} and ${chapter.id})`)
      } else {
        entryOwner.set(entry.id, chapter.id)
      }
    }
    warnings.push(...articleWarnings(chapter).map((w) => `${fileName}: ${w}`))
    warnings.push(...missingHintWarnings(raw.value).map((w) => `${fileName}: ${w}`))
  }
  return { errors, warnings }
}

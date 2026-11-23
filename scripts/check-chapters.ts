import { checkChapters } from './checkChapters.ts'

const { errors, warnings } = checkChapters('public/chapters')
for (const w of warnings) console.warn(`warning: ${w}`)
for (const e of errors) console.error(`error: ${e}`)
if (errors.length > 0) process.exit(1)

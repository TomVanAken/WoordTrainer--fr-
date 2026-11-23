# Vocabulary Trainer (FR ↔ NL) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, responsive React web app where one Dutch-speaking teen studies textbook vocabulary FR↔NL in three modes (Practice, Test, Exam), with points, per-chapter badges and a record streak saved in the browser. Chapters are JSON files the app fetches at runtime, so adding one needs no build.

**Architecture:** All rules live in small pure TypeScript modules (`data/`, `cards/`, `progress/`, `session/`) that are unit-tested. The same chapter validator is used by the app's loader and by a Node `check-chapters` script. React screens are thin and get their data (cards, progress, random source) through props, so they can be tested with fixtures. Progress is one JSON object in `localStorage`. Navigation is a screen state machine in `App.tsx` (no router).

**Tech Stack:** Node 24, Vite (react-ts template, current version), React, TypeScript, Vitest + jsdom + @testing-library/react + @testing-library/user-event, tsx (runs the check script), GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-23-vocab-trainer-design.md`. Read it before starting any task. Where this plan and the spec disagree, the spec wins. Tell the parent about the conflict.

## Global Constraints

- UI text is in **Dutch**. Use these labels consistently: app title "Woordtrainer"; modes "Oefenen" (Practice), "Toets" (Test), "Examen" (Exam); buttons "Toon antwoord", "Ik wist het", "Wist ik niet", "Controleer", "Volgende", "Instellingen", "Alles resetten", "Opnieuw proberen". The badge is named **"I got this"** (in English, the parent's name for it).
- Direction labels are text, **"FR → NL"** and **"NL → FR"**. No flag emoji (Windows doesn't render them).
- Points: Practice **1**, Test **3**, Exam **3** per correct first-try answer. Re-asks inside a round earn **0** and never touch progress or the streak.
- A card is known when `inARow >= 3` (typed answers in Test or Exam only).
- Badge: known cards / chapter's cards **> 0.85** (strictly greater). Once earned it's kept forever.
- The streak changes on **Test** first-try answers only. Exam and Practice never change it.
- Round size **20** different cards. Exam size **50**.
- Never use textbook order. Always shuffle, and mix directions.
- **French article rule:** a French form starting with *un/une* is a singular noun and the typed answer must have exactly that article (*la maison*, *maison*, *un maison* are wrong for *une maison*). A form starting with *des* is a plural-only noun: *des*, *les* or no article are all fine. Any other French form is compared with its words as written. Dutch *de/het* is always optional and never checked.
- Accents count (*ecole* ≠ *école*). *oe/ae* count as *œ/æ*. No typo forgiveness.
- Chapters live in `public/chapters/` (`index.json` + one `chNN.json` per chapter). Chapter id `^ch\d{2}$`, entry id `^ch\d{2}-\d{3}$`. Entry ids never change and are never reused.
- Chapters base URL: `import.meta.env.VITE_CHAPTERS_URL`, falling back to `./chapters/`. Fetch with `cache: 'no-cache'`. The production build contains **no copy** of the chapters.
- The answer input must have `autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}` and a font size of at least 16px (otherwise mobile browsers zoom in). Enter submits.
- Mobile-first, so it works at 360px width with no horizontal scroll. The prompt and the input stay at the top of the screen so the phone keyboard doesn't cover them.
- No service worker. A web app manifest and icons only.
- Vite `base: './'`, so the build works under a GitHub Pages sub-path. The GitHub repo must be public (raw files and free Pages).

## Review Focus

These are the things most likely to bite him in real use that no spec line tests directly. Each has a test in the task that owns the code:

1. **Keyboard artifacts:** a curly apostrophe (`aujourd’hui`), Android's double-space-to-period (`une maison. `), non-breaking spaces, `oe` for `œ`, and decomposed accents (`e` + U+0301 from some phones) should all be accepted as correct. → Task 3.
2. **An accidental Enter on an empty input** must not count as a wrong answer or break the streak. → Task 8 (TestScreen) and Task 9 (ExamScreen).
3. **A chapter changes or is temporarily missing after progress exists:** percentages use the loaded entries; card progress, points and badges for unloaded chapters are kept; a saved exam with unknown cards is kept (not resumable) while any chapter failed, and dropped only when everything loaded. → Task 4 and Task 7.
4. **Broken or unavailable storage:** if the saved JSON is corrupt, has the wrong shape, or `localStorage` throws (private mode), the app starts with empty progress instead of a blank page. → Task 4.
5. **Small selections:** a 1-entry chapter, fewer than 20 unknown cards, everything known, or fewer than 50 cards for an exam should give correct counts with no crash and no endless round. → Task 5.

---

### Task 1: Project scaffold

**Files:**
- Create: the Vite react-ts scaffold in the repository root (`package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/App.tsx`), `.gitignore`, `src/test/setup.ts`, `src/App.test.tsx`

**Interfaces:**
- Produces: `npm test` (runs `vitest run`), `npm run build`, `npm run dev`. jsdom test environment with `@testing-library/jest-dom` matchers registered in `src/test/setup.ts`.

- [ ] **Step 1: Initialise git and commit the existing docs**

Run in the project folder: `git init -b main`, then `git add docs` and `git commit -m "docs: design and implementation plan"`.

- [ ] **Step 2: Scaffold Vite into the existing folder**

Run: `npm create vite@latest . -- --template react-ts` (allow it to use the non-empty folder and keep `docs/`), then `npm install`, then `npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom tsx`.

Remove the template's demo content (counter, logos, `App.css` demo styles).

- [ ] **Step 3: Configure**

In `vite.config.ts`: `base: './'`, plus `test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', globals: true }` (use `/// <reference types="vitest/config" />`). In `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`. Set `<html lang="nl">` and `<title>Woordtrainer</title>` in `index.html`.

- [ ] **Step 4: Write a smoke test**

```tsx
// src/App.test.tsx
import { render, screen } from '@testing-library/react'
import App from './App'
test('renders the app title', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /woordtrainer/i })).toBeInTheDocument()
})
```

Make `App` render `<h1>Woordtrainer</h1>` for now.

- [ ] **Step 5: Verify**

Run: `npm test`. Expected: 1 passed. Run: `npm run build`. Expected: build succeeds and `dist/` is created.

- [ ] **Step 6: Commit**

`git add -A` and `git commit -m "chore: scaffold Vite React TS app with Vitest"`

---

### Task 2: Data model, chapter validation, sample chapter and `check-chapters`

**Files:**
- Create: `src/types.ts`, `src/data/validateChapter.ts`, `src/data/validateChapter.test.ts`, `scripts/checkChapters.ts`, `scripts/check-chapters.ts`, `scripts/checkChapters.test.ts`, `public/chapters/index.json`, `public/chapters/ch00.json`, `src/data/sampleChapter.test.ts`
- Modify: `package.json` (script `"check-chapters": "tsx scripts/check-chapters.ts"`)

**Interfaces:**
- Produces (in `src/types.ts`; all later tasks import from here):

```ts
export type Lang = 'fr' | 'nl'
export type Direction = 'fr-nl' | 'nl-fr'
export interface Entry {
  id: string            // globally unique and stable, e.g. "ch03-014"
  fr: string[]          // accepted French forms; the first one is the main form. "(...)" = optional part
  nl: string[]          // accepted Dutch forms
  frCaps?: boolean      // true = French answers must match capitals exactly
  nlCaps?: boolean
}
export interface Chapter { id: string; title: string; entries: Entry[] }
export interface Answer { text: string; caseSensitive: boolean }
export interface Card {
  id: string            // `${entryId}|${direction}`
  entryId: string
  chapterId: string
  direction: Direction
  prompt: string        // source forms joined with " / "
  answers: Answer[]     // accepted target forms (including same-prompt entries, see Task 3)
  display: string       // the entry's own target forms joined with " / " (shown as "the correct answer")
}
export interface CardProgress { inARow: number; wrongTotal: number }
export interface ExamState { cardIds: string[]; answers: string[] }
export interface Progress {
  version: 1
  points: number
  currentStreak: number
  bestStreak: number
  badges: string[]                       // chapter ids
  cards: Record<string, CardProgress>    // keyed by card id
  exam: ExamState | null
}
export interface QueueItem { cardId: string; retry: boolean }
export interface RoundState { queue: QueueItem[]; total: number; firstTryCorrect: number }
```

- Produces (in `src/data/validateChapter.ts`, pure, no DOM or Node APIs):
  - `CHAPTER_ID = /^ch\d{2}$/`, `ENTRY_ID = /^ch\d{2}-\d{3}$/`
  - `type Checked<T> = { ok: true; value: T } | { ok: false; error: string }` (`error` is a short English message for the developer, e.g. `"entry ch03-004: nl is empty"`)
  - `validateChapterList(data: unknown): Checked<string[]>`: `data` is `{ chapters: string[] }`, each a non-empty string ending in `.json`, no duplicates.
  - `validateChapter(data: unknown, fileName: string): Checked<Chapter>`: `id` is a string equal to `fileName` without `.json`; `title` a non-empty string; `entries` a non-empty array; each entry has a string `id`, `fr` and `nl` non-empty arrays of strings whose trimmed value is non-empty, `frCaps`/`nlCaps` absent or boolean; entry ids unique within the chapter. Unknown extra fields are ignored. Returns a clean `Chapter` (only the known fields).
  - `articleWarnings(chapter: Chapter): string[]`: one message per French form matching `/^(le|la|les) |^l['’]/i` (a noun copied from the book without converting to *un/une*).
- Produces (in `scripts/checkChapters.ts`): `checkChapters(dir: string): { errors: string[]; warnings: string[] }`. Reads `dir/index.json`. Errors: list invalid; a listed file missing or not valid JSON; `validateChapter` fails; chapter id not matching `CHAPTER_ID`; entry id not matching `ENTRY_ID`; an entry id used in two chapters. Warnings: `articleWarnings`. `scripts/check-chapters.ts` runs it on `public/chapters`, prints errors and warnings, and exits with code 1 if there are errors (warnings alone exit 0).

**Sample chapter `public/chapters/ch00.json`:** `id: "ch00"`, title `"Hoofdstuk 0: Voorbeeld"`, ids `ch00-001`… It must include at least:

| fr | nl | why |
|---|---|---|
| `une maison` | `het huis`, `de woning` | two Dutch forms, required article |
| `un logement` | `de woning` | shares the Dutch prompt *woning* with *une maison* |
| `une école` | `de school` | noun the book would write with *l'* |
| `des vacances` | `de vakantie` | plural-only noun, optional article |
| `à la maison` | `thuis` | phrase compared as written |
| `marcher` | `wandelen` | verb |
| `content(e)` | `blij`, `tevreden` | optional feminine ending |
| `s'occuper de (qn)` | `voor (iemand) zorgen` | placeholder, apostrophe |
| `une sœur` | `de zus` | ligature |
| `lundi` | `maandag` | lower case in both |
| `français` | `Frans` (`nlCaps: true`) | capital in one direction only |
| `un Français` | `een Fransman` (`frCaps: true`, `nlCaps: true`) | capitals required |
| `Ça va ?` | `Hoe gaat het?` | French space before *?* |
| `aujourd'hui` | `vandaag` | apostrophe |

`public/chapters/index.json`: `{ "chapters": ["ch00.json"] }`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/data/validateChapter.test.ts
const good = { id: 'ch03', title: 'Hoofdstuk 3', entries: [{ id: 'ch03-001', fr: ['une maison'], nl: ['het huis'] }] }
test('a valid chapter passes and extra fields are dropped', ...)          // ok, value has no extra field
test('id must match the file name', () => expect(validateChapter(good, 'ch04.json').ok).toBe(false))
test.each([
  ['missing title', { ...good, title: '' }],
  ['no entries', { ...good, entries: [] }],
  ['empty nl', { ...good, entries: [{ id: 'ch03-001', fr: ['x'], nl: [] }] }],
  ['blank form', { ...good, entries: [{ id: 'ch03-001', fr: ['  '], nl: ['y'] }] }],
  ['caps not boolean', { ...good, entries: [{ id: 'ch03-001', fr: ['x'], nl: ['y'], frCaps: 'yes' }] }],
  ['duplicate entry id', { ...good, entries: [good.entries[0], good.entries[0]] }],
  ['not an object', 'oops'],
])('rejects %s', (_, data) => expect(validateChapter(data, 'ch03.json').ok).toBe(false))
test('validateChapterList accepts {chapters:[...json]} and rejects other shapes and duplicates', ...)
test('articleWarnings flags le/la/les/l\' forms only', () => {
  // ['la maison', "l'école", 'les vacances'] → 3 warnings; ['une maison', 'à la maison', 'lundi'] → 0
})
// scripts/checkChapters.test.ts  (first line: // @vitest-environment node; build temp dirs with fs.mkdtempSync)
test('reports a listed file that does not exist', ...)
test('reports an entry id used in two chapters', ...)
test('reports malformed ids (ch3, ch03-14)', ...)
test('article warnings are warnings, not errors', ...)
// src/data/sampleChapter.test.ts  (// @vitest-environment node)
test('the shipped chapters pass check-chapters with no errors and no warnings', () => {
  expect(checkChapters('public/chapters')).toEqual({ errors: [], warnings: [] })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/data scripts`. Expected: FAIL (modules not found).

- [ ] **Step 3: Create the types, the validator, the check script and the sample chapter**

- [ ] **Step 4: Run the tests and the script**

Run: `npm test -- src/data scripts`. Expected: all passed. Run: `npm run check-chapters`. Expected: exit code 0, no errors or warnings printed.

- [ ] **Step 5: Commit**

`git add -A` and `git commit -m "feat: data model, chapter validation, sample chapter and check-chapters"`

---

### Task 3: Cards and answer checking

**Files:**
- Create: `src/cards/buildCards.ts`, `src/cards/checkAnswer.ts`, `src/cards/buildCards.test.ts`, `src/cards/checkAnswer.test.ts`

**Interfaces:**
- Consumes: the types from Task 2.
- Produces:
  - `expandOptional(form: string): string[]`: every combination with each `(...)` part kept (without the brackets) or dropped, whitespace-collapsed. `content(e)` → `contente`, `content`; `s'occuper de (qn)` → `s'occuper de qn`, `s'occuper de`.
  - `normalize(text: string, caseSensitive: boolean): string`
  - `matchesForm(typed: string, form: string, lang: Lang, caseSensitive: boolean): boolean`
  - `checkAnswer(typed: string, card: Card): boolean`
  - `promptKey(form: string, lang: Lang): string`
  - `buildCards(chapters: Chapter[]): Card[]`: two cards per entry.
  - `cardsForChapters(cards: Card[], chapterIds: string[]): Card[]`

**`normalize`, in this order:**
1. Unicode NFC.
2. Replace `’ ‘ ʼ` with `'`, and `“ ”` with `"`.
3. Replace `œ`→`oe`, `Œ`→`Oe`, `æ`→`ae`, `Æ`→`Ae`.
4. Replace any whitespace run (including non-breaking spaces) with one space, then trim.
5. Strip trailing `[.!?]+`, then trim (this also removes the French space before `?`).
6. Lower-case unless `caseSensitive`.

Accents are never stripped.

**`matchesForm(typed, form, lang, caseSensitive)`:**
1. `t = normalize(typed, caseSensitive)`, `f = normalize(form, caseSensitive)`.
2. If `caseSensitive` and the first letter of `f` is lower case, lower-case the first letter of `t` (a capital at the start doesn't count).
3. `nl`: remove a leading `de ` or `het ` (case-insensitive) from both.
4. `fr`: only if `f` starts with `des ` (case-insensitive), remove a leading `des ` or `les ` from both. Otherwise nothing is removed, so an *un/une* article must be typed exactly.
5. Return `t === f`.

**`checkAnswer`:** false for a blank `typed`. Otherwise true if, for any `answer` in `card.answers` and any variant in `expandOptional(answer.text)`, `matchesForm(typed, variant, L, answer.caseSensitive)`, where `L` is the target language of `card.direction`.

**`buildCards`, same-prompt merging:** a card's `answers` are the entry's own target forms plus the target forms of every other entry (in any loaded chapter) that shares at least one source form with it, compared with `promptKey` (`normalize(form, false)` with the same article removal as `matchesForm` steps 3–4). Each `Answer.caseSensitive` comes from its own entry's caps flag for the target language. Duplicates (same text and same flag) are removed.

- [ ] **Step 1: Write the failing tests**

```ts
// src/cards/checkAnswer.test.ts — helper: card('nl-fr', [['une maison', false]])
test.each([
  ['une maison', true], ['Une maison.', true], ['  une   maison ', true],
  ['maison', false], ['la maison', false], ['un maison', false], ['une maisons', false],
  ['', false], ['   ', false],
])('fr singular noun: %s → %s', ...)
test('noun the book writes with l\'', () => {
  // 'une école': 'une école' ok; "l'école" wrong; 'école' wrong; 'une ecole' wrong (accent)
})
test('plural-only noun: article optional, des or les', () => {
  // 'des vacances': 'vacances' ok, 'des vacances' ok, 'les vacances' ok, 'la vacances' wrong
})
test('phrase is compared as written', () => { /* 'à la maison': ok; 'maison' wrong; 'a la maison' wrong */ })
test('optional ending and placeholder', () => {
  // 'content(e)': 'content' ok, 'contente' ok, 'contents' wrong
  // "s'occuper de (qn)": "s'occuper de" ok, "s'occuper de qn" ok
})
test('Dutch article optional and never checked', () => {
  // card fr-nl [['het huis',false],['de woning',false]]: 'huis', 'het huis', 'de huis', 'woning' ok; 'huizen' wrong
})
test('capitals required only when marked; a starting capital is fine', () => {
  // {text:'un Français', caseSensitive:true}: 'un Français' ok, 'Un Français' ok, 'un français' wrong
  // {text:'Frans', caseSensitive:true}: 'frans' wrong; {text:'lundi', caseSensitive:false}: 'Lundi' ok
})
test('keyboard artifacts are accepted', () => {
  // "aujourd'hui": "aujourd’hui" ok; 'une sœur': 'une soeur' ok
  // 'une maison': 'une maison. ' ok, 'une maison' ok
  // 'une école': 'une école' ok (decomposed accent)
  // 'Ça va ?': 'ça va' ok, 'Ça va?' ok, 'ca va' wrong
})
// src/cards/buildCards.test.ts
test('two cards per entry with ids entryId|direction', ...)
test('prompt joins source forms with " / "', () => { /* fr-nl card of une maison: prompt 'une maison'; nl-fr: 'het huis / de woning' */ })
test('entries sharing a source form accept each other’s answers', () => {
  // nl-fr card of une maison accepts 'un logement' (shared "de woning"); display stays 'une maison'
})
test('cardsForChapters keeps only the selected chapters', ...)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/cards`. Expected: FAIL (modules not found).

- [ ] **Step 3: Implement `expandOptional`, `normalize`, `matchesForm`, `checkAnswer` and `promptKey` in `src/cards/checkAnswer.ts`, and `buildCards` and `cardsForChapters` in `src/cards/buildCards.ts`**

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/cards`. Expected: all passed.

- [ ] **Step 5: Commit**

`git add src/cards` and `git commit -m "feat: card building and French/Dutch answer checking"`

---

### Task 4: Progress rules and storage

**Files:**
- Create: `src/progress/rules.ts`, `src/progress/storage.ts`, `src/progress/rules.test.ts`, `src/progress/storage.test.ts`

**Interfaces:**
- Consumes: `Card`, `Progress`, `CardProgress`, `ExamState` (Task 2).
- Produces (all pure; they return new objects and never mutate):
  - `KNOWN_AFTER = 3`, `BADGE_THRESHOLD = 0.85`
  - `emptyProgress(): Progress`
  - `isKnown(p: Progress, cardId: string): boolean`
  - `recordTyped(p: Progress, cardId: string, correct: boolean, mode: 'test' | 'exam'): Progress`
    - correct: `inARow + 1` and `points + 3`
    - wrong: `inARow = 0` and `wrongTotal + 1`
    - only when `mode === 'test'`: correct → `currentStreak + 1` and `bestStreak = max(...)`; wrong → `currentStreak = 0`
  - `recordPractice(p: Progress, knewIt: boolean): Progress`: knewIt → `points + 1`; nothing else changes.
  - `chapterStats(p: Progress, cards: Card[], chapterId: string): { known: number; total: number; percent: number }`: counts only the given (loaded) cards of that chapter; `percent = Math.floor(known / total * 100)`, and 0 when `total` is 0.
  - `awardBadges(p: Progress, cards: Card[]): { progress: Progress; newBadges: string[] }`: for each chapter present in `cards`, adds it when `known / total > BADGE_THRESHOLD` and it isn't already in `badges`. It never removes a badge.
  - `examResumable(exam: ExamState, cardsById: Map<string, Card>): boolean`: every `cardId` is present.
  - `STORAGE_KEY = 'woordtrainer.progress.v1'`
  - `loadProgress(validCardIds: Set<string>, allChaptersLoaded: boolean): Progress`
  - `saveProgress(p: Progress): void`
  - `clearProgress(): void`

**`loadProgress`:** shape check: `version === 1`; `points`, `currentStreak` and `bestStreak` are numbers; `badges` is an array; `cards` is an object; `exam` is null or has two arrays. Anything else → `emptyProgress()`. Catch every storage exception. **Card progress for ids not in `validCardIds` is kept** (its chapter may only be missing this time). A saved exam with an id not in `validCardIds` is set to `null` only when `allChaptersLoaded` is true; otherwise it is kept.

- [ ] **Step 1: Write the failing tests**

```ts
// rules.test.ts
test('known only after 3 correct typed answers in a row', () => {
  let p = emptyProgress()
  p = recordTyped(p, 'a|fr-nl', true, 'test'); p = recordTyped(p, 'a|fr-nl', true, 'exam')
  expect(isKnown(p, 'a|fr-nl')).toBe(false)
  p = recordTyped(p, 'a|fr-nl', true, 'test'); expect(isKnown(p, 'a|fr-nl')).toBe(true)
  p = recordTyped(p, 'a|fr-nl', false, 'exam'); expect(isKnown(p, 'a|fr-nl')).toBe(false)
  expect(p.cards['a|fr-nl'].wrongTotal).toBe(1)
})
test('points: test and exam +3, practice +1, wrong 0', ...)
test('streak counts only in test mode', () => {
  // test ✓✓ → current 2, best 2; exam ✗ → current still 2; test ✗ → current 0, best 2
})
test('badge needs strictly more than 85% and is never removed', () => {
  // chapter with 20 cards: 17 known (85%) → no badge; 18 known → badge 'ch01', newBadges ['ch01']
  // then make cards unknown → badges still contains 'ch01', newBadges []
})
test('a badge of a chapter that is not loaded is kept', () => { /* badges ['ch02'], cards only ch01 → 'ch02' stays */ })
test('chapterStats ignores progress for cards no longer in the data', ...)
test('examResumable is false when one card is missing', ...)
// storage.test.ts (jsdom localStorage; clear it in beforeEach)
test('round-trips progress', ...)
test('corrupt JSON gives empty progress', () => { localStorage.setItem(STORAGE_KEY, '{oops'); expect(loadProgress(new Set(), true)).toEqual(emptyProgress()) })
test('wrong shape gives empty progress', () => { /* e.g. {"version":2} or {"points":"x"} */ })
test('progress of unknown cards is kept', ...)
test('saved exam with unknown card ids is dropped when all chapters loaded', ...)
test('saved exam with unknown card ids is kept when a chapter failed to load', ...)
test('localStorage throwing gives empty progress and save does not throw', () => {
  // vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error() }); same for setItem
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/progress`. Expected: FAIL.

- [ ] **Step 3: Implement `src/progress/rules.ts` and `src/progress/storage.ts`**

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/progress`. Expected: all passed.

- [ ] **Step 5: Commit**

`git commit -m "feat: progress rules, badges, streak and safe storage"`

---

### Task 5: Session logic (selection, rounds, exams)

**Files:**
- Create: `src/session/random.ts`, `src/session/select.ts`, `src/session/round.ts`, `src/session/exam.ts`, `src/test/rng.ts`, and a `*.test.ts` for each of select, round and exam

**Interfaces:**
- Consumes: Task 2 types; `isKnown`, `recordTyped` and `awardBadges` (Task 4); `checkAnswer` (Task 3).
- Produces:
  - `type Rng = () => number`; `shuffle<T>(items: readonly T[], rng: Rng): T[]` (Fisher–Yates, returns a copy)
  - `ROUND_SIZE = 20`, `EXAM_SIZE = 50`
  - `pickRoundCards(cards: Card[], p: Progress, rng: Rng): Card[]`: only cards that aren't known, **at most one card per entry** (pick a random direction among that entry's unknown cards), shuffled, at most `ROUND_SIZE`.
  - `pickExamCards(cards: Card[], p: Progress, rng: Rng): Card[]`: see the algorithm below.
  - `RETRY_GAP = 3`
  - `createRound(cardIds: string[]): RoundState`
  - `currentItem(s: RoundState): QueueItem | null`
  - `answerRound(s: RoundState, correct: boolean): RoundState`: removes the head. If wrong, it inserts `{cardId, retry: true}` at index `RETRY_GAP - 1` of the remaining queue (or at the end if the queue is shorter). `firstTryCorrect` goes up only for a correct non-retry answer. The round is over when the queue is empty.
  - `createExam(cardIds: string[]): ExamState`; `answerExam(s: ExamState, typed: string): ExamState`; `examFinished(s: ExamState): boolean`
  - `interface ExamResult { correct: number; total: number; percent: number; results: { cardId: string; typed: string; correct: boolean }[] }`
  - `scoreExam(s: ExamState, cardsById: Map<string, Card>): ExamResult` (`percent = Math.round(correct / total * 100)`)
  - `applyExam(p: Progress, r: ExamResult, cards: Card[]): { progress: Progress; newBadges: string[] }`: runs `recordTyped(..., 'exam')` for each result in question order, then `awardBadges`, then sets `exam: null`.
  - `src/test/rng.ts`: `seeded(seed: number): Rng` (mulberry32), test-only.

**`pickExamCards` algorithm:**
1. `n = min(EXAM_SIZE, cards.length)`.
2. Group the cards by entry. In a random order of entries, take one random card per entry as the *first pass*. If the first pass has fewer than `n` cards, the remaining second directions form the *second pass*.
3. Candidates are the first pass plus as much of the second pass as is needed to reach `n`, taken in random order.
4. Hard: the candidates with `wrongTotal > 0`, sorted by `wrongTotal` descending with random tie-breaks, up to `floor(n / 2)`. Easy: random from the other candidates to make up `n`. If there aren't enough of those, fill up with the remaining hard ones.
5. Order: if no entry has both directions selected, just shuffle. Otherwise the order is:
   - first-pass cards whose partner is also selected (shuffled),
   - then the other first-pass cards (shuffled),
   - then the second-pass cards, in the same order as their partners.

   Every pair then ends up exactly (number of first-pass cards) positions apart. Pairs can only happen when the candidates are exactly `n`, so then every candidate is selected.

- [ ] **Step 1: Write the failing tests** (use `seeded` from `src/test/rng.ts`)

```ts
// select.test.ts
test('round: never more than 20, never a known card, never both directions of an entry', ...)
test('round: fewer unknown cards than 20 gives all of them, one per entry', ...)
test('round: everything known gives an empty array', ...)
test('round: a 1-entry chapter gives exactly 1 card', ...)
test('round: order differs from textbook order for some seed', ...)
test('exam: 50 cards out of 120 entries, includes known cards, no entry twice', ...)
test('exam: the 25 highest wrongTotal cards are all included', () => {
  // 120 entries, give 30 cards wrongTotal 1..30 → the 25 with 6..30 are all in the result
})
test('exam: fewer than 50 cards in total gives all of them, with pairs far apart', () => {
  // 10 entries (20 cards) → 20 cards; for every entry, the indexes of its two cards differ by >= 5
})
// round.test.ts
test('a wrong answer comes back 3 positions later as a retry', () => {
  // queue a,b,c,d,e; answer a wrong → queue b,c,a(retry),d,e
})
test('a wrong answer near the end goes to the end', ...)
test('a retry answered correctly does not count as first-try correct', ...)
test('the round ends when every card has been answered correctly once', ...)
// exam.test.ts
test('scoreExam counts correct answers and percent', () => { /* 44/50 → 88 */ })
test('applyExam updates known status, points +3 each, does not touch streak, clears exam', ...)
test('applyExam awards a badge once the chapter crosses 85%', ...)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/session`. Expected: FAIL.

- [ ] **Step 3: Implement the four modules and the test rng**

- [ ] **Step 4: Run all tests**

Run: `npm test`. Expected: all passed.

- [ ] **Step 5: Commit**

`git commit -m "feat: round, exam and card selection logic"`

---

### Task 6: Loading chapters at runtime

**Files:**
- Create: `src/data/loadChapters.ts`, `src/data/loadChapters.test.ts`, `src/components/ChapterGate.tsx`, `src/components/ChapterGate.test.tsx`

**Interfaces:**
- Consumes: `validateChapterList`, `validateChapter` (Task 2).
- Produces:
  - `chaptersBaseUrl(): string`: `import.meta.env.VITE_CHAPTERS_URL || './chapters/'` (add `VITE_CHAPTERS_URL?: string` to `ImportMetaEnv` in `src/vite-env.d.ts`; create that file if the template has none).
  - `type LoadResult = { status: 'ok'; chapters: Chapter[]; failed: string[] } | { status: 'error' }`
  - `loadChapters(baseUrl: string, fetchFn: typeof fetch = fetch): Promise<LoadResult>`: fetches `baseUrl + 'index.json'`, then every listed file in parallel, all with `{ cache: 'no-cache' }`. A file that fails (network error, non-2xx, invalid JSON, `validateChapter` fails) goes into `failed` (its file name). Then, **in list order**, a chapter that uses an entry id already used by an earlier kept chapter goes into `failed` too. `chapters` keeps list order. `status: 'error'` when the list itself fails or no chapter is kept.
  - `<ChapterGate load={() => Promise<LoadResult>}>{(chapters: Chapter[], failed: string[]) => ReactNode}</ChapterGate>`: shows "Woorden laden…" while loading; on error shows "De woorden konden niet geladen worden." and an "Opnieuw proberen" button that calls `load` again; on ok renders the children, with a small notice above them for each failed file: "*ch03.json* kon niet geladen worden." (dismissable).

- [ ] **Step 1: Write the failing tests** (a fake `fetchFn` that maps URLs to responses)

```ts
// loadChapters.test.ts
test('loads listed chapters in list order with cache no-cache', ...)   // also asserts the init arg of every call
test('ignores files that are not listed', ...)
test('a missing chapter (404) is skipped and reported', ...)
test('a chapter with invalid JSON (trailing comma) is skipped and reported', ...)
test('a chapter whose id does not match its file name is skipped', ...)
test('a later chapter reusing an entry id of an earlier chapter is skipped', ...)
test('the list failing gives status error', ...)
test('no chapter loading gives status error', ...)
// ChapterGate.test.tsx
test('shows the loading text, then the children', ...)
test('error shows "Opnieuw proberen", which loads again', ...)
test('a failed chapter shows a notice naming the file', ...)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/data/loadChapters src/components/ChapterGate`. Expected: FAIL.

- [ ] **Step 3: Implement `loadChapters.ts` and `ChapterGate.tsx`**

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`. Expected: all passed.

- [ ] **Step 5: Commit**

`git commit -m "feat: load chapter files at runtime with per-chapter failure"`

---

### Task 7: App shell, home, chapter picker, settings

**Files:**
- Create: `src/state/useProgress.ts`, `src/screens/Home.tsx`, `src/screens/ChapterPicker.tsx`, `src/screens/Settings.tsx`, `src/components/ChapterTile.tsx`, `src/styles.css`, `src/screens/Home.test.tsx`, `src/screens/ChapterPicker.test.tsx`, `src/screens/Settings.test.tsx`
- Modify: `src/App.tsx`, `src/main.tsx` (import `styles.css`), `src/App.test.tsx`

**Interfaces:**
- Consumes: `ChapterGate`, `loadChapters`, `chaptersBaseUrl` (Task 6); `buildCards` and `cardsForChapters` (Task 3); `loadProgress`, `saveProgress`, `clearProgress`, `emptyProgress`, `chapterStats` and `examResumable` (Task 4).
- Produces:
  - `useProgress(validCardIds: Set<string>, allChaptersLoaded: boolean): { progress: Progress; update(fn: (p: Progress) => Progress): void; reset(): void }`. It loads once, saves after every `update`, and `reset` clears storage and sets `emptyProgress()`.
  - `type Mode = 'practice' | 'test' | 'exam'`
  - `type Screen = { name: 'home' } | { name: 'pick'; mode: Mode } | { name: 'practice' | 'test'; chapterIds: string[] } | { name: 'exam'; chapterIds: string[] | null /* null = resume */ } | { name: 'settings' }`
  - `<Home progress chapters cards onStart(mode: Mode) onResumeExam() onSettings() />`: shows total points, the best streak, a `ChapterTile` per loaded chapter (title, `percent`%, progress bar, the "I got this" badge lit or greyed out), three mode buttons, and "Examen hervatten" only when `progress.exam` is not null. When the exam isn't resumable (`examResumable` false), the button is disabled with the note "Kan pas verder als alle hoofdstukken geladen zijn."
  - `<ChapterPicker chapters mode onConfirm(chapterIds: string[]) onBack() />`: a checkbox per loaded chapter plus "Alles"/"Niets". For exam all chapters start checked, otherwise none. The start button is disabled when nothing is selected.
  - `<Settings onReset() onBack() />`: "Alles resetten" asks for confirmation (an in-page "Weet je het zeker?" with yes/no; no `window.confirm`) before calling `onReset`.
  - `App` = `<h1>Woordtrainer</h1>` + `<ChapterGate load={() => loadChapters(chaptersBaseUrl())}>` whose child builds `cards = buildCards(chapters)` once, calls `useProgress(cardIds, failed.length === 0)`, owns `Screen`, and passes `Math.random` as the rng to the session screens.

- [ ] **Step 1: Write the failing tests**

```tsx
test('Home shows points, best streak and chapter percentage with badge state', () => {
  // progress with points 42, bestStreak 7, badge 'ch00' → texts '42', '7', 'Hoofdstuk 0', badge has an accessible name containing 'I got this' and is marked earned
})
test('Home shows "Examen hervatten" only when an exam is saved', ...)
test('Home disables "Examen hervatten" when the saved exam has cards that are not loaded', ...)
test('ChapterPicker: exam preselects all, test preselects none and start is disabled', ...)
test('Settings resets only after confirmation', ...)
// App.test.tsx: stub global fetch to serve index.json + a one-entry chapter
test('App loads chapters and shows the home screen', ...)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/screens src/App`. Expected: FAIL.

- [ ] **Step 3: Implement the hook, the screens, `App` navigation and the base styles**

Styles: mobile-first single column, max width ~640px centred on desktop, large tap targets (≥ 44px), a cheerful look. The visual style is the builder's choice.

- [ ] **Step 4: Run the tests to verify they pass, then check by hand**

Run: `npm test`. Expected: all passed. Run `npm run dev` and check that home loads the sample chapter at 360px and at desktop width. Temporarily list a missing `ch99.json` in `index.json`: the notice appears and the app still works. Revert.

- [ ] **Step 5: Commit**

`git commit -m "feat: home, chapter picker and settings screens"`

---

### Task 8: Practice and Test screens

**Files:**
- Create: `src/components/AnswerInput.tsx`, `src/components/Celebration.tsx`, `src/screens/PracticeScreen.tsx`, `src/screens/TestScreen.tsx`, `src/screens/RoundSummary.tsx`, `src/screens/PracticeScreen.test.tsx`, `src/screens/TestScreen.test.tsx`
- Modify: `src/App.tsx` (wire up the screens)

**Interfaces:**
- Consumes: `pickRoundCards`, `createRound`, `currentItem`, `answerRound` and `Rng` (Task 5); `checkAnswer` (Task 3); `recordTyped`, `recordPractice` and `awardBadges` (Task 4); `useProgress().update` (Task 7).
- Produces:
  - `<AnswerInput onSubmit(text: string) disabled? />`: has the required input attributes. Enter submits. **A blank or whitespace-only value is ignored** (`onSubmit` isn't called). It refocuses after each question.
  - `<Celebration kind: 'badge' | 'record' label: string onDone() />`: the builder decides how it looks. It must be dismissable and must not block typing for more than ~1.5s.
  - `<PracticeScreen cards progress update rng onExit(goToExam?: boolean) />` and `<TestScreen ...same props />`. `App` passes `cards = cardsForChapters(allCards, chapterIds)`. When the round starts, call `pickRoundCards`. If that returns empty, show "Je kent alle woorden van deze hoofdstukken al! Probeer een Examen." with buttons to Exam and Home.
  - `<RoundSummary firstTryCorrect total pointsEarned onAgain() onHome() />`

**Behaviour:**
- **Practice:** show the prompt and the direction label ("FR → NL" or "NL → FR"). "Toon antwoord" shows `card.display`. Then "Ik wist het" means `answerRound(true)`, plus `recordPractice(p, true)` on a first try. "Wist ik niet" means `answerRound(false)`.
- **Test:** the prompt, the direction label, the current streak, and the points earned this round. On submit, `checkAnswer`.
  - On a first try (`!item.retry`), run `recordTyped(p, id, correct, 'test')`, then `awardBadges`.
  - Feedback: correct → "Goed! +3" ("Goed!" on a retry); wrong → "Jij typte: *X*" and "Juist: *card.display*".
  - Enter or "Volgende" continues.
  - Retries go through `answerRound` only.
- Record celebration: remember `bestStreak` at the start of the round, and celebrate the first time it's beaten in that round. Badge celebration: one for each new badge, using the chapter title.

- [ ] **Step 1: Write the failing tests** (fixture: 3 French entries incl. `une maison`; rng seeded)

```tsx
test('Test: correct answer shows "Goed! +3", adds 3 points and raises the streak', ...)
test('Test: "la maison" for "une maison" is wrong and shows "Juist: une maison"', ...)
test('Test: wrong answer resets the streak, card comes back as a retry without points', ...)
test('Test: pressing Enter on an empty input does nothing', () => {
  // streak and question unchanged, no feedback shown
})
test('Test: the round summary appears after every card has been answered correctly', ...)
test('Test: all cards known shows the "Probeer een Examen" message', ...)
test('Practice: "Ik wist het" on first try adds 1 point and never changes known status', ...)
test('Practice: "Wist ik niet" brings the card back later', ...)
test('Test: beating the best streak shows the record celebration once', ...)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/screens`. Expected: FAIL.

- [ ] **Step 3: Implement the components and screens, and wire them into `App`**

- [ ] **Step 4: Run the tests and check by hand**

Run: `npm test`. Expected: all passed. In `npm run dev` at 360px, play one round of each mode. Check that the prompt and the input stay visible with the on-screen keyboard (use mobile emulation in DevTools).

- [ ] **Step 5: Commit**

`git commit -m "feat: practice and test rounds with feedback and celebrations"`

---

### Task 9: Exam screen and results

**Files:**
- Create: `src/screens/ExamScreen.tsx`, `src/screens/ExamResultView.tsx`, `src/screens/ExamScreen.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `cardsForChapters` (Task 3); `pickExamCards`, `createExam`, `answerExam`, `examFinished`, `scoreExam`, `applyExam` and `ExamResult` (Task 5); `AnswerInput` and `Celebration` (Task 8); `update` (Task 7).
- Produces:
  - `<ExamScreen cards progress update rng chapterIds: string[] | null onExit() />`, where `cards` = all loaded cards.
    - `chapterIds` given → `pickExamCards(cardsForChapters(...))`, `createExam`, and **replace** `progress.exam` (this saves it).
    - `null` → resume `progress.exam` (Home only offers this when `examResumable`).
    - After each submit, `update(p => ({ ...p, exam: answerExam(p.exam!, typed) }))`. There's **no feedback, no points and no streak** on screen, only "Vraag 12 / 50" and the direction label.
    - When finished: `scoreExam`, then `update` with `applyExam`, then show `ExamResultView`, then badge celebrations.
  - `<ExamResultView result cardsById onHome() />`: "87%" and "44 / 50", plus a list of wrong answers (prompt, what he typed, `display`). If he made no mistakes, show a short message instead.
- Home's "Examen" button goes to the picker (`mode: 'exam'`), and if `progress.exam` exists, the picker's start button text reads "Nieuw examen (het vorige vervalt)".

- [ ] **Step 1: Write the failing tests**

```tsx
test('Exam shows no right/wrong feedback and no points while answering', ...)
test('Exam progress is saved after each answer and can be resumed', () => {
  // answer 2 of 5, unmount, mount with chapterIds=null and the saved progress → shows "Vraag 3 / 5"
})
test('Exam end: score, list of wrong answers, points +3 per correct, streak unchanged, exam cleared', ...)
test('Exam: pressing Enter on an empty input does not advance', ...)
test('Exam: wrong answer makes a known card unknown', ...)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/screens/ExamScreen`. Expected: FAIL.

- [ ] **Step 3: Implement and wire into `App`**

- [ ] **Step 4: Run the tests and check by hand**

Run: `npm test`. Expected: all passed. In dev, start an exam, reload the page halfway, resume it, and finish it.

- [ ] **Step 5: Commit**

`git commit -m "feat: exam mode with resume and results"`

---

### Task 10: Home-screen install, deployment and README

**Files:**
- Create: `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png` (simple generated icons are fine), `.github/workflows/deploy.yml`, `.github/workflows/check-chapters.yml`, `README.md`
- Modify: `index.html` (manifest link, `theme-color`, viewport `width=device-width, initial-scale=1`), `vite.config.ts` (strip-chapters plugin)

**Interfaces:**
- Consumes: the build from Task 1, `npm run check-chapters` from Task 2, `VITE_CHAPTERS_URL` from Task 6.
- Produces: a Pages deployment on every code push to `main`; a check-only run on chapter pushes.

- [ ] **Step 1: Manifest**

`name: "Woordtrainer"`, `short_name: "Woorden"`, `start_url: "./"`, `display: "standalone"`, the icons, `theme_color` and `background_color` matching the styles. No service worker.

- [ ] **Step 2: Keep chapters out of the production build**

Vite copies all of `public/` into `dist/`. Add this plugin to `vite.config.ts` (`rmSync` from `node:fs`) so a deploy build has no stale copy, while a local build still works:

```ts
{
  name: 'strip-chapters',
  apply: 'build',
  closeBundle() {
    if (process.env.VITE_CHAPTERS_URL) rmSync('dist/chapters', { recursive: true, force: true })
  },
}
```

- [ ] **Step 3: Workflows**

`deploy.yml`: on `push` to `main` with `paths-ignore: ['public/chapters/**']`, plus `workflow_dispatch`. Use the official GitHub Pages actions: checkout, setup-node 24, `npm ci`, `npm test`, `npm run check-chapters`, `npm run build` with `env: VITE_CHAPTERS_URL: https://raw.githubusercontent.com/${{ github.repository }}/main/public/chapters/`, upload-pages-artifact on `dist`, deploy-pages. Set `permissions: pages: write, id-token: write`.

`check-chapters.yml`: on `push` to `main` with `paths: ['public/chapters/**']`: checkout, setup-node 24, `npm ci`, `npm run check-chapters`. No deploy, no permissions beyond `contents: read`.

- [ ] **Step 4: README**

In Dutch, for the parent:
- How to run the app locally.
- How to publish it: create a **public** GitHub repo, push, and set Settings → Pages → Source "GitHub Actions".
- How to add a chapter: send photos to Claude, who writes `public/chapters/chNN.json` (singular nouns always with *un/une*, plural-only nouns with *des*), adds it to `index.json`, runs `npm run check-chapters`, commits and pushes. It's live within about 5 minutes, without a new deploy.
- Remove `ch00.json` from `index.json` once real chapters are in.
- Ids must never change and are never reused.

- [ ] **Step 5: Verify**

Run: `npm test`, `npm run check-chapters` and `npm run build`. Expected: all succeed and `dist/chapters/` exists (local build). Run: `VITE_CHAPTERS_URL=https://example.invalid/ npm run build`. Expected: build succeeds and `dist/chapters/` does not exist. Run `npm run build && npx vite preview` and check that the manifest loads (DevTools → Application → Manifest shows no errors).

- [ ] **Step 6: Commit**

`git commit -m "chore: web app manifest, Pages deploy and chapter-check workflows, README"`

---

## After the plan

- Pushing to GitHub needs the parent's own GitHub account and a public repo. Ask before pushing.
- After the first deploy, open the live site and confirm the sample chapter loads from `raw.githubusercontent.com` (DevTools → Network).
- Real chapters replace the sample chapter once the photos arrive. That's data entry against the rules in the spec's "Chapter files" section and doesn't need a new plan.

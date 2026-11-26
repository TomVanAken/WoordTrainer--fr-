# Almost-correct feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In test and exam, label a near-miss spelling error "Bijna goed" (scored as wrong) and underline the differing letters in the typed answer and the correction.

**Architecture:** A pure diff/edit-distance helper (`src/cards/spelling.ts`) feeds `nearMiss()` in `checkAnswer.ts`, which returns the nearest accepted form when a wrong answer is within the typo threshold. A small `Marked` component renders diff segments; `TestScreen` and `ExamResultView` use it. Scoring is untouched.

**Tech Stack:** React + TypeScript, Vitest (`npm test`), plain CSS in `src/styles.css`.

**Spec:** `docs/superpowers/specs/2026-11-26-almost-correct-design.md`

## Global Constraints

- "Almost" never changes score, points, streak or card progress: `checkAnswer` and `recordTyped(..., correct)` keep their current behaviour.
- Threshold: nearest accepted form within 1 edit if the form's noun/word has <= 7 letters, 2 edits if longer; words under 4 letters are never "almost". An adjacent swap counts as 1 edit.
- Wrong article or wrong/missing gender (for noun cards) stays plain "Fout".
- Highlight = bold red + underline (never colour alone). UI copy is Dutch: title `≈ Bijna goed, let op de spelling`.
- If the correction cannot be matched to the closest form inside `card.display`, show `card.display` plain.

## Review Focus

- Typed text with several answers ("verpakken, inpakken") or `(...)` notation: no "almost" (plain wrong behaviour as today).
- `un maisson` (wrong article AND typo): stays plain wrong.
- Empty / "weet ik niet" answers: never "almost".
- Case-only differences on non-case-sensitive cards: already correct, not highlighted.
- `card.display` with several forms ("a / b"): only the matched form is marked.

---

### Task 1: Diff helper and near-miss detection

**Files:**
- Create: `src/cards/spelling.ts`, `src/cards/spelling.test.ts`
- Modify: `src/cards/checkAnswer.ts` (add export), `src/cards/checkAnswer.test.ts`

**Interfaces:**
- Produces: `type Seg = { text: string; diff: boolean }`
- Produces: `editDistance(a: string, b: string): number` (Damerau: adjacent swap = 1, case-insensitive)
- Produces: `diffMark(a: string, b: string): { a: Seg[]; b: Seg[] }` (aligned; differing characters have `diff: true`; adjacent same-flag runs merged; case-insensitive; each side's segment texts concatenate back to its input)
- Produces: `nearMiss(typed: string, card: Card, gender?: Gender): string | null` in `checkAnswer.ts` — the nearest accepted form text (one of the strings tried by `checkSingle`, after `expandOptional`) when `!checkAnswer(typed, card, gender)` and the thresholds above hold; otherwise `null`.

- [ ] **Step 1: Write failing tests** in `spelling.test.ts`: `editDistance('maison','maisson')===1`, `editDistance('chat','chta')===1`, `editDistance('Chat','chat')===0`; `diffMark('maisson','maison')` has exactly one `diff: true` character on the `a` side and both sides join back to their inputs.
- [ ] **Step 2: Write failing tests** in `checkAnswer.test.ts` using its `card()` helper: `nearMiss('une maisson', card('nl-fr',[['une maison',false]]),'f')` is non-null and differs from the typed text only at the extra `s`; `nearMiss('une maison', same, 'f')===null` (correct); `nearMiss('un maisson', same,'f')===null` (wrong article); `nearMiss('maisson', same, 'm')===null` (wrong gender); `nearMiss('chien', card('fr-nl',[['hond',false]]))===null` (far); `nearMiss('ik', card('fr-nl',[['il',false]]))===null` (short); `nearMiss('verpakken, inpakkn', card('fr-nl',[['inpakken',false]]))===null`; `nearMiss('', c)===null`; a 9-letter word with 2 slips returns the form, 3 slips returns null.
- [ ] **Step 3: Run** `npx vitest run src/cards` — Expected: FAIL (functions not defined).
- [ ] **Step 4: Implement** `spelling.ts` (Damerau-Levenshtein table; `diffMark` via the same table's backtrace). Implement `nearMiss` in `checkAnswer.ts` reusing `expandOptional`, `frenchArticleForms`, `normalize` and the article logic: return `null` when `checkAnswer` is true, typed is empty, or typed contains `,`, `;`, `/` or `(`. For each form whose `gender` is undefined or equals `gender`, split a leading French article off both typed and form; the typed article, if present, must equal the form's article (case-insensitive); measure the remainder with `editDistance` against the threshold; return the closest form's text.
- [ ] **Step 5: Run** `npx vitest run src/cards` — Expected: PASS.
- [ ] **Step 6: Commit** `git add src/cards && git commit -m "feat: detect near-miss spelling answers and compute letter diffs"`

### Task 2: Test screen feedback

**Files:**
- Create: `src/components/Marked.tsx`
- Modify: `src/screens/TestScreen.tsx`, `src/styles.css`, `src/screens/TestScreen.test.tsx`

**Interfaces:**
- Consumes: `nearMiss`, `diffMark`, `Seg` from Task 1.
- Produces: `Marked({ segs }: { segs: Seg[] }): JSX.Element` — renders `<mark className="spell-diff">` for `diff` segments, plain text otherwise.
- Produces: `markedDisplay(display: string, form: string, segs: Seg[]): ReactNode` in `Marked.tsx` — `display` with the first occurrence of `form` replaced by `<Marked segs>`; plain `display` if `form` is not a substring.

- [ ] **Step 1: Write failing tests** in `TestScreen.test.tsx` (follow its existing render helpers): typing a one-letter slip shows `Bijna goed, let op de spelling`, not `Fout`, shows no `+3`, and `mark.spell-diff` elements exist in both the typed line and the Juist line; a completely wrong answer still shows `Fout` and no `mark`; "weet ik niet" still shows `Je wist het niet.`; streak/progress after a near-miss equal those after a plain wrong answer.
- [ ] **Step 2: Run** `npx vitest run src/screens/TestScreen.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement**: add `almost: string | null` to `Feedback`, set from `!correct && !dontKnow ? nearMiss(typed, card, gender) : null` in `answer()` (scoring lines unchanged); render the new title and marked lines per Global Constraints. CSS: `.spell-diff { background: none; color: #b00020; font-weight: 700; text-decoration: underline wavy; }` plus a `.feedback-almost` background distinct from `.feedback-bad` (amber, e.g. `#fff0c2`).
- [ ] **Step 4: Run** `npx vitest run src/screens` — Expected: PASS.
- [ ] **Step 5: Commit** `git add src && git commit -m "feat: highlight spelling slips in test feedback"`

### Task 3: Exam result list

**Files:**
- Modify: `src/session/exam.ts`, `src/session/exam.test.ts`, `src/screens/ExamResultView.tsx`, `src/screens/ExamScreen.test.tsx`

**Interfaces:**
- Consumes: `nearMiss`, `diffMark`, `Marked`, `markedDisplay`.
- Produces: `ExamResult.results[i].almost?: string` — set only when `!correct` and `nearMiss(...)` is non-null; `correct` and `percent` unchanged.

- [ ] **Step 1: Write failing tests**: in `exam.test.ts`, `scoreExam` gives `correct: false` and a defined `almost` for a typo answer, `almost` undefined for a far answer, and the same `percent` as if it were far-wrong; in the exam screen test, the wrong list shows `Bijna goed` and `mark.spell-diff` for the typo entry only.
- [ ] **Step 2: Run** `npx vitest run src/session src/screens` — Expected: FAIL.
- [ ] **Step 3: Implement** `almost` in `scoreExam`; in `ExamResultView`, for entries with `almost`, prefix `≈ Bijna goed` and render typed/Juist with the marked helpers (same fallback rule).
- [ ] **Step 4: Run** `npm test`, `npm run lint` and `npm run build` — Expected: all PASS.
- [ ] **Step 5: Commit** `git add src && git commit -m "feat: show near-miss spelling in exam results"`

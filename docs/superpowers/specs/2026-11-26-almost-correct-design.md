# Almost-correct feedback (typo vs. wrong) - design

## Intent
Tell a near-miss spelling error apart from a completely wrong answer, and show exactly which letters differ.

## Goals
- Three outcomes in test and exam: correct, almost (typo), wrong.
- Highlight differing characters in the typed text and in the correction (bold red + underline, not colour alone).

## Non-goals / anti-goals
- "Almost" must NOT score as correct, give points, or change streak/progress: it is scored exactly like wrong.
- Article and gender mistakes stay plain wrong.

## Approaches
1. Own edit-distance + alignment diff (chosen: no dependency, one alignment gives both closeness and diff).
2. Fuzzy-matching library (overkill).
3. Highlight typed text only (leaves out the correction side requested).

## Design
- `closeness(typed, card, gender)` in `src/cards/checkAnswer.ts`: only when `checkAnswer` is false and gender fits; nearest accepted form within 1 edit (<=7 letters) or 2 edits (longer); words too short never "almost".
- Test: title "≈ Bijna goed, let op de spelling"; "Jij typte" and "Juist" lines highlight differing letters; falls back to plain text when the display cannot be matched to the closest form (brackets, several answers).
- Exam result list: same label and highlighting.
- Tests: thresholds and highlighting.

## Left to the builder
Exact thresholds' edge cases, CSS class names, diff helper placement.

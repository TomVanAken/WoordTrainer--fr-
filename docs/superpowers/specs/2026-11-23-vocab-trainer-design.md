# Vocabulary Trainer (FR ↔ NL): Design

*2026-11-23. Language pair changed from English ↔ Dutch to French ↔ Dutch on 2026-11-23;
the way the app works is unchanged.*

## Intent and why

A small web app for one Dutch-speaking teenager to learn the French vocabulary from his
school textbook.

Two problems drive it:

1. **He gets bored quickly.** Studying has to feel like a game: short rounds, points,
   badges and a record to beat.
2. **He learns words in textbook order**, so he struggles when a school test asks them in
   random order. The app never presents words in book order, and it mixes both
   translation directions.

He doesn't like typing much, but multiple choice is too easy. So there's a low-effort
mode with no typing (fewer points) and a typed mode (more points).

Success: he uses it on his own, keeps coming back for "one more round", and does better
on random-order vocabulary tests at school.

## Goals

- Translate words and phrases FR→NL and NL→FR, chosen per chapter or as a mix of chapters.
- Three modes: **Practice** (flip cards), **Test** (typed), **Exam** (typed review before a
  school test).
- Gamification: points, an "I got this" badge per chapter, and a record streak.
- Responsive: works well on a computer and on a smartphone.
- Free to host, no accounts, no running costs.

## Non-goals

- Uploading or reading textbook photos in the app. The parent sends photos to Claude, who
  turns them into chapter files (see "Chapter files" below).
- Multiple users, accounts, or syncing progress between devices.
- Multiple choice.
- Pronunciation or speech input.
- Any content other than the textbook vocabulary.
- Grammar exercises (conjugation tables, gender drills). Only the vocabulary lists.

## Anti-goals (failure even if it "works")

- It feels like homework: long sessions, walls of text, slow flow.
- **Marking an answer wrong when it's actually right** (capital letters he didn't need,
  a missing Dutch article, an extra space, *oe* typed for *œ*). That frustration
  kills motivation fast.
- It's too easy to rack up points without learning.
- It needs maintenance, a server, or paid services.

## Constraints

- React (the parent's choice).
- Static site, free hosting (for example GitHub Pages). Progress is kept in the browser
  (`localStorage`), one set per device. Progress is not shared between devices, and the
  parent accepted that.
- Word lists are JSON files, one per chapter, that the app loads when it starts. Adding a
  chapter needs **no build and no deploy**: Claude transcribes the photos, commits the
  chapter file plus a line in the chapter list, and it shows up within about 5 minutes.
  (Changed 2026-11-23, see "Chapter files".)

## Approaches considered

1. **Free hosted static website (chosen).** React app with built-in word lists, hosted
   free, progress in the browser. Works on any device from a link and can be added to
   the home screen. Downside: progress is separate on each device.
2. **Only on the home computer.** No hosting at all, but usable on one PC only, and
   starting it takes a few steps. Rejected: he should be able to play on his phone.
3. **Hosted with a cloud database for syncing.** Progress follows him across devices,
   but it needs a login, more moving parts and a service to maintain. Rejected: more
   complexity than one kid needs.

The parent picked option 1, with the requirement that it's responsive (computer and
smartphone).

## How it works (decided with the parent)

### Words and cards

- A chapter contains entries (a word or phrase) with one or more accepted French forms
  and one or more accepted Dutch forms (for example *une maison → het huis, de woning*).
- **Each entry is two cards:** FR→NL and NL→FR. Each card tracks its own progress.
- **A card is "known" once its last three typed answers (Test or Exam) were correct.** One
  wrong typed answer resets that.
- Flip-card answers in Practice never change whether a card is known.

### Choosing what to study

- He picks one chapter or several (a mix) before every session, in every mode.
- Cards are always shuffled and directions are mixed. Textbook order is never used.

### Practice mode (flip cards)

- Shows the word. He thinks of the answer, flips the card, and taps "knew it" or
  "didn't know".
- "Knew it" = **1 point**.
- **Known cards are skipped.**
- Missed cards come back later in the same round.

### Test mode (typed)

- Shows the word, he types the translation.
- Correct = **3 points**.
- Immediate feedback. When he's wrong, the app shows the correct answer next to what he
  typed. While the feedback shows, the answer field is hidden, and right/wrong is shown
  with an icon and a word (✓ Goed! / ✗ Fout), not by colour alone (parent's decision).
- **Known cards are skipped.**
- Missed cards come back later in the same round.
- If every card in his selection is already known, the app says so and suggests Exam.
- A **"Weet ik niet"** button (added by the parent): counts as a wrong answer (streak resets,
  no points, the card comes back later) and shows the correct answer, so he doesn't have
  to type junk to move on.

### Exam mode (typed, review before a school test)

- He picks the chapters (the ones on the school test). By default, all chapters are
  selected.
- **At most 50 questions**, in both directions, **including known cards**. If the picked
  chapters have fewer than 50 cards, he gets all of them.
- **A mix of hard and easy cards:** about half are the cards with the most wrong typed
  answers so far, and the other half is picked at random from the rest. Everything is
  shuffled together.
- **No feedback per question.** At the end he sees a score (*87%, 44/50*) and a list of
  the cards he got wrong with the correct answers.
- Results update progress: a wrong answer means that card is no longer known (so it
  comes back in Practice and Test), and a correct answer counts toward known.
- A **"Weet ik niet"** button skips to the next question; it counts as a wrong answer and
  shows as "(weet ik niet)" in the list at the end.
- Correct = 3 points. **Exam answers do not count for the streak** (decided by the parent: known cards would make it too easy to build a record).
- An exam in progress is saved. If the tab closes, it picks up where it left off.

### Answer checking (Test and Exam)

- **Upper/lower case doesn't matter**, except where the answer language needs a capital.
  Those entries are marked in the data as needing exact capitals. A capital at the start
  of a phrase doesn't count.
  - **French:** names, places, and nationality *nouns* (*un Français*). Days, months,
    languages and nationality adjectives are lower case in French (*lundi*, *français*,
    *un livre français*), so they are not marked.
  - **Dutch:** names, places, languages and nationalities (*Frans*, *een Fransman*).
    Days and months are lower case (*maandag*, *januari*).
  - The same entry can need a capital in one direction only: *français* (no capital)
    vs *Frans* (capital required).
- **The Dutch article (de/het/een) is optional and not checked.** *huis* and *het huis*
  are both correct; so are *Fransman* and *een Fransman*.
- **The French article is mandatory for singular nouns, and it must have the right
  gender** (decided by the parent, changed 2026-11-23). Both the indefinite (*un/une*)
  and the definite (*le/la/l'*) article are accepted.
  - *une maison* and *la maison* are correct. *maison*, *un maison* and *le maison* are
    wrong. The feedback always shows the *un/une* form (*une maison*).
  - Before a vowel the definite article is *l'*: *une école* and *l'école* are correct,
    *la école* is wrong. Before *h* both *l'* and *le/la* are accepted (the data doesn't
    know which *h* is aspirated).
  - **Gender choice for *l'*:** *l'* hides the gender, so as soon as his answer starts
    with *l'* the app shows a required choice "Mannelijk (un)" / "Vrouwelijk (une)". He
    can't continue until he picks one, or taps "Weet ik niet". *l'école* + vrouwelijk is
    correct; *l'école* + mannelijk is wrong. This applies in Test and Exam.
  - Plural-only nouns are written with *des* (*des vacances*). Plural has no gender, so
    the article is optional there: *vacances*, *des vacances* and *les vacances* are all
    correct.
  - Everything else (verbs, adjectives, phrases such as *à la maison*) is compared as
    written, article and all.
- Any of the accepted forms is correct.
- Leading, trailing and repeated spaces, and closing punctuation (. ! ?) are ignored. This
  includes the space French puts before *!* and *?* (*Ça va ?*).
- **No typo forgiveness.** Spelling is the point of typed modes.

### Rewards

- **Points:** a running total (Practice 1, Test 3, Exam 3 per correct answer).
- **"I got this" badge per chapter:** earned when **more than 85% of that chapter's cards**
  (both directions) are known. **Once earned, it's kept forever**, even if the percentage
  drops later.
- **Record streak:** the longest run of correct typed answers in **Test mode only** without a
  mistake. It continues across rounds and days and resets on a wrong answer. The current
  streak is visible while he plays, and beating his record gets a small celebration.
- A chapter overview shows every chapter with its badge (lit or greyed out) and progress
  (*Chapter 3: 72%*).

## Calls Claude made (open to correction)

- **Tech:** Vite + React + TypeScript; unit tests (Vitest) at least for answer checking,
  card selection and progress rules; `localStorage` for progress; deployed to GitHub
  Pages. It can be added to the home screen (web app manifest and icons).
- **UI language: Dutch.** It's his mother tongue. The words being studied are of course
  in French and Dutch.
- **Round length for Practice and Test:** up to 20 different cards per round (parent's choice), drawn at
  random from the not-yet-known cards in the selection. A missed card comes back a few
  questions later. The round ends when every card in it has been answered correctly once.
- **Re-asks inside the same round earn no points and don't count toward "known"**, because
  he has just seen the answer. They do still require a correct answer to finish the round.
  The streak is not affected by re-asks (no gain, and a wrong re-ask doesn't reset it).
- **Ignored when checking:** the Dutch article, the article of French plural-only nouns,
  case (unless marked), spacing, closing punctuation. **Accents are not ignored**
  (parent's decision): *ecole* for *école*, or *è* for *é*, is wrong.
- **Ligatures:** *oe* is accepted for *œ* and *ae* for *æ* (*soeur* = *sœur*). A Belgian
  AZERTY computer keyboard has no *œ* key, so this is a keyboard limit, not a spelling
  mistake.
- **Curly apostrophes** (*aujourd’hui*, which phones often type) count the same as
  straight ones (*aujourd'hui*).
- **Placeholders in phrases** like *qn/qc* (quelqu'un/quelque chose) and *iemand/iets*:
  Claude writes them consistently when transcribing. Typing them is optional.
- **Masculine/feminine forms** written in the book as *content(e)* are transcribed the same
  way, so both *content* and *contente* are accepted.
- **"Hard" cards for Exam:** ranked by the total number of wrong typed answers; ties are
  broken at random.
- **Reset:** a settings screen has a "reset all progress" button with a confirmation step
  (for example for a new school year).
- **Mixing and directions:** directions are always mixed; there is no setting to practise
  one direction only.
- **Never both directions of an entry in one Practice/Test round**, because one would
  give away the other. In Exam this is avoided when the picked chapters have enough
  entries. If not, the two directions are placed far apart.
- **Exam scoring happens at the end.** During an exam there are no live points or
  celebration, since those would reveal right and wrong. When he finishes, the answers are
  processed in question order: points, known-status, and then any badge
  celebration. A saved, unfinished exam has no effect until it's finished. Starting a new
  exam throws the old one away.
- **Answers that belong to another entry with the same prompt are accepted.** If *woning*
  is in both a *une maison* entry and a *un logement* entry, either French word is accepted
  for NL→FR "woning". Synonyms the book doesn't list are not accepted, and there is no "I
  was right" button (it would invite cheating). Claude transcribes carefully and adds
  obvious alternatives.
- **No offline support.** A web app manifest and icons only, with no service worker, so a
  new chapter shows up as soon as it's published.
- **Chapter files (see "Chapter files"):** the sample chapter is `ch00`; a chapter that
  fails to load is skipped with a notice instead of blocking the app; a saved exam
  survives a temporarily missing chapter; a separate check-only workflow on chapter
  pushes; no fallback copy of the chapters inside the built site (it could go stale and
  mix old and new chapters).

## French article: options considered (decided 2026-11-23)

In French the article carries the gender (*le livre*, *la table*), and school tests often
mark a wrong or missing article as wrong. The options were:

1. **Optional, never checked** (how English worked). Rejected: *le maison* would be
   accepted, so gender is never tested.
2. **Optional, but must be right if typed.** Briefly chosen, then rejected: he can skip
   the article and so skip learning the gender, and *l'* nouns can't be checked.
3. **Mandatory for singular nouns, always *un/une*.** Chosen first, then replaced: *la
   maison* (right gender) was marked wrong.
4. **Mandatory for singular nouns, *un/une* or *le/la/l'* with the right gender, plus a
   required un/une choice when he types *l'* (chosen by the parent, 2026-11-23).** Gender
   is tested on every noun, and the natural *l'école* is accepted without hiding the
   gender.

## Chapter files (loaded at runtime, added 2026-11-23)

### Why

Adding a chapter should not cost a build and deploy each time. The parent chose to list
the chapter files in a separate list file instead of scanning a folder (a static site
can't list a folder anyway).

### Approaches considered

1. **Chapter files on the site, fetched at runtime.** Rejected: every chapter push still
   triggers the full build-and-deploy, so no time is saved.
2. **Built site on a publish branch, with a chapters folder next to it.** No build per
   chapter, but every code deploy must take care never to wipe that folder. Rejected as
   fragile.
3. **The app reads chapter files straight from the main branch (chosen by the parent).**
   The deploy ignores the chapters folder, so committing a chapter triggers nothing. It
   is live as soon as GitHub's raw-file cache refreshes (up to about 5 minutes).

### Files

- Folder: `public/chapters/` in the repository.
- **Chapter list:** `public/chapters/index.json`, for example
  `{ "chapters": ["ch00.json", "ch01.json", "ch02.json"] }`. The order in this list is
  the order on screen. Only listed files are loaded. A file in the folder but not in the
  list is ignored, so a chapter can be prepared before it is switched on.
- **One file per chapter**, for example `ch03.json`:
  `{ "id": "ch03", "title": "Hoofdstuk 3: À l'école", "entries": [ { "id": "ch03-001", "fr": ["une maison"], "nl": ["het huis", "de woning"] }, ... ] }`.
  An entry has `id`, `fr` (accepted French forms, the first is the main one), `nl`
  (accepted Dutch forms) and optional `frCaps` / `nlCaps` (true = capitals must match
  exactly). Placeholders go in parentheses: `s'occuper de (qn)`, `voor (iemand) zorgen`.
  Optional endings too: `content(e)`.
- **French singular nouns are always written with *un* or *une***, even when the book
  uses *le/la/l'* (`une maison`, `une école`, `un hôtel`). Claude takes the gender from
  the book (or a dictionary when the book only shows *l'*). Plural-only nouns are written
  with *des* (`des vacances`). The app treats a form starting with *un/une* as a noun
  whose article is required (*un/une* or the matching *le/la/l'*), and a form starting
  with *des* as one whose article is optional. The stored *un/une* is also what tells
  the app the gender of an *l'* noun.
- `npm run check-chapters` warns about French forms that start with *le, la, l'* or
  *les*, so a noun copied from the book without converting its article is caught before
  commit. It is a warning, not a failure, because some phrases really start that way
  (*le matin*, *la plupart*).
- Text is stored in Unicode NFC (precomposed accents), and the app compares in NFC, so
  *é* typed on any device matches.
- The chapter `id` matches the file name (`ch03.json` has `"id": "ch03"`). Entry ids look
  like `ch03-014`, and they **never change and are never reused**, so progress survives
  when a chapter is corrected or extended.

### Where the app loads them from

- **Live site:** `https://raw.githubusercontent.com/<owner>/<repo>/main/public/chapters/`.
  The deploy fills in owner and repo automatically from the GitHub repository it runs
  in, so nothing is hard-coded by hand.
- **Local development and tests:** `./chapters/` (Vite serves `public/`).
- Requests revalidate instead of using a stale browser cache, so the only delay is
  GitHub's own cache (about 5 minutes).

### Loading behaviour

- At start the app shows a short loading screen, fetches the list, then fetches every
  listed chapter in parallel.
- **Each chapter file is checked** (correct shape, id matches file name, at least one
  non-empty form per language, no entry id already used by an earlier chapter). A chapter
  that is missing or fails a check is skipped. The rest of the app works, and a small
  notice says which chapter couldn't be loaded.
- If the list itself can't be loaded, or no chapter loads at all, the app shows a message
  with a "Opnieuw proberen" (retry) button instead of an empty screen.
- **A skipped chapter never costs progress.** Progress per card, points and badges are
  kept even when their chapter isn't loaded this time. A saved exam that includes cards
  from a skipped chapter is kept but can't be resumed until all its cards load again; it
  is only thrown away when all chapters loaded fine and its cards really no longer exist.

### Deploy and checks

- The deploy workflow ignores pushes that only change `public/chapters/**`. Code changes
  still build, test and deploy as before.
- Because chapter pushes skip the build, **Claude runs a local chapter check before every
  chapter commit** (`npm run check-chapters`, the same checks as the app plus: every listed
  file exists, ids are globally unique and well-formed).
- A small separate GitHub workflow runs the same check on chapter pushes. It deploys
  nothing and doesn't delay the chapter going live; it only sends a failure email if a
  file is broken (for example after an edit on GitHub's website).

### Sample chapter

Until the photos arrive, the app uses a sample chapter `ch00.json` ("Hoofdstuk 0:
Voorbeeld") with French ↔ Dutch entries. It uses its own id range, so its progress never
mixes with the real chapter 1, and it is removed from the list once real chapters are
added.

## Left to the builder

- Screen layout and visual style, within: fun and teen-friendly, mobile-first, the word
  and answer box stay visible above the phone keyboard, and the answer can be submitted
  with Enter.
- Code structure. (The chapter file format is now fixed in "Chapter files".)
- How the celebrations look (badge earned, new record).
- How a missed card is re-queued (how many questions later).
- How the deploy is set up (GitHub Actions or a manual build). The parent needs a GitHub
  account for GitHub Pages.

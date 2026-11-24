import { useMemo } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExamScreen } from './ExamScreen.tsx'
import { buildCards } from '../cards/buildCards.ts'
import { emptyProgress } from '../progress/rules.ts'
import { STORAGE_KEY } from '../progress/storage.ts'
import { useProgress } from '../state/useProgress.ts'
import { seeded } from '../test/rng.ts'
import type { Card, Chapter, Progress } from '../types.ts'

const chapters: Chapter[] = [
  {
    id: 'ch00',
    title: 'Hoofdstuk 0',
    entries: [
      { id: 'ch00-001', fr: ['une maison'], nl: ['huis'] },
      { id: 'ch00-002', fr: ['un chat'], nl: ['kat'] },
      { id: 'ch00-003', fr: ['lundi'], nl: ['maandag'] },
    ],
  },
]
const all = buildCards(chapters) // 6 cards
const extra = buildCards([
  { id: 'ch01', title: 'Hoofdstuk 1', entries: [{ id: 'ch01-001', fr: ['une école'], nl: ['school'] }] },
])

function Harness({ chapterIds, onExit, cards = all }: { chapterIds: string[] | null; onExit: () => void; cards?: Card[] }) {
  const ids = useMemo(() => new Set(cards.map((c) => c.id)), [cards])
  const { progress, update } = useProgress(ids, true)
  return (
    <>
      <output data-testid="progress">{JSON.stringify(progress)}</output>
      <ExamScreen
        cards={cards}
        chapterTitles={{ ch00: 'Hoofdstuk 0' }}
        progress={progress}
        update={update}
        rng={seeded(1)}
        chapterIds={chapterIds}
        onExit={onExit}
      />
    </>
  )
}

function setup(chapterIds: string[] | null = ['ch00'], initial?: Progress, cards: Card[] = all) {
  localStorage.clear()
  if (initial) localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  const onExit = vi.fn()
  const view = render(<Harness chapterIds={chapterIds} onExit={onExit} cards={cards} />)
  return { onExit, view }
}

const prog = () => JSON.parse(screen.getByTestId('progress').textContent!) as Progress
const prompt = () => screen.getByTestId('prompt').textContent!
const input = () => screen.getByRole('textbox')
const correctFor = (p: string) => all.find((c) => c.prompt === p)!.answers[0].text

/** Types an answer, picks a gender when asked (any noun card: une → vrouwelijk, else mannelijk), presses Enter. */
async function typeAnswer(text: string, enter = true) {
  await userEvent.type(input(), text)
  if (screen.queryByRole('radio', { name: 'Mannelijk (un)' })) {
    await userEvent.click(screen.getByRole('radio', { name: /^une /.test(text) ? 'Vrouwelijk (une)' : 'Mannelijk (un)' }))
  }
  if (enter) await userEvent.keyboard('{Enter}')
}
const typeCorrect = (p: string = prompt(), enter = true) => typeAnswer(correctFor(p), enter)
const examWith = (n: number, answers: string[] = []): Progress => ({
  ...emptyProgress(),
  exam: { cardIds: all.slice(0, n).map((c) => c.id), answers },
})

afterEach(() => localStorage.clear())

test('Exam shows no right/wrong feedback and no points while answering', async () => {
  setup()
  expect(screen.getByText('Vraag 1 / 6')).toBeInTheDocument()
  expect(screen.getByText(/FR → NL|NL → FR/)).toBeInTheDocument()
  await typeCorrect()
  expect(screen.getByText('Vraag 2 / 6')).toBeInTheDocument()
  await typeAnswer('xxx')
  expect(screen.getByText('Vraag 3 / 6')).toBeInTheDocument()
  expect(screen.queryByText(/Goed|Jij typte|Juist|Punten|Reeks|\+3/)).not.toBeInTheDocument()
  expect(prog().points).toBe(0)
})

test('Exam saves the new exam on start, and the answer input is focused on every question', async () => {
  setup()
  expect(prog().exam!.cardIds).toHaveLength(6)
  expect(input()).toHaveFocus()
  await typeCorrect()
  expect(input()).toHaveFocus()
  expect(input()).toHaveValue('')
})

test('Exam progress is saved after each answer and can be resumed', async () => {
  const { view } = setup(null, examWith(5))
  expect(screen.getByText('Vraag 1 / 5')).toBeInTheDocument()
  await typeAnswer('a')
  await typeAnswer('b')
  expect(prog().exam!.answers).toEqual(['a', 'b'])
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).exam.answers).toEqual(['a', 'b'])
  view.unmount()
  render(<Harness chapterIds={null} onExit={() => {}} />)
  expect(screen.getByText('Vraag 3 / 5')).toBeInTheDocument()
  expect(prompt()).toBe(all[2].prompt)
})

test('Exam end: score, list of wrong answers, points +3 per correct, streak unchanged, exam cleared', async () => {
  const start: Progress = { ...examWith(4), currentStreak: 2, bestStreak: 5 }
  const { onExit } = setup(null, start)
  const typed = [correctFor(all[0].prompt), correctFor(all[1].prompt), correctFor(all[2].prompt), 'fout']
  for (const t of typed) await typeAnswer(t)
  expect(screen.getByText('75%')).toBeInTheDocument()
  expect(screen.getByText('3 / 4')).toBeInTheDocument()
  const wrong = screen.getByTestId('wrong-list')
  expect(wrong).toHaveTextContent(all[3].prompt)
  expect(wrong).toHaveTextContent('fout')
  expect(wrong).toHaveTextContent(all[3].display)
  expect(prog().points).toBe(9)
  expect(prog().currentStreak).toBe(2)
  expect(prog().bestStreak).toBe(5)
  expect(prog().exam).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Home' }))
  expect(onExit).toHaveBeenCalled()
})

test('Exam end without mistakes shows a short message instead of a list', async () => {
  setup(null, examWith(2))
  for (let i = 0; i < 2; i++) await typeCorrect()
  expect(screen.getByText('100%')).toBeInTheDocument()
  expect(screen.getByText('2 / 2')).toBeInTheDocument()
  expect(screen.queryByTestId('wrong-list')).not.toBeInTheDocument()
  expect(screen.getByText(/Geen fouten/)).toBeInTheDocument()
})

test('Exam: pressing Enter on an empty input does not advance', async () => {
  setup(null, examWith(3))
  await userEvent.type(input(), '{Enter}')
  await userEvent.type(input(), '   {Enter}')
  expect(screen.getByText('Vraag 1 / 3')).toBeInTheDocument()
  expect(prog().exam!.answers).toEqual([])
})

test('Exam: wrong answer makes a known card unknown', async () => {
  const known: Progress = {
    ...examWith(1),
    cards: { [all[0].id]: { inARow: 3, wrongTotal: 0 } },
  }
  setup(null, known)
  await userEvent.type(input(), 'fout{Enter}')
  expect(prog().cards[all[0].id].inARow).toBe(0)
  expect(prog().cards[all[0].id].wrongTotal).toBe(1)
})

test('Exam: a badge celebration appears after the result', async () => {
  const almost: Progress = {
    ...examWith(6),
    cards: Object.fromEntries(all.map((c) => [c.id, { inARow: 2, wrongTotal: 0 }])),
  }
  setup(null, almost)
  for (let i = 0; i < 6; i++) await typeCorrect()
  expect(screen.getByText('100%')).toBeInTheDocument()
  expect(screen.getByText(/Badge.*Hoofdstuk 0/)).toBeInTheDocument()
  expect(prog().badges).toEqual(['ch00'])
})

test('Exam: "Weet ik niet" moves on and the result lists the card as "(weet ik niet)"', async () => {
  setup()
  const skipped = prompt()
  await userEvent.click(screen.getByRole('button', { name: 'Weet ik niet' }))
  expect(screen.getByText('Vraag 2 / 6')).toBeInTheDocument()
  expect(prog().exam!.answers).toEqual([''])
  expect(input()).toHaveFocus()
  expect(screen.queryByText(/Juist|Je wist het niet/)).not.toBeInTheDocument()
  await typeAnswer('xxx')
  for (let i = 2; i < 6; i++) await typeCorrect()
  const list = screen.getByTestId('wrong-list')
  expect(list).toHaveTextContent(skipped)
  expect(list).toHaveTextContent('(weet ik niet)')
  expect(list).toHaveTextContent('Jij typte: xxx')
  expect(screen.getByText('4 / 6')).toBeInTheDocument()
})

test('Exam stores the un/une choice with the answer and scores it', async () => {
  const maison = all.find((c) => c.id === 'ch00-001|nl-fr')!
  const cards = [...all, ...extra]
  setup(null, { ...emptyProgress(), exam: { cardIds: ['ch01-001|nl-fr', maison.id], answers: [] } }, cards)
  expect(prompt()).toBe('school')
  await userEvent.type(input(), "l'école{Enter}")
  expect(screen.getByText('Kies eerst un of une.')).toBeInTheDocument()
  expect(screen.getByText('Vraag 1 / 2')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('radio', { name: 'Vrouwelijk (une)' }))
  await userEvent.keyboard('{Enter}')
  expect(screen.getByText('Vraag 2 / 2')).toBeInTheDocument()
  expect(prog().exam).toEqual({ cardIds: ['ch01-001|nl-fr', maison.id], answers: ["l'école"], genders: ['f'] })
  // the choice is per question: the next one starts without a choice
  expect(screen.getByRole('radio', { name: 'Vrouwelijk (une)' })).not.toBeChecked()
  await userEvent.type(input(), "l'maison")
  await userEvent.click(screen.getByRole('radio', { name: 'Vrouwelijk (une)' }))
  await userEvent.keyboard('{Enter}')
  expect(screen.getByText('1 / 2')).toBeInTheDocument()
  expect(screen.getByTestId('wrong-list')).toHaveTextContent("Jij typte: l'maison (v)")
})

test('Exam: an exam saved without genders still resumes', async () => {
  setup(null, examWith(2, ['xxx']))
  expect(screen.getByText('Vraag 2 / 2')).toBeInTheDocument()
  await typeCorrect()
  expect(screen.getByText('1 / 2')).toBeInTheDocument()
  expect(screen.getByTestId('wrong-list')).toHaveTextContent('Jij typte: xxx')
})

test('Exam: "Controleer" submits and moves to the next question; empty does nothing', async () => {
  setup()
  const controleer = screen.getByRole('button', { name: 'Controleer' })
  await userEvent.click(controleer)
  expect(screen.getByText('Vraag 1 / 6')).toBeInTheDocument()
  await typeCorrect(prompt(), false)
  await userEvent.click(screen.getByRole('button', { name: 'Controleer' }))
  expect(screen.getByText('Vraag 2 / 6')).toBeInTheDocument()
  expect(prog().exam!.answers).toHaveLength(1)
  expect(input()).toHaveFocus()
})

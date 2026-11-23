import { useMemo } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExamScreen } from './ExamScreen.tsx'
import { buildCards } from '../cards/buildCards.ts'
import { emptyProgress } from '../progress/rules.ts'
import { STORAGE_KEY } from '../progress/storage.ts'
import { useProgress } from '../state/useProgress.ts'
import { seeded } from '../test/rng.ts'
import type { Chapter, Progress } from '../types.ts'

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

function Harness({ chapterIds, onExit }: { chapterIds: string[] | null; onExit: () => void }) {
  const ids = useMemo(() => new Set(all.map((c) => c.id)), [])
  const { progress, update } = useProgress(ids, true)
  return (
    <>
      <output data-testid="progress">{JSON.stringify(progress)}</output>
      <ExamScreen
        cards={all}
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

function setup(chapterIds: string[] | null = ['ch00'], initial?: Progress) {
  localStorage.clear()
  if (initial) localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  const onExit = vi.fn()
  const view = render(<Harness chapterIds={chapterIds} onExit={onExit} />)
  return { onExit, view }
}

const prog = () => JSON.parse(screen.getByTestId('progress').textContent!) as Progress
const prompt = () => screen.getByTestId('prompt').textContent!
const input = () => screen.getByRole('textbox')
const correctFor = (p: string) => all.find((c) => c.prompt === p)!.answers[0].text
const examWith = (n: number, answers: string[] = []): Progress => ({
  ...emptyProgress(),
  exam: { cardIds: all.slice(0, n).map((c) => c.id), answers },
})

afterEach(() => localStorage.clear())

test('Exam shows no right/wrong feedback and no points while answering', async () => {
  setup()
  expect(screen.getByText('Vraag 1 / 6')).toBeInTheDocument()
  expect(screen.getByText(/FR → NL|NL → FR/)).toBeInTheDocument()
  await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
  expect(screen.getByText('Vraag 2 / 6')).toBeInTheDocument()
  await userEvent.type(input(), 'xxx{Enter}')
  expect(screen.getByText('Vraag 3 / 6')).toBeInTheDocument()
  expect(screen.queryByText(/Goed|Jij typte|Juist|Punten|Reeks|\+3/)).not.toBeInTheDocument()
  expect(prog().points).toBe(0)
})

test('Exam saves the new exam on start, and the answer input is focused on every question', async () => {
  setup()
  expect(prog().exam!.cardIds).toHaveLength(6)
  expect(input()).toHaveFocus()
  await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
  expect(input()).toHaveFocus()
  expect(input()).toHaveValue('')
})

test('Exam progress is saved after each answer and can be resumed', async () => {
  const { view } = setup(null, examWith(5))
  expect(screen.getByText('Vraag 1 / 5')).toBeInTheDocument()
  await userEvent.type(input(), 'a{Enter}')
  await userEvent.type(input(), 'b{Enter}')
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
  for (const t of typed) await userEvent.type(input(), t + '{Enter}')
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
  for (let i = 0; i < 2; i++) await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
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
  for (let i = 0; i < 6; i++) await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
  expect(screen.getByText('100%')).toBeInTheDocument()
  expect(screen.getByText(/Badge.*Hoofdstuk 0/)).toBeInTheDocument()
  expect(prog().badges).toEqual(['ch00'])
})

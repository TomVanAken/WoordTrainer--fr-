import { useMemo } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestScreen } from './TestScreen.tsx'
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
const all = buildCards(chapters)

function Harness({ cards, onExit }: { cards: Card[]; onExit: (x?: boolean) => void }) {
  const ids = useMemo(() => new Set(all.map((c) => c.id)), [])
  const { progress, update } = useProgress(ids, true)
  return (
    <>
      <output data-testid="progress">{JSON.stringify(progress)}</output>
      <TestScreen
        cards={cards}
        allCards={all}
        chapterTitles={{ ch00: 'Hoofdstuk 0' }}
        progress={progress}
        update={update}
        rng={seeded(1)}
        onExit={onExit}
      />
    </>
  )
}

function setup(cards: Card[] = all, initial?: Progress) {
  localStorage.clear()
  if (initial) localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  const onExit = vi.fn()
  render(<Harness cards={cards} onExit={onExit} />)
  return { onExit }
}

const prog = () => JSON.parse(screen.getByTestId('progress').textContent!) as Progress
const prompt = () => screen.getByTestId('prompt').textContent!
const input = () => screen.getByRole('textbox')
const correctFor = (p: string) => all.find((c) => c.prompt === p)!.answers[0].text

afterEach(() => localStorage.clear())

test('Test: correct answer shows "Goed! +3", adds 3 points and raises the streak', async () => {
  setup()
  await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
  expect(screen.getByText('Goed! +3')).toBeInTheDocument()
  expect(prog().points).toBe(3)
  expect(prog().currentStreak).toBe(1)
  expect(screen.getByTestId('streak')).toHaveTextContent('1')
  expect(screen.getByTestId('round-points')).toHaveTextContent('3')
})

test('Test: "la maison" for "une maison" is wrong and shows "Juist: une maison"', async () => {
  setup(all.filter((c) => c.display === 'une maison'))
  expect(prompt()).toBe('huis')
  await userEvent.type(input(), 'la maison{Enter}')
  expect(screen.getByText(/Jij typte:/)).toHaveTextContent('Jij typte: la maison')
  expect(screen.getByText(/Juist:/)).toHaveTextContent('Juist: une maison')
  expect(prog().points).toBe(0)
})

test('Test: wrong answer resets the streak, card comes back as a retry without points', async () => {
  setup()
  await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
  await userEvent.keyboard('{Enter}')
  expect(prog().currentStreak).toBe(1)
  const missed = prompt()
  await userEvent.type(input(), 'xxx{Enter}')
  expect(prog().currentStreak).toBe(0)
  expect(prog().points).toBe(3)
  await userEvent.click(screen.getByRole('button', { name: 'Volgende' }))
  // queue was [missed, other]: the missed card returns after the one remaining card
  await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
  await userEvent.keyboard('{Enter}')
  expect(prompt()).toBe(missed)
  const before = prog()
  await userEvent.type(input(), correctFor(missed) + '{Enter}')
  expect(screen.getByText('Goed!')).toBeInTheDocument()
  expect(prog().points).toBe(before.points)
  expect(prog().cards).toEqual(before.cards)
  expect(prog().currentStreak).toBe(before.currentStreak)
})

test('Test: pressing Enter on an empty input does nothing', async () => {
  setup()
  const first = prompt()
  await userEvent.type(input(), '{Enter}')
  await userEvent.type(input(), '   {Enter}')
  expect(prompt()).toBe(first)
  expect(screen.getByTestId('streak')).toHaveTextContent('0')
  expect(screen.queryByRole('button', { name: 'Volgende' })).not.toBeInTheDocument()
  expect(screen.queryByText(/Goed!|Jij typte/)).not.toBeInTheDocument()
  expect(prog().cards).toEqual({})
})

test('Test: the round summary appears after every card has been answered correctly', async () => {
  const { onExit } = setup()
  for (let i = 0; i < 3; i++) {
    await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
    await userEvent.keyboard('{Enter}')
  }
  expect(screen.getByText(/3 van de 3/)).toBeInTheDocument()
  expect(screen.getByText(/9 punten/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Home' }))
  expect(onExit).toHaveBeenCalledWith()
})

test('Test: all cards known shows the "Probeer een Examen" message', async () => {
  const known: Progress = {
    ...emptyProgress(),
    cards: Object.fromEntries(all.map((c) => [c.id, { inARow: 3, wrongTotal: 0 }])),
  }
  const { onExit } = setup(all, known)
  expect(screen.getByText('Je kent alle woorden van deze hoofdstukken al! Probeer een Examen.')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Examen' }))
  expect(onExit).toHaveBeenCalledWith(true)
})

test('Test: beating the best streak shows the record celebration once', async () => {
  setup()
  await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
  expect(screen.getAllByText(/Nieuw record/)).toHaveLength(1)
  await userEvent.keyboard('{Enter}')
  await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
  // the second correct answer beats the record again, but it is celebrated only once
  expect(screen.getAllByText(/Nieuw record/)).toHaveLength(1)
  await userEvent.click(screen.getByRole('button', { name: 'Sluiten' }))
  expect(screen.queryByText(/Nieuw record/)).not.toBeInTheDocument()
})

test('Test: a badge celebration names the chapter', async () => {
  const target = all.find((c) => c.display === 'une maison')!
  const almost: Progress = {
    ...emptyProgress(),
    cards: Object.fromEntries(all.map((c) => [c.id, { inARow: c.id === target.id ? 2 : 3, wrongTotal: 0 }])),
  }
  setup([target], almost)
  await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
  // celebrations are shown one at a time: the record first, then the badge
  expect(screen.getByText(/Nieuw record/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Sluiten' }))
  expect(screen.getByText(/Badge.*Hoofdstuk 0/)).toBeInTheDocument()
  expect(prog().badges).toEqual(['ch00'])
})

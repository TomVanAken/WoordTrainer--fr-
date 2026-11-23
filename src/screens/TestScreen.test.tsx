import { useMemo } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
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

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

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

test('Test: beating an existing record shows the record celebration once, then it closes itself', () => {
  // fake timers make the 1.5 s auto-dismiss deterministic; fireEvent is synchronous, so no
  // user-event delays depend on the faked clock
  vi.useFakeTimers()
  setup(all, { ...emptyProgress(), bestStreak: 1 })
  const answer = (text: string) => {
    fireEvent.change(input(), { target: { value: text } })
    fireEvent.keyDown(input(), { key: 'Enter' })
  }
  const enter = () => fireEvent.keyDown(input(), { key: 'Enter' })
  answer(correctFor(prompt()))
  // a streak of 1 only equals the record
  expect(screen.queryByText(/Nieuw record/)).not.toBeInTheDocument()
  enter()
  answer(correctFor(prompt()))
  expect(screen.getAllByText(/Nieuw record/)).toHaveLength(1)
  expect(screen.getByText(/Nieuw record/)).toHaveTextContent('Nieuw record! Reeks van 2')
  act(() => {
    vi.advanceTimersByTime(1000)
  })
  enter()
  answer(correctFor(prompt()))
  // the third correct answer beats the record again, but it is celebrated only once
  expect(screen.getAllByText(/Nieuw record/)).toHaveLength(1)
  act(() => {
    vi.advanceTimersByTime(500)
  })
  expect(screen.queryByText(/Nieuw record/)).not.toBeInTheDocument()
})

test('Test: the very first correct answer ever is not celebrated as a record', async () => {
  setup()
  await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
  expect(screen.getByText('Goed! +3')).toBeInTheDocument()
  expect(screen.queryByText(/Nieuw record/)).not.toBeInTheDocument()
})

test('Test: the record celebration can be closed with its button', async () => {
  setup(all, { ...emptyProgress(), bestStreak: 1, currentStreak: 1 })
  await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
  expect(screen.getByText(/Nieuw record/)).toBeInTheDocument()
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
  // no record (best streak was 0 at the start), so the badge shows right away
  expect(screen.queryByText(/Nieuw record/)).not.toBeInTheDocument()
  expect(screen.getByText(/Badge.*Hoofdstuk 0/)).toBeInTheDocument()
  expect(prog().badges).toEqual(['ch00'])
})

test('Test: the answer input keeps focus during feedback (the phone keyboard stays open)', async () => {
  setup()
  await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
  expect(screen.getByText('Goed! +3')).toBeInTheDocument()
  expect(input()).toHaveFocus()
  expect(input()).not.toBeDisabled()
  expect(input()).toHaveAttribute('readonly')
  expect(screen.getByRole('button', { name: 'Volgende' })).not.toHaveFocus()
})

test('Test: Enter in the input during feedback goes to the next question', async () => {
  setup()
  const first = prompt()
  await userEvent.type(input(), correctFor(first) + '{Enter}')
  await userEvent.keyboard('{Enter}')
  expect(prompt()).not.toBe(first)
  expect(screen.queryByText(/Goed!/)).not.toBeInTheDocument()
  expect(input()).toHaveFocus()
  expect(input()).not.toHaveAttribute('readonly')
  expect(input()).toHaveValue('')
})

test('Test: tapping Volgende does not take focus away from the input', async () => {
  setup()
  const first = prompt()
  await userEvent.type(input(), correctFor(first) + '{Enter}')
  const volgende = screen.getByRole('button', { name: 'Volgende' })
  expect(fireEvent.mouseDown(volgende)).toBe(false) // default prevented
  expect(fireEvent.pointerDown(volgende)).toBe(false)
  await userEvent.click(volgende)
  expect(prompt()).not.toBe(first)
  expect(input()).toHaveFocus()
})

test('Test: submit then an immediate second Enter advances exactly once and records one answer', async () => {
  setup()
  const first = prompt()
  await userEvent.type(input(), correctFor(first) + '{Enter}{Enter}')
  const second = prompt()
  expect(second).not.toBe(first)
  expect(screen.queryByText(/Goed!/)).not.toBeInTheDocument()
  expect(Object.keys(prog().cards)).toHaveLength(1)
  expect(prog().points).toBe(3)
  // and the new question is waiting, not skipped
  await userEvent.keyboard('{Enter}')
  expect(prompt()).toBe(second)
})

test('Test: "Weet ik niet" counts as a wrong answer and the card comes back as a retry', async () => {
  setup(all, { ...emptyProgress(), points: 5, currentStreak: 2, bestStreak: 2 })
  const missed = prompt()
  const missedCard = all.find((c) => c.prompt === missed)!
  await userEvent.click(screen.getByRole('button', { name: 'Weet ik niet' }))
  expect(screen.getByText('Je wist het niet.')).toBeInTheDocument()
  expect(screen.getByText(/Juist:/)).toHaveTextContent(`Juist: ${missedCard.display}`)
  expect(screen.queryByText(/Jij typte/)).not.toBeInTheDocument()
  // not offered during feedback; the input keeps the focus
  expect(screen.queryByRole('button', { name: 'Weet ik niet' })).not.toBeInTheDocument()
  expect(input()).toHaveFocus()
  expect(prog().currentStreak).toBe(0)
  expect(prog().points).toBe(5)
  expect(prog().cards[missedCard.id]).toEqual({ inARow: 0, wrongTotal: 1 })
  expect(screen.getByTestId('round-points')).toHaveTextContent('0')
  await userEvent.keyboard('{Enter}')
  expect(screen.getByRole('button', { name: 'Weet ik niet' })).toBeInTheDocument()
  for (let i = 0; i < 3 && prompt() !== missed; i++) {
    await userEvent.type(input(), correctFor(prompt()) + '{Enter}')
    await userEvent.keyboard('{Enter}')
  }
  expect(prompt()).toBe(missed)
  // a "Weet ik niet" on the retry only puts the card back in the round
  const before = prog()
  await userEvent.click(screen.getByRole('button', { name: 'Weet ik niet' }))
  expect(screen.getByText('Je wist het niet.')).toBeInTheDocument()
  expect(prog()).toEqual(before)
  await userEvent.keyboard('{Enter}')
  expect(prompt()).toBe(missed) // last card left, so it is asked again right away
  await userEvent.type(input(), correctFor(missed) + '{Enter}')
  await userEvent.keyboard('{Enter}')
  expect(screen.getByText(/2 van de 3/)).toBeInTheDocument()
})

test('Test: "Weet ik niet" does not take the focus and clears a half-typed answer', async () => {
  setup()
  await userEvent.type(input(), 'mai')
  const btn = screen.getByRole('button', { name: 'Weet ik niet' })
  expect(fireEvent.mouseDown(btn)).toBe(false)
  await userEvent.click(btn)
  expect(input()).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  expect(input()).toHaveValue('')
})

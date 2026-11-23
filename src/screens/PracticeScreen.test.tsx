import { useMemo } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PracticeScreen } from './PracticeScreen.tsx'
import { buildCards } from '../cards/buildCards.ts'
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
const all = buildCards(chapters)

function Harness() {
  const ids = useMemo(() => new Set(all.map((c) => c.id)), [])
  const { progress, update } = useProgress(ids, true)
  return (
    <>
      <output data-testid="progress">{JSON.stringify(progress)}</output>
      <PracticeScreen
        cards={all}
        allCards={all}
        chapterTitles={{ ch00: 'Hoofdstuk 0' }}
        progress={progress}
        update={update}
        rng={seeded(1)}
        onExit={vi.fn()}
      />
    </>
  )
}

const prog = () => JSON.parse(screen.getByTestId('progress').textContent!) as Progress
const prompt = () => screen.getByTestId('prompt').textContent!

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

test('Practice: "Ik wist het" on first try adds 1 point and never changes known status', async () => {
  render(<Harness />)
  expect(screen.getByText(/^(FR → NL|NL → FR)$/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Ik wist het' })).not.toBeInTheDocument()
  const card = all.find((c) => c.prompt === prompt())!
  await userEvent.click(screen.getByRole('button', { name: 'Toon antwoord' }))
  expect(screen.getByText(card.display)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Ik wist het' }))
  expect(prog().points).toBe(1)
  expect(prog().cards).toEqual({})
  expect(prompt()).not.toBe(card.prompt)
})

test('Practice: "Wist ik niet" brings the card back later', async () => {
  render(<Harness />)
  const missed = prompt()
  await userEvent.click(screen.getByRole('button', { name: 'Toon antwoord' }))
  await userEvent.click(screen.getByRole('button', { name: 'Wist ik niet' }))
  expect(prog().points).toBe(0)
  expect(prompt()).not.toBe(missed)
  await userEvent.click(screen.getByRole('button', { name: 'Toon antwoord' }))
  await userEvent.click(screen.getByRole('button', { name: 'Ik wist het' }))
  expect(prompt()).not.toBe(missed)
  await userEvent.click(screen.getByRole('button', { name: 'Toon antwoord' }))
  await userEvent.click(screen.getByRole('button', { name: 'Ik wist het' }))
  expect(prompt()).toBe(missed)
  // a retry earns no points
  await userEvent.click(screen.getByRole('button', { name: 'Toon antwoord' }))
  await userEvent.click(screen.getByRole('button', { name: 'Ik wist het' }))
  expect(prog().points).toBe(2)
  expect(screen.getByText(/2 van de 3/)).toBeInTheDocument()
})

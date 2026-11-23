import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Home } from './Home.tsx'
import { buildCards } from '../cards/buildCards.ts'
import { emptyProgress } from '../progress/rules.ts'
import type { Chapter, Progress } from '../types.ts'

const chapters: Chapter[] = [
  { id: 'ch00', title: 'Hoofdstuk 0', entries: [{ id: 'ch00-001', fr: ['lundi'], nl: ['maandag'] }] },
]
const cards = buildCards(chapters)

function setup(progress: Progress) {
  const handlers = { onStart: vi.fn(), onResumeExam: vi.fn(), onSettings: vi.fn() }
  render(<Home progress={progress} chapters={chapters} cards={cards} {...handlers} />)
  return handlers
}

test('Home shows points, best streak and chapter percentage with badge state', () => {
  setup({ ...emptyProgress(), points: 42, bestStreak: 7, badges: ['ch00'] })
  expect(screen.getByText('42')).toBeInTheDocument()
  expect(screen.getByText('7')).toBeInTheDocument()
  expect(screen.getByText('Hoofdstuk 0')).toBeInTheDocument()
  expect(screen.getByText('0%')).toBeInTheDocument()
  const badge = screen.getByRole('img', { name: /I got this/ })
  expect(badge).toHaveAttribute('data-earned', 'true')
})

test('Home greys out the badge when not earned', () => {
  setup(emptyProgress())
  expect(screen.getByRole('img', { name: /I got this/ })).toHaveAttribute('data-earned', 'false')
})

test('Home shows "Examen hervatten" only when an exam is saved', async () => {
  const { unmount } = render(
    <Home progress={emptyProgress()} chapters={chapters} cards={cards} onStart={vi.fn()} onResumeExam={vi.fn()} onSettings={vi.fn()} />,
  )
  expect(screen.queryByRole('button', { name: 'Examen hervatten' })).not.toBeInTheDocument()
  unmount()

  const handlers = setup({ ...emptyProgress(), exam: { cardIds: [cards[0].id], answers: [] } })
  const btn = screen.getByRole('button', { name: 'Examen hervatten' })
  expect(btn).toBeEnabled()
  await userEvent.click(btn)
  expect(handlers.onResumeExam).toHaveBeenCalled()
})

test('Home disables "Examen hervatten" when the saved exam has cards that are not loaded', () => {
  setup({ ...emptyProgress(), exam: { cardIds: ['ch99-001|fr-nl'], answers: [] } })
  expect(screen.getByRole('button', { name: 'Examen hervatten' })).toBeDisabled()
  expect(screen.getByText('Kan pas verder als alle hoofdstukken geladen zijn.')).toBeInTheDocument()
})

test('Home mode buttons start the right mode', async () => {
  const handlers = setup(emptyProgress())
  await userEvent.click(screen.getByRole('button', { name: /Toets/ }))
  expect(handlers.onStart).toHaveBeenCalledWith('test')
})

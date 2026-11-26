import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChapterPicker } from './ChapterPicker.tsx'
import type { Chapter } from '../types.ts'

const chapters: Chapter[] = [
  { id: 'ch00', title: 'Hoofdstuk 0', entries: [] },
  { id: 'ch01', title: 'Hoofdstuk 1', entries: [] },
]

test('ChapterPicker: exam preselects all, test preselects none and start is disabled', () => {
  const { unmount } = render(<ChapterPicker chapters={chapters} mode="exam" onConfirm={vi.fn()} onBack={vi.fn()} />)
  screen.getAllByRole('checkbox').forEach((c) => expect(c).toBeChecked())
  expect(screen.getByRole('button', { name: 'Starten' })).toBeEnabled()
  unmount()

  render(<ChapterPicker chapters={chapters} mode="test" onConfirm={vi.fn()} onBack={vi.fn()} />)
  screen.getAllByRole('checkbox').forEach((c) => expect(c).not.toBeChecked())
  expect(screen.getByRole('button', { name: 'Starten' })).toBeDisabled()
})

test('ChapterPicker confirms the selected chapters; Alles and Niets work', async () => {
  const onConfirm = vi.fn()
  render(<ChapterPicker chapters={chapters} mode="practice" onConfirm={onConfirm} onBack={vi.fn()} />)
  await userEvent.click(screen.getByRole('checkbox', { name: 'Hoofdstuk 1' }))
  await userEvent.click(screen.getByRole('button', { name: 'Starten' }))
  expect(onConfirm).toHaveBeenLastCalledWith(['ch01'], ['fr-nl', 'nl-fr'])

  await userEvent.click(screen.getByRole('button', { name: 'Alles' }))
  await userEvent.click(screen.getByRole('button', { name: 'Starten' }))
  expect(onConfirm).toHaveBeenLastCalledWith(['ch00', 'ch01'], ['fr-nl', 'nl-fr'])

  await userEvent.click(screen.getByRole('button', { name: 'Niets' }))
  expect(screen.getByRole('button', { name: 'Starten' })).toBeDisabled()
})

test('ChapterPicker back button', async () => {
  const onBack = vi.fn()
  render(<ChapterPicker chapters={chapters} mode="test" onConfirm={vi.fn()} onBack={onBack} />)
  await userEvent.click(screen.getByRole('button', { name: /Terug/ }))
  expect(onBack).toHaveBeenCalled()
})

test('exam mode with a saved exam labels the start button as replacing it', () => {
  render(<ChapterPicker chapters={chapters} mode="exam" hasSavedExam onConfirm={() => {}} onBack={() => {}} />)
  expect(screen.getByRole('button', { name: 'Nieuw examen (het vorige vervalt)' })).toBeInTheDocument()
})

test('direction choice is offered for practice and test, defaults to both, and is passed on', async () => {
  const onConfirm = vi.fn()
  render(<ChapterPicker chapters={chapters} mode="test" onConfirm={onConfirm} onBack={vi.fn()} />)
  expect(screen.getByRole('radio', { name: 'Beide richtingen' })).toBeChecked()
  await userEvent.click(screen.getByRole('radio', { name: 'NL → FR' }))
  await userEvent.click(screen.getByRole('button', { name: 'Alles' }))
  await userEvent.click(screen.getByRole('button', { name: 'Starten' }))
  expect(onConfirm).toHaveBeenLastCalledWith(['ch00', 'ch01'], ['nl-fr'])
})

test('exam has no direction choice and always uses both', async () => {
  const onConfirm = vi.fn()
  render(<ChapterPicker chapters={chapters} mode="exam" onConfirm={onConfirm} onBack={vi.fn()} />)
  expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Starten' }))
  expect(onConfirm).toHaveBeenLastCalledWith(['ch00', 'ch01'], ['fr-nl', 'nl-fr'])
})

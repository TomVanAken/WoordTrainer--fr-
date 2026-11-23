import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChapterGate } from './ChapterGate.tsx'
import type { LoadResult } from '../data/loadChapters.ts'

const ch = { id: 'ch01', title: 'Een', entries: [{ id: 'ch01-001', fr: ['a'], nl: ['b'] }] }
const view = (chapters: { id: string }[]) => <p>{chapters.length} hoofdstuk</p>

test('shows the loading text, then the children', async () => {
  const load = vi.fn(async (): Promise<LoadResult> => ({ status: 'ok', chapters: [ch], failed: [] }))
  render(<ChapterGate load={load}>{view}</ChapterGate>)
  expect(screen.getByText('Woorden laden…')).toBeInTheDocument()
  expect(await screen.findByText('1 hoofdstuk')).toBeInTheDocument()
  expect(screen.queryByText('Woorden laden…')).not.toBeInTheDocument()
})

test('error shows "Opnieuw proberen", which loads again', async () => {
  const load = vi
    .fn<() => Promise<LoadResult>>()
    .mockResolvedValueOnce({ status: 'error' })
    .mockResolvedValueOnce({ status: 'ok', chapters: [ch], failed: [] })
  render(<ChapterGate load={load}>{view}</ChapterGate>)
  expect(await screen.findByText('De woorden konden niet geladen worden.')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Opnieuw proberen' }))
  expect(await screen.findByText('1 hoofdstuk')).toBeInTheDocument()
  expect(load).toHaveBeenCalledTimes(2)
})

test('a failed chapter shows a notice naming the file', async () => {
  const load = async (): Promise<LoadResult> => ({ status: 'ok', chapters: [ch], failed: ['ch03.json'] })
  render(<ChapterGate load={load}>{view}</ChapterGate>)
  const name = await screen.findByText('ch03.json')
  expect(name.closest('[role="status"]')).toHaveTextContent('ch03.json kon niet geladen worden.')
  await userEvent.click(screen.getByRole('button', { name: 'Sluiten' }))
  expect(screen.queryByText('ch03.json')).not.toBeInTheDocument()
  expect(screen.getByText('1 hoofdstuk')).toBeInTheDocument()
})

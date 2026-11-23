import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { STORAGE_KEY } from './progress/storage.ts'

const chapter = {
  id: 'ch00',
  title: 'Hoofdstuk 0',
  entries: [{ id: 'ch00-001', fr: ['lundi'], nl: ['maandag'] }],
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url)
      if (u.endsWith('index.json')) return new Response(JSON.stringify({ chapters: ['ch00.json'] }))
      if (u.endsWith('ch00.json')) return new Response(JSON.stringify(chapter))
      return new Response('', { status: 404 })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

test('App loads chapters and shows the home screen', async () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /woordtrainer/i })).toBeInTheDocument()
  expect(screen.getByText('Woorden laden…')).toBeInTheDocument()
  expect(await screen.findByText('Hoofdstuk 0')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Oefenen/ })).toBeInTheDocument()
})

test('App navigates to the picker and back, and resets progress from settings', async () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, points: 42, currentStreak: 0, bestStreak: 0, badges: [], cards: {}, exam: null }),
  )
  render(<App />)
  expect(await screen.findByText('42')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /Toets/ }))
  expect(screen.getByRole('button', { name: 'Starten' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: /Terug/ }))

  await userEvent.click(screen.getByRole('button', { name: /Instellingen/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Alles resetten' }))
  await userEvent.click(screen.getByRole('button', { name: 'Ja' }))
  expect(await screen.findByRole('button', { name: /Oefenen/ })).toBeInTheDocument()
  expect(screen.queryByText('42')).not.toBeInTheDocument()
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from './Settings.tsx'

test('Settings resets only after confirmation', async () => {
  const onReset = vi.fn()
  render(<Settings onReset={onReset} onBack={vi.fn()} />)

  await userEvent.click(screen.getByRole('button', { name: 'Alles resetten' }))
  expect(onReset).not.toHaveBeenCalled()
  expect(screen.getByText(/Weet je het zeker\?/)).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Nee' }))
  expect(onReset).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Alles resetten' })).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Alles resetten' }))
  await userEvent.click(screen.getByRole('button', { name: 'Ja' }))
  expect(onReset).toHaveBeenCalledTimes(1)
})

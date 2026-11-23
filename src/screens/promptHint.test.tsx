import { render, screen } from '@testing-library/react'
import { buildCards } from '../cards/buildCards.ts'
import { ExamResultView } from './ExamResultView.tsx'
import { PromptText } from './roundCommon.tsx'

const cards = buildCards([
  {
    id: 'ch01',
    title: 'Trajet 01',
    entries: [
      { id: 'ch01-001', fr: ['Il fait chaud.'], nl: ['Het is warm.'], hint: 'over het weer' },
      { id: 'ch01-002', fr: ['une maison'], nl: ['het huis'] },
    ],
  },
])
const byId = (id: string) => cards.find((c) => c.id === id)!

test('PromptText shows the hint under the prompt, in both directions', () => {
  for (const id of ['ch01-001|fr-nl', 'ch01-001|nl-fr']) {
    const view = render(<PromptText card={byId(id)} />)
    expect(screen.getByTestId('prompt')).toHaveTextContent(byId(id).prompt)
    expect(screen.getByTestId('prompt')).not.toHaveTextContent('over het weer')
    expect(screen.getByTestId('prompt-hint')).toHaveTextContent('over het weer')
    view.unmount()
  }
})

test('PromptText shows no hint element for an entry without a hint', () => {
  render(<PromptText card={byId('ch01-002|nl-fr')} />)
  expect(screen.getByTestId('prompt')).toHaveTextContent('het huis')
  expect(screen.queryByTestId('prompt-hint')).not.toBeInTheDocument()
})

test('the exam results list shows the hint next to a wrong answer', () => {
  const card = byId('ch01-001|nl-fr')
  render(
    <ExamResultView
      result={{ correct: 0, total: 1, percent: 0, results: [{ cardId: card.id, typed: "C'est chaud", correct: false }] }}
      cardsById={new Map(cards.map((c) => [c.id, c]))}
      onHome={() => {}}
    />,
  )
  expect(screen.getByTestId('wrong-list')).toHaveTextContent('Het is warm.')
  expect(screen.getByTestId('wrong-list')).toHaveTextContent('(over het weer)')
})

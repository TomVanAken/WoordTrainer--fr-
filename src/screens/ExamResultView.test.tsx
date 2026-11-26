import { render, screen } from '@testing-library/react'
import { ExamResultView } from './ExamResultView.tsx'
import { buildCards } from '../cards/buildCards.ts'
import type { ExamResult } from '../session/exam.ts'

const cards = buildCards([
  { id: 'ch00', title: 'H0', entries: [{ id: 'ch00-001', fr: ['une maison'], nl: ['huis'] }, { id: 'ch00-003', fr: ['lundi'], nl: ['maandag'] }] },
])
const byId = new Map(cards.map((c) => [c.id, c]))
const maison = 'ch00-001|nl-fr'
const lundi = 'ch00-003|nl-fr'

test('Exam result: a spelling slip is labelled "Bijna goed" with marked letters; a far answer is not', () => {
  const result: ExamResult = {
    correct: 0,
    total: 2,
    percent: 0,
    results: [
      { cardId: maison, typed: 'une maisen', gender: 'f', correct: false, almost: 'une maison' },
      { cardId: lundi, typed: 'xxx', correct: false },
    ],
  }
  render(<ExamResultView result={result} cardsById={byId} onHome={() => {}} />)
  const items = screen.getByTestId('wrong-list').querySelectorAll('li')
  expect(items[0]).toHaveTextContent('Bijna goed')
  expect(items[0].querySelectorAll('mark.spell-diff').length).toBe(2)
  expect(items[0]).toHaveTextContent('Juist: maison (f)')
  expect(items[1]).not.toHaveTextContent('Bijna goed')
  expect(items[1].querySelector('mark')).toBeNull()
})

import { answerRound, createRound, currentItem } from './round'

const ids = ['a', 'b', 'c', 'd', 'e']
const order = (s: ReturnType<typeof createRound>) =>
  s.queue.map((q) => q.cardId + (q.retry ? '*' : '')).join(',')

test('a wrong answer comes back 3 positions later as a retry', () => {
  const s = answerRound(createRound(ids), false)
  expect(order(s)).toBe('b,c,a*,d,e')
  expect(s.total).toBe(5)
  expect(s.firstTryCorrect).toBe(0)
})

test('a wrong answer near the end goes to the end', () => {
  expect(order(answerRound(createRound(['a', 'b', 'c']), false))).toBe('b,c,a*')
  expect(order(answerRound(createRound(['a']), false))).toBe('a*')
})

test('a retry answered correctly does not count as first-try correct', () => {
  let s = createRound(['a', 'b'])
  s = answerRound(s, false)
  s = answerRound(s, true)
  expect(s.firstTryCorrect).toBe(1)
  expect(currentItem(s)).toEqual({ cardId: 'a', retry: true })
  s = answerRound(s, true)
  expect(s.firstTryCorrect).toBe(1)
})

test('the round ends when every card has been answered correctly once', () => {
  let s = answerRound(createRound(ids), false)
  let guard = 0
  while (currentItem(s) && guard++ < 50) s = answerRound(s, true)
  expect(currentItem(s)).toBeNull()
  expect(s.queue).toEqual([])
  expect(s.firstTryCorrect).toBe(4)
})

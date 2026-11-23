import { useEffect, useMemo, useRef, useState } from 'react'
import { AnswerInput } from '../components/AnswerInput.tsx'
import { cardsForChapters } from '../cards/buildCards.ts'
import { asksGender } from '../cards/checkAnswer.ts'
import type { Gender } from '../types.ts'
import { pickExamCards } from '../session/select.ts'
import { answerExam, applyExam, createExam, examFinished, scoreExam, type ExamResult } from '../session/exam.ts'
import { ExamResultView } from './ExamResultView.tsx'
import { directionLabel, useCelebrations, type ScreenProps } from './roundCommon.tsx'

type Props = Pick<ScreenProps, 'cards' | 'chapterTitles' | 'progress' | 'update' | 'rng'> & {
  /** null = resume the saved exam */
  chapterIds: string[] | null
  onExit: () => void
}

export function ExamScreen({ cards, chapterTitles = {}, progress, update, rng, chapterIds, onExit }: Props) {
  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const [ready, setReady] = useState(chapterIds === null)
  const [result, setResult] = useState<ExamResult | null>(null)
  const started = useRef(false)
  const celebrations = useCelebrations()
  const { add } = celebrations

  // A new exam replaces any saved one (update saves it). Guarded so it only happens once.
  useEffect(() => {
    if (chapterIds === null || started.current) return
    started.current = true
    const picked = pickExamCards(cardsForChapters(cards, chapterIds), progress, rng).map((c) => c.id)
    update((p) => ({ ...p, exam: createExam(picked) }))
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exam = progress.exam
  const finishing = useRef(false)
  const finish = (finished: NonNullable<typeof exam>) => {
    if (finishing.current) return
    finishing.current = true
    const scored = scoreExam(finished, cardsById)
    let newBadges: string[] = []
    update((p) => {
      const applied = applyExam(p, scored, cards)
      newBadges = applied.newBadges
      return applied.progress
    })
    setResult(scored)
    add(newBadges.map((id) => ({ kind: 'badge' as const, label: `Badge verdiend: ${chapterTitles[id] ?? id}!` })))
  }

  // A saved exam that was already complete (e.g. a closed tab right at the end).
  useEffect(() => {
    if (ready && exam && examFinished(exam) && !result) finish(exam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, exam, result])

  if (result) {
    return (
      <>
        {celebrations.node}
        <ExamResultView result={result} cardsById={cardsById} onHome={onExit} />
      </>
    )
  }
  if (!ready) return null
  if (!exam) {
    return (
      <main className="screen">
        <p>Er is geen examen om te hervatten.</p>
        <button type="button" className="btn" onClick={onExit}>
          Home
        </button>
      </main>
    )
  }
  if (examFinished(exam)) return null

  const index = exam.answers.length
  const card = cardsById.get(exam.cardIds[index])!

  const submit = (typed: string, gender: Gender | null = null) => {
    update((p) => ({ ...p, exam: answerExam(p.exam!, typed, gender) }))
    const next = answerExam(exam, typed, gender)
    if (examFinished(next)) finish(next)
  }

  return (
    <main className="screen">
      <div className="statbar">
        <span>
          Vraag {index + 1} / {exam.cardIds.length}
        </span>
      </div>
      <div className="prompt-card">
        <span className="direction">{directionLabel(card)}</span>
        <p className="prompt" data-testid="prompt">
          {card.prompt}
        </p>
      </div>
      {/* "Weet ik niet" is saved as an empty answer, which scoreExam counts as wrong. */}
      <AnswerInput
        onSubmit={(typed, gender) => submit(typed, gender ?? null)}
        askGender={(typed) => asksGender(card, typed)}
        onDontKnow={() => submit('')}
        questionKey={index}
      />
      <button type="button" className="btn btn-link" onClick={onExit}>
        Stoppen (je kunt later verder)
      </button>
    </main>
  )
}

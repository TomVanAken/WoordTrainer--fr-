import { useEffect, useRef, useState } from 'react'
import { keepInputFocus } from './keepInputFocus.ts'

type Props = {
  onSubmit: (text: string) => void
  /**
   * Feedback state: the input stays focused (so a phone keeps its keyboard open) but can't be
   * edited, and Enter calls onContinue instead of submitting.
   */
  readOnly?: boolean
  onContinue?: () => void
  /** Shows a "Weet ik niet" button while the question is waiting for an answer (never on Enter). */
  onDontKnow?: () => void
  /** When this changes, the input is cleared and refocused (a new question without a feedback state). */
  questionKey?: string | number
}

export function AnswerInput({ onSubmit, readOnly = false, onContinue, onDontKnow, questionKey }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  // Set by a submit until the parent reacts (readOnly or a new questionKey), so a fast second
  // Enter can never submit the same question twice.
  const pending = useRef(false)

  // Entering or leaving the feedback state: keep the focus on the input. Leaving it means a new
  // question, so anything left in the input (a half-typed answer before "Weet ik niet") goes.
  useEffect(() => {
    pending.current = false
    if (!readOnly) setValue('')
    ref.current?.focus()
  }, [readOnly])

  // A new question: start with an empty, focused input.
  useEffect(() => {
    if (questionKey === undefined) return
    pending.current = false
    setValue('')
    ref.current?.focus()
  }, [questionKey])

  const enter = () => {
    if (readOnly) {
      onContinue?.()
      return
    }
    if (pending.current || value.trim() === '') return
    pending.current = true
    onSubmit(value)
    setValue('')
  }

  const dontKnow = () => {
    if (readOnly || pending.current) return
    pending.current = true
    onDontKnow?.()
  }

  return (
    <>
      <input
        ref={ref}
        className="answer-input"
        type="text"
        aria-label="Jouw antwoord"
        placeholder="Typ je antwoord"
        enterKeyHint="send"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        readOnly={readOnly}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            enter()
          }
        }}
      />
      {onDontKnow && !readOnly && (
        <button type="button" className="btn" {...keepInputFocus} onClick={dontKnow}>
          Weet ik niet
        </button>
      )}
    </>
  )
}

import { useEffect, useRef, useState, type RefObject } from 'react'
import { keepInputFocus } from './keepInputFocus.ts'

type Props = {
  onSubmit: (text: string) => void
  /** Shows a "Weet ik niet" button while the question is waiting for an answer (never on Enter). */
  onDontKnow?: () => void
  /** When this changes, the input is cleared and refocused (a new question without a feedback state). */
  questionKey?: string | number
  /** Lets the parent focus the input inside a user gesture (iOS only opens the keyboard then). */
  inputRef?: RefObject<HTMLInputElement | null>
}

export function AnswerInput({ onSubmit, onDontKnow, questionKey, inputRef }: Props) {
  const [value, setValue] = useState('')
  const ownRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? ownRef
  // Set by a submit until a new question starts (a new questionKey or a fresh mount), so a fast
  // second Enter can never submit the same question twice.
  const pending = useRef(false)

  // A new question: start with an empty, focused input.
  useEffect(() => {
    pending.current = false
    setValue('')
    ref.current?.focus()
  }, [questionKey, ref])

  const submit = () => {
    if (pending.current || value.trim() === '') return
    pending.current = true
    onSubmit(value)
    setValue('')
  }

  const dontKnow = () => {
    if (pending.current) return
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
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          }
        }}
      />
      {onDontKnow && (
        <button type="button" className="btn" {...keepInputFocus} onClick={dontKnow}>
          Weet ik niet
        </button>
      )}
    </>
  )
}

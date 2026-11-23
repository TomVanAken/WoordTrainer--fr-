import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import type { Gender } from '../types.ts'
import { keepInputFocus } from './keepInputFocus.ts'

type Props = {
  /** `gender` is passed only when the un/une question was asked. */
  onSubmit: (text: string, gender?: Gender) => void
  /** Whether this typed text needs an un/une choice before it can be submitted (an l' answer). */
  askGender?: (typed: string) => boolean
  /** Shows a "Weet ik niet" button while the question is waiting for an answer (never on Enter). */
  onDontKnow?: () => void
  /** When this changes, the input is cleared and refocused (a new question without a feedback state). */
  questionKey?: string | number
  /** Lets the parent focus the input inside a user gesture (iOS only opens the keyboard then). */
  inputRef?: RefObject<HTMLInputElement | null>
}

export function AnswerInput({ onSubmit, askGender, onDontKnow, questionKey, inputRef }: Props) {
  const [value, setValue] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [hint, setHint] = useState(false)
  const radioName = useId()
  const showGender = askGender?.(value) ?? false
  const ownRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? ownRef
  // Set by a submit until a new question starts (a new questionKey or a fresh mount), so a fast
  // second Enter can never submit the same question twice.
  const pending = useRef(false)

  // A new question: start with an empty, focused input.
  useEffect(() => {
    pending.current = false
    setValue('')
    setGender(null)
    setHint(false)
    ref.current?.focus()
  }, [questionKey, ref])

  const submit = () => {
    if (pending.current || value.trim() === '') return
    if (showGender && gender === null) {
      setHint(true) // he has to pick un or une first
      return
    }
    pending.current = true
    onSubmit(value, showGender ? gender! : undefined)
    setValue('')
    setGender(null)
    setHint(false)
  }

  const change = (text: string) => {
    setValue(text)
    if (!askGender?.(text)) {
      setGender(null)
      setHint(false)
    }
  }

  // A browser focuses the radio when it (or its label) is tapped; hand the focus straight back to
  // the text input in the same event, so Enter works and the phone keyboard stays or comes back.
  const choose = (g: Gender) => {
    setGender(g)
    setHint(false)
    ref.current?.focus()
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
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          }
        }}
      />
      {showGender && (
        <fieldset
          className="gender-choice"
          onKeyDown={(e) => {
            // fallback: Enter while a radio still has the focus submits too
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
        >
          <legend>Is het un of une?</legend>
          {/* keepInputFocus: choosing keeps the focus (and the phone keyboard) on the input */}
          <label {...keepInputFocus}>
            <input type="radio" name={radioName} checked={gender === 'm'} onChange={() => choose('m')} />
            {' Mannelijk (un)'}
          </label>
          <label {...keepInputFocus}>
            <input type="radio" name={radioName} checked={gender === 'f'} onChange={() => choose('f')} />
            {' Vrouwelijk (une)'}
          </label>
          {hint && (
            <p className="gender-hint" role="alert">
              Kies eerst un of une.
            </p>
          )}
        </fieldset>
      )}
      <div className="row">
        {/* Submits exactly like Enter (same guards); tapping it keeps the focus on the input. */}
        <button type="button" className="btn btn-primary btn-small" {...keepInputFocus} onClick={submit}>
          Controleer
        </button>
        {onDontKnow && (
          <button type="button" className="btn btn-small" {...keepInputFocus} onClick={dontKnow}>
            Weet ik niet
          </button>
        )}
      </div>
    </>
  )
}

import { useEffect, useRef, useState } from 'react'

type Props = { onSubmit: (text: string) => void; disabled?: boolean }

export function AnswerInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  // Refocus whenever a new question becomes answerable.
  useEffect(() => {
    if (!disabled) ref.current?.focus()
  }, [disabled])

  const submit = () => {
    if (disabled || value.trim() === '') return
    onSubmit(value)
    setValue('')
  }

  return (
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
      disabled={disabled}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          submit()
        }
      }}
    />
  )
}

import { useCallback, useRef, useState } from 'react'
import type { Progress } from '../types.ts'
import { emptyProgress } from '../progress/rules.ts'
import { clearProgress, loadProgress, saveProgress } from '../progress/storage.ts'

export function useProgress(validCardIds: Set<string>, allChaptersLoaded: boolean) {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(validCardIds, allChaptersLoaded))
  const latest = useRef(progress)

  const update = useCallback((fn: (p: Progress) => Progress) => {
    const next = fn(latest.current)
    latest.current = next
    setProgress(next)
    saveProgress(next)
  }, [])

  const reset = useCallback(() => {
    clearProgress()
    const next = emptyProgress()
    latest.current = next
    setProgress(next)
  }, [])

  return { progress, update, reset }
}

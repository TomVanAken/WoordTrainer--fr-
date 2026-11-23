import { useMemo, useState } from 'react'
import type { Chapter } from './types.ts'
import { ChapterGate } from './components/ChapterGate.tsx'
import { chaptersBaseUrl, loadChapters } from './data/loadChapters.ts'
import { buildCards } from './cards/buildCards.ts'
import { useProgress } from './state/useProgress.ts'
import { Home, type Mode } from './screens/Home.tsx'
import { ChapterPicker } from './screens/ChapterPicker.tsx'
import { Settings } from './screens/Settings.tsx'

export type Screen =
  | { name: 'home' }
  | { name: 'pick'; mode: Mode }
  | { name: 'practice' | 'test'; chapterIds: string[] }
  | { name: 'exam'; chapterIds: string[] | null /* null = resume */ }
  | { name: 'settings' }

// Module-level so its identity is stable: ChapterGate reloads whenever `load` changes.
const loadAppChapters = () => loadChapters(chaptersBaseUrl())

function Trainer({ chapters, failed }: { chapters: Chapter[]; failed: string[] }) {
  const cards = useMemo(() => buildCards(chapters), [chapters])
  const cardIds = useMemo(() => new Set(cards.map((c) => c.id)), [cards])
  const { progress, reset } = useProgress(cardIds, failed.length === 0)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const home = () => setScreen({ name: 'home' })
  // Tasks 8/9 will hand this rng to the session screens.
  const rng = Math.random
  void rng

  switch (screen.name) {
    case 'pick':
      return (
        <ChapterPicker
          chapters={chapters}
          mode={screen.mode}
          onBack={home}
          onConfirm={(chapterIds) =>
            setScreen(screen.mode === 'exam' ? { name: 'exam', chapterIds } : { name: screen.mode, chapterIds })
          }
        />
      )
    case 'settings':
      return (
        <Settings
          onBack={home}
          onReset={() => {
            reset()
            home()
          }}
        />
      )
    case 'practice':
    case 'test':
    case 'exam':
      return (
        <main className="screen">
          <p>Binnenkort beschikbaar: {screen.name}</p>
          <button type="button" className="btn btn-link" onClick={home}>
            ← Terug
          </button>
        </main>
      )
    case 'home':
      return (
        <Home
          progress={progress}
          chapters={chapters}
          cards={cards}
          onStart={(mode) => setScreen({ name: 'pick', mode })}
          onResumeExam={() => setScreen({ name: 'exam', chapterIds: null })}
          onSettings={() => setScreen({ name: 'settings' })}
        />
      )
  }
}

export default function App() {
  return (
    <>
      <h1 className="title">Woordtrainer</h1>
      <ChapterGate load={loadAppChapters}>
        {(chapters, failed) => <Trainer chapters={chapters} failed={failed} />}
      </ChapterGate>
    </>
  )
}

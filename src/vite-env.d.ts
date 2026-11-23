/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAPTERS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/// <reference types="vitest/config" />
import { rmSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      // A deploy build (VITE_CHAPTERS_URL set) must not ship a copy of the chapters.
      name: 'strip-chapters',
      apply: 'build',
      closeBundle() {
        if (process.env.VITE_CHAPTERS_URL) rmSync('dist/chapters', { recursive: true, force: true })
      },
    },
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
})

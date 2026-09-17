import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['node_modules', '.next', 'e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Real `server-only` unconditionally throws — Next's webpack/Turbopack
      // resolve it to a no-op only when the *build target* is the server.
      // Vitest has no such target, so it hits the throwing module directly.
      // This alias reproduces the server-side resolution, which is correct
      // here: everything under test that imports `server-only` is a module
      // meant to run only in Next's Node process, exactly what these tests
      // exercise.
      'server-only': path.resolve(__dirname, './vitest.server-only-stub.ts'),
    },
  },
})

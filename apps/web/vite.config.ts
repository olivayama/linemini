/// <reference types="vitest" />
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // Playwright の E2E(e2e/*.spec.ts)は vitest では実行しない(playwright test で実行する)
    exclude: [...configDefaults.exclude, '**/e2e/**'],
  },
})

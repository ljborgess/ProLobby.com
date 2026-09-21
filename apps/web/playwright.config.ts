import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    // Esta suite e so do navegador: nenhuma API atras, de proposito. Apontar
    // para uma porta morta faz o comportamento ser o mesmo aqui e no CI, que
    // nao tem API, em vez de depender de o dev ter a API no ar. O caminho com
    // a API respondendo e coberto por 'pnpm smoke'.
    env: { API_URL: 'http://127.0.0.1:9' },
  },
})

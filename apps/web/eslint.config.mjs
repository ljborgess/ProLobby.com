import nextjsConfig from '@prolobby/eslint-config/nextjs'

const config = [
  ...nextjsConfig,
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'playwright-report/**'],
  },
]

export default config

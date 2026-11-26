import nextjsConfig from '@prolobby/eslint-config/nextjs'

const config = [
  ...nextjsConfig,
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'playwright-report/**'],
  },
  {
    rules: {
      // The barrel is CommonJS and re-exports node:crypto (webhook signing):
      // one import of it put a ~240 KB gzip crypto polyfill in the browser (#297).
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@prolobby/types',
              message:
                "Import from '@prolobby/types/kit' (or add a subpath): the barrel drags node:crypto into the browser bundle.",
            },
          ],
        },
      ],
    },
  },
]

export default config

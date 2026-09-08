import nestjsConfig from '@prolobby/eslint-config/nestjs'

export default [
  ...nestjsConfig,
  {
    ignores: ['dist/**'],
  },
]

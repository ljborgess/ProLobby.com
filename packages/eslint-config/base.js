const js = require('@eslint/js')
const tseslint = require('typescript-eslint')
const prettier = require('eslint-config-prettier')

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    ignores: ['dist/**', '.next/**', 'node_modules/**', 'coverage/**'],
  },
)

const { defineConfig } = require('eslint/config')
const nextVitals = require('eslint-config-next/core-web-vitals')
const nextTs = require('eslint-config-next/typescript')
const base = require('./base')

module.exports = defineConfig([...base, ...nextVitals, ...nextTs])

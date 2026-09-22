/**
 * Measurement constants from docs/requisitos/06-piloto-ocr.md and
 * docs/produto/02-jogador/01-verificacao.md. Changing a number here without
 * changing the dossiê is how the two sources drift.
 */
export const MIN_ACCEPT_CONFIDENCE = 0.85
export const FIRST_PASS_TARGET = 0.8
export const MIN_IMAGE_WIDTH = 800
export const MIN_IMAGE_HEIGHT = 600
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MIN_LANGUAGE_HITS = 3
export const ATTRIBUTE_VALUE_WINDOW = 80

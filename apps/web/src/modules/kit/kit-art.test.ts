import { describe, expect, it } from 'vitest'
import { initialsOf } from './kit-art'

describe('initialsOf (the crest letters)', () => {
  it.each([
    ['Várzea Futebol Clube', 'VFC'],
    ['Lusitana', 'LU'],
    ['Real Sociedad de Fútbol Club', 'RSD'],
    ['Łódź FC', 'ŁF'],
    ['Øster IF', 'ØI'],
    ['Спартак', 'СП'],
    ['Clube 1910', 'C1'],
    ['  ', ''],
  ])('%j → %j', (name, initials) => {
    expect(initialsOf(name)).toBe(initials)
  })
})

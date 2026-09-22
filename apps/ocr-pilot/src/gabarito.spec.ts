import { readFileSync } from 'node:fs'
import path from 'node:path'

import { parseGabarito } from './gabarito'

const validEntry = {
  id: 'synthetic-en-01',
  file: 'synthetic-en-01.png',
  edition: 'fc27',
  screen: 'attributes',
  language: 'en',
  origin: 'synthetic',
  capture: 'screenshot',
  expected: {
    overall: null,
    gamertag: null,
    position: null,
    attributes: { acceleration: 85, finishing: 76 },
  },
}

describe('parseGabarito', () => {
  it('accepts a versioned FC 27 attributes entry with overall and gamertag absent', () => {
    const gabarito = parseGabarito({ version: 1, entries: [validEntry] })
    expect(gabarito.entries).toHaveLength(1)
    expect(gabarito.entries[0]?.expected.overall).toBeNull()
    expect(gabarito.entries[0]?.expected.gamertag).toBeNull()
  })

  it('rejects an FC 27 attributes gabarito that claims overall or gamertag', () => {
    expect(() =>
      parseGabarito({
        version: 1,
        entries: [{ ...validEntry, expected: { ...validEntry.expected, overall: 88 } }],
      }),
    ).toThrow(/overall and gamertag/)
  })

  it('allows overall on an FC 26 entry, where that layout still showed it', () => {
    const gabarito = parseGabarito({
      version: 1,
      entries: [
        {
          ...validEntry,
          id: 'fc26-01',
          edition: 'fc26',
          expected: { ...validEntry.expected, overall: 88 },
        },
      ],
    })
    expect(gabarito.entries[0]?.expected.overall).toBe(88)
  })

  it('rejects an unknown attribute key instead of silently dropping it', () => {
    expect(() =>
      parseGabarito({
        version: 1,
        entries: [
          {
            ...validEntry,
            expected: { ...validEntry.expected, attributes: { skillMoves: 4 } },
          },
        ],
      }),
    ).toThrow(/skillMoves/)
  })

  it('rejects duplicate ids', () => {
    expect(() => parseGabarito({ version: 1, entries: [validEntry, validEntry] })).toThrow(
      /duplicate gabarito id/,
    )
  })

  it('keeps the committed example gabarito valid', () => {
    const raw = JSON.parse(
      readFileSync(path.join(__dirname, '../fixtures/gabarito.example.json'), 'utf8'),
    ) as unknown
    expect(parseGabarito(raw).entries[0]?.id).toBe('synthetic-en-01')
  })
})

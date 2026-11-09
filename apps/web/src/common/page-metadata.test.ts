import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCALES } from '@/content/locale'
import { PAGE_TITLES } from '@/content/page-titles'

let localeCookie: string | undefined
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === 'locale' && localeCookie ? { value: localeCookie } : undefined,
    }),
}))

import { pageMetadata } from './page-metadata'

describe('pageMetadata (#296)', () => {
  beforeEach(() => {
    localeCookie = undefined
  })

  it('titles the tab in Portuguese without a cookie', async () => {
    expect(await pageMetadata('forgotPassword')).toEqual({
      title: 'Esqueci minha senha — ProLobby',
    })
  })

  it('titles the tab in Spanish when the visitor chose it', async () => {
    localeCookie = 'es'
    expect(await pageMetadata('forgotPassword')).toEqual({
      title: 'Olvidé mi contraseña — ProLobby',
    })
    expect(await pageMetadata('queue')).toEqual({ title: 'Cola — ProLobby' })
  })

  it('falls back to Portuguese on a stale or tampered cookie', async () => {
    localeCookie = 'fr'
    expect(await pageMetadata('queue')).toEqual({ title: 'Fila — ProLobby' })
  })

  it('has a title for every route in both languages', () => {
    const keys = Object.keys(PAGE_TITLES.pt).sort()
    for (const locale of LOCALES) {
      expect(Object.keys(PAGE_TITLES[locale]).sort()).toEqual(keys)
      for (const title of Object.values(PAGE_TITLES[locale])) expect(title.trim()).not.toBe('')
    }
  })
})

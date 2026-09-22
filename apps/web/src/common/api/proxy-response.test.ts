// @vitest-environment node
//
// happy-dom's fetch, like a real browser's, hides Set-Cookie from script —
// `relay()` runs server-side in Next's Node process, where it is readable,
// and the second test below needs that to hold.
import { describe, expect, it } from 'vitest'
import { relay } from './proxy-response'

/**
 * `DELETE /bff/sessions` was the first `/bff` route whose API side answers
 * 204 — every earlier route relayed a JSON body. That surfaced a real bug:
 * `Response` throws on a non-null body for 204/205/304, and
 * `apiResponse.text()` returns `''` (not null) for a bodyless response.
 */
describe('relay()', () => {
  it('answers a bodyless 204 without throwing', async () => {
    const apiResponse = Promise.resolve(new Response(null, { status: 204 }))

    const result = await relay(apiResponse)

    expect(result.status).toBe(204)
    expect(await result.text()).toBe('')
  })

  it('still relays the body and status for an ordinary JSON response', async () => {
    const apiResponse = Promise.resolve(
      Response.json({ ok: true }, { status: 201, headers: { 'set-cookie': 'a=1; Path=/' } }),
    )

    const result = await relay(apiResponse)

    expect(result.status).toBe(201)
    expect(await result.json()).toEqual({ ok: true })
    expect(result.headers.get('set-cookie')).toBe('a=1; Path=/')
  })
})

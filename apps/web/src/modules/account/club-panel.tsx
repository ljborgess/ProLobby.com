'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useRef, useState } from 'react'
import { useClubContent } from '@/hooks/use-club-content'
import { PRIMARY, SECONDARY } from '@/modules/queue/queue-ui'

/** `GET /api/accounts/me/club` → `club`. */
export interface DeclaredClubView {
  freeSlots: number
  clubName: string
}

type Outcome = 'saved' | 'removed' | 'invalid' | 'error'

const FIELD =
  'landing-focus w-full rounded-sm border border-white/15 bg-white/5 px-3 py-2 text-sm text-foreground'

/**
 * The declared club — #229, RF-006. Optional: the queue takes anyone, and a
 * club with room is only what makes someone a captain candidate. The API is
 * the one that validates (0 to 10 slots, a name of up to 20); the fields
 * only help the person get there.
 *
 * Controlled fields, never a remounted form: a save or a removal keeps the
 * keyboard where it was, and the status region below is always in the page,
 * so a screen reader announces it when its text changes.
 */
export function ClubPanel({ initial }: { initial: DeclaredClubView | null }) {
  const content = useClubContent()
  const [club, setClub] = useState(initial)
  const [clubName, setClubName] = useState(initial?.clubName ?? '')
  const [freeSlots, setFreeSlots] = useState(initial ? String(initial.freeSlots) : '')
  const [working, setWorking] = useState<'save' | 'remove' | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const nameField = useRef<HTMLInputElement>(null)
  const router = useRouter()
  // The session ran out: only the login screen fixes that, retrying never will.
  const toLogin = () => router.push('/login')

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setWorking('save')
    setOutcome(null)
    try {
      const response = await fetch('/bff/accounts/me/club', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clubName: clubName.trim(), freeSlots: Number(freeSlots) }),
      })
      if (response.status === 401) return toLogin()
      if (!response.ok) {
        setOutcome(response.status === 400 ? 'invalid' : 'error')
        return
      }
      // What the server kept, not what was sent: it is the one that normalises.
      const saved = (await response.json()) as DeclaredClubView
      setClub({ clubName: saved.clubName, freeSlots: saved.freeSlots })
      setClubName(saved.clubName)
      setFreeSlots(String(saved.freeSlots))
      setOutcome('saved')
    } catch {
      setOutcome('error')
    } finally {
      setWorking(null)
    }
  }

  async function remove() {
    setWorking('remove')
    setOutcome(null)
    try {
      const response = await fetch('/bff/accounts/me/club', { method: 'DELETE' })
      if (response.status === 401) return toLogin()
      if (!response.ok) {
        setOutcome('error')
        return
      }
      setClub(null)
      setClubName('')
      setFreeSlots('')
      setOutcome('removed')
      // The remove button goes away with the club; the keyboard lands on the form.
      nameField.current?.focus()
    } catch {
      setOutcome('error')
    } finally {
      setWorking(null)
    }
  }

  const ok = outcome === 'saved' || outcome === 'removed'

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
        <p className="text-sm leading-relaxed text-foreground-soft">{content.subtitle}</p>
        <p className="text-xs text-foreground-soft">{content.optional}</p>
      </header>

      <form
        onSubmit={save}
        className="landing-card flex flex-col gap-4 rounded-md border border-white/12 px-4 py-4"
      >
        <label className="flex flex-col gap-1 text-sm text-foreground">
          {content.clubNameLabel}
          <input
            ref={nameField}
            name="clubName"
            required
            maxLength={20}
            value={clubName}
            onChange={(event) => setClubName(event.target.value)}
            autoComplete="off"
            className={FIELD}
          />
          <span className="text-xs text-foreground-soft">{content.clubNameHint}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          {content.freeSlotsLabel}
          <input
            name="freeSlots"
            type="number"
            inputMode="numeric"
            required
            min={0}
            max={10}
            step={1}
            value={freeSlots}
            onChange={(event) => setFreeSlots(event.target.value)}
            className={`${FIELD} tabular-nums`}
          />
          <span className="text-xs text-foreground-soft">{content.freeSlotsHint}</span>
        </label>

        {/* Always mounted: a live region that appears with its text is often not read. */}
        <p
          role="status"
          className={
            ok
              ? 'rounded-sm border border-accent/25 bg-accent/10 px-3 py-2 text-sm text-foreground'
              : 'sr-only'
          }
        >
          {ok ? content[outcome] : ''}
        </p>
        {outcome && !ok && (
          <p
            role="alert"
            className="rounded-sm border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {content[outcome]}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {club ? (
            <button
              type="button"
              onClick={remove}
              disabled={working !== null}
              className={SECONDARY}
            >
              {working === 'remove' ? content.removing : content.remove}
            </button>
          ) : (
            <span />
          )}
          <button type="submit" disabled={working !== null} className={PRIMARY}>
            {working === 'save' ? content.saving : content.save}
          </button>
        </div>
      </form>
    </div>
  )
}

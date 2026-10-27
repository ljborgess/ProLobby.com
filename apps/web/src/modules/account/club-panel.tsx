'use client'

import { type FormEvent, useState } from 'react'
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
 */
export function ClubPanel({ initial }: { initial: DeclaredClubView | null }) {
  const content = useClubContent()
  const [club, setClub] = useState(initial)
  const [working, setWorking] = useState<'save' | 'remove' | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const next = {
      clubName: String(form.get('clubName') ?? '').trim(),
      freeSlots: Number(form.get('freeSlots')),
    }
    setWorking('save')
    setOutcome(null)
    try {
      const response = await fetch('/bff/accounts/me/club', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (response.ok) {
        setClub(next)
        setOutcome('saved')
      } else {
        setOutcome(response.status === 400 ? 'invalid' : 'error')
      }
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
      if (response.ok) {
        setClub(null)
        setOutcome('removed')
      } else {
        setOutcome('error')
      }
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

      {/* Keyed by the saved club: after removing, the fields start empty. */}
      <form
        key={club ? `${club.clubName}:${club.freeSlots}` : 'none'}
        onSubmit={save}
        className="landing-card flex flex-col gap-4 rounded-md border border-white/12 px-4 py-4"
      >
        <label className="flex flex-col gap-1 text-sm text-foreground">
          {content.clubNameLabel}
          <input
            name="clubName"
            required
            maxLength={20}
            defaultValue={club?.clubName}
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
            defaultValue={club?.freeSlots}
            className={`${FIELD} tabular-nums`}
          />
          <span className="text-xs text-foreground-soft">{content.freeSlotsHint}</span>
        </label>

        {outcome && (
          <p
            role={ok ? 'status' : 'alert'}
            className={`rounded-sm border px-3 py-2 text-sm ${
              ok
                ? 'border-accent/25 bg-accent/10 text-foreground'
                : 'border-danger/25 bg-danger/10 text-danger'
            }`}
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

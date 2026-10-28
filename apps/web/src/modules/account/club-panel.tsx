'use client'

import { useRouter } from 'next/navigation'
import { type CSSProperties, type FormEvent, useRef, useState } from 'react'
import { useClubContent } from '@/hooks/use-club-content'
import { Brackets } from '@/modules/character/pitch-art'
import { PRIMARY, SECONDARY } from '@/modules/queue/queue-ui'

/** `GET /api/accounts/me/club` → `club`. */
export interface DeclaredClubView {
  freeSlots: number
  clubName: string
}

type Outcome = 'saved' | 'removed' | 'invalid' | 'error'

const MAX_NAME = 20
const SEATS = Array.from({ length: 10 }, (_, index) => index + 1)
/** RF-006: a side has 4 humans at least, so 3 free slots is the least that captains. */
const CAPTAIN_FLOOR = 3

const FIELD =
  'landing-focus w-full rounded-sm border border-white/15 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-foreground-soft/60'

/**
 * The declared club — #229, RF-006. Optional: the queue takes anyone, and a
 * club with room is only what makes someone a captain candidate.
 *
 * Built as the club's plate, live: the name sits in the lobby's brackets as
 * the lobby will show it, and the free slots are a row of seats that light up
 * one by one — the Quadro da Fila's discs, solid when free, a faint ring when
 * not. Under the plate, what that room means for captaincy, as the rule says.
 *
 * The API is the one that validates (0 to 10 slots, a name of up to 20); the
 * fields only help the person get there. Controlled fields, never a
 * remounted form: a save or a removal keeps the keyboard where it was, and
 * the status region is always in the page so a screen reader announces it.
 */
export function ClubPanel({ initial }: { initial: DeclaredClubView | null }) {
  const content = useClubContent()
  const router = useRouter()
  const [club, setClub] = useState(initial)
  const [clubName, setClubName] = useState(initial?.clubName ?? '')
  const [freeSlots, setFreeSlots] = useState<number | null>(initial?.freeSlots ?? null)
  const [working, setWorking] = useState<'save' | 'remove' | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const nameField = useRef<HTMLInputElement>(null)

  // The session ran out: only the login screen fixes that, retrying never will.
  const toLogin = () => router.push('/login')
  const name = clubName.trim()
  const changed = !club || club.clubName !== name || club.freeSlots !== freeSlots
  const canSave = name.length > 0 && freeSlots !== null && changed
  const captains = freeSlots !== null && freeSlots >= CAPTAIN_FLOOR

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave) return
    setWorking('save')
    setOutcome(null)
    try {
      const response = await fetch('/bff/accounts/me/club', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clubName: name, freeSlots }),
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
      setFreeSlots(saved.freeSlots)
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
      setFreeSlots(null)
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
        <p className="text-sm leading-relaxed text-foreground-soft">{content.subtitle}</p>
        <p className="text-xs text-foreground-soft">{content.optional}</p>
      </header>

      <form onSubmit={save} className="flex flex-col gap-5">
        {/* The plate: the club as the lobby will name it, built as it is typed. */}
        <div
          aria-hidden
          className="relative flex flex-col items-center gap-3 overflow-hidden rounded-md border border-white/12 bg-surface px-6 pb-6 pt-8 text-center"
        >
          <span
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_70%_80%_at_50%_100%,color-mix(in_srgb,var(--color-accent-strong)_35%,transparent),transparent_70%)] transition-opacity duration-500 ${
              captains ? 'opacity-100' : 'opacity-30'
            }`}
          />
          <Brackets lit={captains} />
          <span
            className={`relative max-w-full truncate font-display text-[clamp(1.6rem,1.2rem+1.6vw,2.2rem)] font-light leading-tight tracking-[-0.028em] ${
              name ? 'text-foreground' : 'text-foreground-soft/50'
            }`}
          >
            {name || content.namePlaceholder}
          </span>
          <PlateSeats count={freeSlots ?? 0} />
        </div>

        <p
          className={`text-center text-sm leading-relaxed ${captains ? 'text-foreground' : 'text-foreground-soft'}`}
        >
          {content.captaincy(freeSlots)}
        </p>

        <label className="flex flex-col gap-1.5 text-sm text-foreground">
          <span className="flex items-baseline justify-between gap-3">
            {content.clubNameLabel}
            <span
              aria-hidden
              className={`text-xs tabular-nums ${
                clubName.length >= MAX_NAME ? 'text-accent' : 'text-foreground-soft'
              }`}
            >
              {clubName.length}/{MAX_NAME}
            </span>
          </span>
          <input
            ref={nameField}
            name="clubName"
            required
            maxLength={MAX_NAME}
            value={clubName}
            onChange={(event) => setClubName(event.target.value)}
            placeholder={content.namePlaceholder}
            autoComplete="off"
            className={FIELD}
          />
          <span className="text-xs text-foreground-soft">{content.clubNameHint}</span>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 flex w-full items-baseline justify-between gap-3 text-sm text-foreground">
            {content.freeSlotsLabel}
            <span
              aria-hidden
              className="font-display text-xl font-light tabular-nums text-foreground"
            >
              {freeSlots ?? '–'}
            </span>
          </legend>
          {/* Native radios, so the arrow keys walk the seats as in any radio group. */}
          <div className="grid grid-cols-[auto_repeat(10,minmax(0,1fr))] items-center gap-0.5 sm:gap-1.5">
            <SeatChoice
              value={0}
              checked={freeSlots === 0}
              label={content.full}
              onPick={setFreeSlots}
            >
              <span className="rounded-full border border-current px-2.5 py-1 text-xs">
                {content.full}
              </span>
            </SeatChoice>
            {SEATS.map((seat) => (
              <SeatChoice
                key={seat}
                value={seat}
                checked={freeSlots === seat}
                label={content.seats(seat)}
                onPick={setFreeSlots}
              >
                <Seat lit={freeSlots !== null && seat <= freeSlots} index={seat} />
              </SeatChoice>
            ))}
          </div>
          <span className="text-xs text-foreground-soft">{content.freeSlotsHint}</span>
        </fieldset>

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
          <button type="submit" disabled={working !== null || !canSave} className={PRIMARY}>
            {working === 'save' ? content.saving : content.save}
          </button>
        </div>
      </form>
    </div>
  )
}

/** One radio of the seat row; the drawing is its child, the name is for screen readers. */
function SeatChoice({
  value,
  checked,
  label,
  onPick,
  children,
}: {
  value: number
  checked: boolean
  label: string
  onPick: (value: number) => void
  children: React.ReactNode
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-center rounded-full p-0.5 transition-colors sm:p-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
        checked ? 'text-accent' : 'text-foreground-soft hover:text-foreground'
      }`}
    >
      <input
        type="radio"
        name="freeSlots"
        value={value}
        checked={checked}
        onChange={() => onPick(value)}
        aria-label={label}
        className="sr-only"
      />
      {children}
    </label>
  )
}

/**
 * A free seat: a solid disc with a glow when lit, a faint ring otherwise. The
 * lighting runs seat by seat (a short delay each), so choosing 6 fills the
 * row like a lobby filling; reduced motion switches at once.
 */
function Seat({ lit, index }: { lit: boolean; index: number }) {
  return (
    <span
      aria-hidden
      style={{ transitionDelay: `${index * 30}ms` } as CSSProperties}
      className={`block size-4 rounded-full border sm:size-5 transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out motion-reduce:transition-none ${
        lit
          ? 'scale-100 border-accent bg-accent shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent)_55%,transparent)]'
          : 'scale-90 border-white/25 bg-transparent'
      }`}
    />
  )
}

/** The plate's row: the same seats, small and not clickable. */
function PlateSeats({ count }: { count: number }) {
  return (
    <span aria-hidden className="relative flex gap-1.5">
      {SEATS.map((seat) => (
        <span
          key={seat}
          style={{ transitionDelay: `${seat * 30}ms` } as CSSProperties}
          className={`block size-2 rounded-full transition-colors duration-300 motion-reduce:transition-none ${
            seat <= count ? 'bg-accent' : 'bg-white/15'
          }`}
        />
      ))}
    </span>
  )
}

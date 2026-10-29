'use client'

import { useRouter } from 'next/navigation'
import { type CSSProperties, type FormEvent, type ReactNode, useRef, useState } from 'react'
import {
  CREST_SHAPES,
  DEFAULT_KIT,
  KIT_COLORS,
  KIT_PATTERNS,
  type Kit,
  type KitColor,
} from '@prolobby/types'
import { useClubContent } from '@/hooks/use-club-content'
import { Crest, initialsOf, KIT_SWATCH, KitShirt } from '@/modules/kit/kit-art'
import { PRIMARY, SECONDARY } from '@/modules/queue/queue-ui'

/** `GET /api/accounts/me/club` → `club`. */
export interface DeclaredClubView {
  freeSlots: number
  clubName: string
  /** Absent only in answers from before Kit Lab: read as the default kit. */
  kit?: Kit
}

type Outcome = 'saved' | 'removed' | 'invalid' | 'error'

const MAX_NAME = 20
const SEATS = Array.from({ length: 10 }, (_, index) => index + 1)
/** RF-006: a side has 4 humans at least, so 3 free slots is the least that captains. */
const CAPTAIN_FLOOR = 3

const FIELD =
  'landing-focus min-h-11 w-full rounded-sm border border-white/30 bg-surface px-3.5 text-sm text-foreground placeholder:text-foreground-soft/70'

const sameKit = (a: Kit, b: Kit) =>
  a.primary === b.primary &&
  a.secondary === b.secondary &&
  a.pattern === b.pattern &&
  a.crest === b.crest

/**
 * The declared club — #229, RF-006, and its kit (Kit Lab, 2026-10-29).
 * Optional: the queue takes anyone, and a club with room is only what makes
 * someone a captain candidate.
 *
 * The club is built in a kit room: the shirt hangs under a spotlight and
 * changes as each choice is made, the crest carries the club's initials, and
 * the seats under it light up one by one with the free slots. The lobby
 * dresses a captain's side in this kit, so what is seen here is what the
 * other players will see.
 *
 * The API is the one that validates (0 to 10 slots, a name of up to 20, the
 * kit from its closed set); the fields only help the person get there.
 * Controlled fields, never a remounted form: a save or a removal keeps the
 * keyboard where it was, and the status region is always in the page so a
 * screen reader announces it.
 */
export function ClubPanel({ initial }: { initial: DeclaredClubView | null }) {
  const content = useClubContent()
  const router = useRouter()
  const [club, setClub] = useState(initial)
  const [clubName, setClubName] = useState(initial?.clubName ?? '')
  const [freeSlots, setFreeSlots] = useState<number | null>(initial?.freeSlots ?? null)
  const [kit, setKit] = useState<Kit>(initial?.kit ?? DEFAULT_KIT)
  const [working, setWorking] = useState<'save' | 'remove' | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const nameField = useRef<HTMLInputElement>(null)

  // The session ran out: only the login screen fixes that, retrying never will.
  const toLogin = () => router.push('/login')
  const name = clubName.trim()
  const changed =
    !club ||
    club.clubName !== name ||
    club.freeSlots !== freeSlots ||
    !sameKit(club.kit ?? DEFAULT_KIT, kit)
  const canSave = name.length > 0 && freeSlots !== null && changed
  const captains = freeSlots !== null && freeSlots >= CAPTAIN_FLOOR
  const initials = initialsOf(name) || 'PL'
  const pick = (patch: Partial<Kit>) => setKit((current) => ({ ...current, ...patch }))

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave) return
    setWorking('save')
    setOutcome(null)
    try {
      const response = await fetch('/bff/accounts/me/club', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clubName: name,
          freeSlots,
          kitPrimary: kit.primary,
          kitSecondary: kit.secondary,
          kitPattern: kit.pattern,
          crestShape: kit.crest,
        }),
      })
      if (response.status === 401) return toLogin()
      if (!response.ok) {
        setOutcome(response.status === 400 ? 'invalid' : 'error')
        return
      }
      // What the server kept, not what was sent: it is the one that normalises.
      const saved = (await response.json()) as DeclaredClubView
      const kept = saved.kit ?? kit
      setClub({ clubName: saved.clubName, freeSlots: saved.freeSlots, kit: kept })
      setClubName(saved.clubName)
      setFreeSlots(saved.freeSlots)
      setKit(kept)
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
      setKit(DEFAULT_KIT)
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
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-foreground-soft">{content.subtitle}</p>
        <p className="text-xs text-foreground-soft">{content.optional}</p>
      </header>

      <form
        onSubmit={save}
        className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]"
      >
        <KitRoom
          kit={kit}
          initials={initials}
          name={name || content.namePlaceholder}
          named={name.length > 0}
          freeSlots={freeSlots}
          captains={captains}
          captaincy={content.captaincy(freeSlots)}
        />

        <div className="flex flex-col gap-7">
          <label className="flex flex-col gap-1.5 text-sm text-foreground">
            <span className="flex items-baseline justify-between gap-3">
              {content.clubNameLabel}
              <span
                aria-hidden
                className={`font-numeric text-sm font-semibold tabular-nums ${
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

          <fieldset className="flex flex-col gap-5">
            <legend className="mb-1 flex flex-col gap-0.5">
              <span className="text-sm text-foreground">{content.kit.heading}</span>
              <span className="text-xs text-foreground-soft">{content.kit.hint}</span>
            </legend>
            <ColorRow
              name="kitPrimary"
              label={content.kit.primary}
              value={kit.primary}
              names={content.kit.colors}
              onPick={(primary) => pick({ primary })}
            />
            <ColorRow
              name="kitSecondary"
              label={content.kit.secondary}
              value={kit.secondary}
              names={content.kit.colors}
              onPick={(secondary) => pick({ secondary })}
            />
            <OptionRow label={content.kit.pattern} columns="grid-cols-5">
              {KIT_PATTERNS.map((pattern) => (
                <Choice
                  key={pattern}
                  name="kitPattern"
                  checked={kit.pattern === pattern}
                  label={content.kit.patterns[pattern]}
                  onPick={() => pick({ pattern })}
                >
                  <KitShirt kit={{ ...kit, pattern }} initials="" className="size-9" />
                </Choice>
              ))}
            </OptionRow>
            <OptionRow label={content.kit.crest} columns="grid-cols-3">
              {CREST_SHAPES.map((crest) => (
                <Choice
                  key={crest}
                  name="crestShape"
                  checked={kit.crest === crest}
                  label={content.kit.crests[crest]}
                  onPick={() => pick({ crest })}
                >
                  <Crest kit={{ ...kit, crest }} initials={initials} className="size-8" />
                </Choice>
              ))}
            </OptionRow>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 flex w-full items-baseline justify-between gap-3 text-sm text-foreground">
              {content.freeSlotsLabel}
              <span
                aria-hidden
                className="font-numeric text-2xl font-semibold tabular-nums text-foreground"
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
        </div>
      </form>
    </div>
  )
}

/**
 * The kit room: the shirt under a spotlight, its crest beside it, the club's
 * name in kit lettering, and the seats on the bench below. Every choice on
 * the right redraws it at once; a new colour washes over the shirt.
 */
function KitRoom({
  kit,
  initials,
  name,
  named,
  freeSlots,
  captains,
  captaincy,
}: {
  kit: Kit
  initials: string
  name: string
  named: boolean
  freeSlots: number | null
  captains: boolean
  captaincy: string
}) {
  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
      <div
        aria-hidden
        className="kit-room relative flex aspect-[4/4.4] flex-col items-center justify-end overflow-hidden rounded-lg border border-white/10 bg-surface sm:aspect-[4/3.3]"
        style={{ '--kit-glow': KIT_SWATCH[kit.primary].fill } as CSSProperties}
      >
        {/* The spotlight from above and its pool on the floor. */}
        <span className="kit-room-beam pointer-events-none absolute inset-x-[18%] top-0 h-[78%]" />
        <span className="pointer-events-none absolute bottom-[14%] left-1/2 h-[9%] w-[46%] -translate-x-1/2 rounded-[50%] bg-black/50 blur-md" />
        <span className="kit-room-floor pointer-events-none absolute inset-x-0 bottom-0 h-[30%]" />

        <span className="relative mb-[24%] flex items-end gap-[4%] sm:mb-[17%]">
          <span key={`${kit.primary}-${kit.secondary}-${kit.pattern}`} className="kit-hang block">
            <KitShirt
              kit={kit}
              initials={initials}
              className="w-[clamp(9rem,26vw,15rem)] drop-shadow-[0_18px_30px_rgb(0_0_0/45%)]"
            />
          </span>
          <Crest
            kit={kit}
            initials={initials}
            className="mb-[6%] w-[clamp(3.25rem,8vw,5rem)] drop-shadow-[0_8px_16px_rgb(0_0_0/45%)]"
          />
        </span>

        <span className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-5 pb-5">
          <span
            className={`max-w-full truncate font-numeric text-[clamp(1.6rem,1.1rem+1.8vw,2.4rem)] font-bold uppercase leading-none tracking-[0.04em] ${
              named ? 'text-foreground' : 'text-foreground-soft/60'
            }`}
          >
            {name}
          </span>
          <PlateSeats count={freeSlots ?? 0} />
        </span>
      </div>
      <p
        className={`text-sm leading-relaxed ${captains ? 'text-foreground' : 'text-foreground-soft'}`}
      >
        {captaincy}
      </p>
    </div>
  )
}

function OptionRow({
  label,
  columns,
  children,
}: {
  label: string
  columns: string
  children: ReactNode
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      <span aria-hidden className="text-xs text-foreground-soft">
        {label}
      </span>
      <div className={`grid gap-2 ${columns}`}>{children}</div>
    </div>
  )
}

/** Twelve swatches, one radio group: the colour is the picture, the name is for everyone. */
function ColorRow({
  name,
  label,
  value,
  names,
  onPick,
}: {
  name: string
  label: string
  value: KitColor
  names: Record<KitColor, string>
  onPick: (color: KitColor) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      <span aria-hidden className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-foreground-soft">{label}</span>
        <span className="text-foreground">{names[value]}</span>
      </span>
      <div className="grid grid-cols-6 gap-2">
        {KIT_COLORS.map((color) => (
          <label
            key={color}
            title={names[color]}
            className="group flex min-h-11 cursor-pointer items-center justify-center rounded-full has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
          >
            <input
              type="radio"
              name={name}
              value={color}
              checked={value === color}
              onChange={() => onPick(color)}
              aria-label={names[color]}
              className="peer sr-only"
            />
            <span
              aria-hidden
              style={{ background: KIT_SWATCH[color].fill }}
              className="block size-8 rounded-full border border-white/25 transition-transform duration-200 group-hover:scale-110 peer-checked:scale-110 peer-checked:ring-2 peer-checked:ring-foreground peer-checked:ring-offset-2 peer-checked:ring-offset-background motion-reduce:transition-none"
            />
          </label>
        ))}
      </div>
    </div>
  )
}

/** A drawn option (pattern or crest) over a native radio. */
function Choice({
  name,
  checked,
  label,
  onPick,
  children,
}: {
  name: string
  checked: boolean
  label: string
  onPick: () => void
  children: ReactNode
}) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border px-1 py-2 text-[0.7rem] leading-tight transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
        checked
          ? 'border-foreground/70 bg-white/[0.07] text-foreground'
          : 'border-white/15 text-foreground-soft hover:border-white/35 hover:text-foreground'
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onPick}
        aria-label={label}
        className="sr-only"
      />
      {children}
      <span aria-hidden className="text-center">
        {label}
      </span>
    </label>
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
  children: ReactNode
}) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center justify-center rounded-full p-0.5 transition-colors sm:p-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
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

/** The bench under the kit: the same seats, small and not clickable. */
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

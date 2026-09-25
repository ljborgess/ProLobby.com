'use client'

import { BackAction } from '@/common/ui/back-action'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { CheckMark } from '@/common/ui/icons'
import { TextField } from '@/common/ui/text-field'
import type { CharacterCategory, Platform, WizardStep } from '@/content/character'
import { useCharacterContent } from '@/hooks/use-character-content'
import { Brackets, PositionPitch } from './pitch-art'
import { CATEGORY_ORDER } from './roster'
import { archetypeLabel, type ArchetypeOption, type CharacterView } from './types'

const PLATFORMS: Platform[] = ['ps5', 'xbox_series', 'pc']
// Same rule as `CreateCharacterDto`; the API is still what decides.
const GAMERTAG = /^[A-Za-z0-9][A-Za-z0-9 _.#-]{2,19}$/
const NAME = /^[\p{L}\p{N} ._-]+$/u

const STEPS: readonly WizardStep[] = ['category', 'archetype', 'platform', 'gamertag', 'confirm']
type Step = WizardStep
type Field = 'gamertag' | 'name'

type Values = {
  category: CharacterCategory | ''
  archetype: string
  platform: Platform | ''
  gamertag: string
  name: string
}

/**
 * Where an API refusal sends the player back to: the step, and the field,
 * that can fix it. `category_taken` is not here: creating in a taken place
 * replaces (RF-027), so the API only sends it on a race, and a retry is the
 * honest answer.
 */
const API_ERRORS: Record<
  string,
  { key: 'mismatch' | 'gamertagLocked'; step: Step; field?: Field }
> = {
  archetype_category_mismatch: { key: 'mismatch', step: 'archetype' },
  gamertag_change_requires_moderation: {
    key: 'gamertagLocked',
    step: 'gamertag',
    field: 'gamertag',
  },
}

/**
 * Creates the character — #194, screen #196, redrawn as a pre-match sheet:
 * one decision per step, in the order the game asks them — where you play,
 * which archetype, on what, under which gamertag — and a last look at the
 * card before it goes in. The archetype step only offers what the API table
 * allows for the chosen category, so the screen can never build a
 * combination the API would refuse.
 */
export function CharacterForm({
  archetypes,
  onCreated,
  initialCategory = '',
  squad = [],
}: {
  archetypes: ArchetypeOption[]
  onCreated: (character: CharacterView) => void
  /** The slot the player clicked on the squad sheet: that step is done. */
  initialCategory?: CharacterCategory | ''
  /** The account's active characters: one in the chosen place gets replaced (RF-027). */
  squad?: CharacterView[]
}) {
  const content = useCharacterContent()
  const form = content.form
  const [values, setValues] = useState<Values>({
    category: initialCategory,
    archetype: '',
    platform: '',
    gamertag: '',
    name: '',
  })
  const [step, setStep] = useState<Step>(initialCategory ? 'archetype' : 'category')
  const [error, setError] = useState<{ message: string; field?: Field } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const replaced = squad.find((character) => character.category === values.category)

  const index = STEPS.indexOf(step)
  const allowed = values.category
    ? archetypes.filter((option) =>
        option.categories.includes(values.category as CharacterCategory),
      )
    : []

  // Each step, the first included, takes focus on its question: the widget
  // only mounts on the player's own click, and the button clicked is gone.
  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({
      ...current,
      [key]: value,
      // A new category can make the chosen archetype illegal: start it over.
      ...(key === 'category' && value !== current.category ? { archetype: '' } : {}),
    }))
    setError(null)
  }

  function go(to: Step) {
    setError(null)
    setStep(to)
  }

  /** The step's own check; null when it can move on. */
  function problem(at: Step): { message: string; field?: Field } | null {
    switch (at) {
      case 'category':
        return values.category ? null : { message: form.fieldRequired }
      case 'archetype':
        return values.archetype ? null : { message: form.fieldRequired }
      case 'platform':
        return values.platform ? null : { message: form.fieldRequired }
      case 'gamertag': {
        const gamertag = values.gamertag.trim()
        const name = values.name.trim()
        if (!gamertag) {
          return { message: form.fieldRequired, field: 'gamertag' }
        }
        if (!GAMERTAG.test(gamertag)) {
          return { message: form.gamertagInvalid, field: 'gamertag' }
        }
        return name && !NAME.test(name) ? { message: form.nameInvalid, field: 'name' } : null
      }
      case 'confirm':
        return null
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const issue = problem(step)
    if (issue) {
      setError(issue)
      return
    }
    if (step !== 'confirm') {
      go(STEPS[index + 1]!)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const name = values.name.trim()
      const response = await fetch('/bff/characters', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          category: values.category,
          archetype: values.archetype,
          platform: values.platform,
          gamertag: values.gamertag.trim(),
          ...(name ? { name } : {}),
        }),
      })
      if (response.ok) {
        onCreated((await response.json()) as CharacterView)
        return
      }
      if (response.status === 429) {
        setError({ message: form.createLimit })
        return
      }
      const body = (await response.json().catch(() => ({}))) as { message?: string }
      const known = body.message ? API_ERRORS[body.message] : undefined
      if (known) {
        setStep(known.step)
        setError({ message: form[known.key], field: known.field })
        return
      }
      setError({ message: form.genericError })
    } catch {
      setError({ message: form.genericError })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <StepRail current={index} disabled={submitting} onJump={(to) => go(STEPS[to]!)} />

      {/* The one authored moment: each step rises in as the rail advances. */}
      <div key={step} className="landing-fade-up flex flex-col gap-4">
        <h4
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-xl font-light tracking-tight text-foreground outline-none"
        >
          {form.questions[step]}
        </h4>

        {step === 'category' && (
          <TileGroup legend={form.questions.category} columns="grid-cols-2 sm:grid-cols-3">
            {CATEGORY_ORDER.map((category) => (
              <Tile
                key={category}
                name="category"
                value={category}
                checked={values.category === category}
                onSelect={() => set('category', category)}
              >
                <span
                  aria-hidden
                  className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft"
                >
                  {content.categoryCodes[category]}
                </span>
                <PositionPitch
                  category={category}
                  marker={values.category === category ? 'set' : 'empty'}
                />
                <span className="text-sm leading-snug text-foreground">
                  {content.categories[category]}
                </span>
                {squad.some((character) => character.category === category) && (
                  <span className="text-xs text-foreground-soft">{form.replaces}</span>
                )}
              </Tile>
            ))}
          </TileGroup>
        )}

        {step === 'archetype' && (
          <>
            <p className="text-sm text-foreground-soft">
              {form.archetypeFor(content.categories[values.category as CharacterCategory])}
            </p>
            {replaced && (
              <p className="text-sm text-foreground-soft">
                {form.replacingNow(archetypeLabel(replaced.archetype))}
              </p>
            )}
            <TileGroup legend={form.questions.archetype} columns="grid-cols-2">
              {allowed.map((option) => (
                <Tile
                  key={option.archetype}
                  name="archetype"
                  value={option.archetype}
                  checked={values.archetype === option.archetype}
                  onSelect={() => set('archetype', option.archetype)}
                >
                  <span className="font-display text-base font-medium tracking-tight text-foreground">
                    {archetypeLabel(option.archetype)}
                  </span>
                </Tile>
              ))}
            </TileGroup>
          </>
        )}

        {step === 'platform' && (
          <TileGroup
            legend={form.questions.platform}
            columns="grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3"
          >
            {PLATFORMS.map((platform) => (
              <Tile
                key={platform}
                name="platform"
                value={platform}
                checked={values.platform === platform}
                onSelect={() => set('platform', platform)}
              >
                {platform === 'pc' ? (
                  <MonitorMark className="size-7 text-foreground-soft" />
                ) : (
                  <ControllerMark className="size-7 text-foreground-soft" />
                )}
                <span className="text-sm text-foreground">{content.platforms[platform]}</span>
              </Tile>
            ))}
          </TileGroup>
        )}

        {step === 'gamertag' && (
          <div className="grid gap-5 sm:grid-cols-[1fr_11rem] sm:items-start">
            <div className="flex flex-col gap-4">
              <TextField
                name="gamertag"
                type="text"
                autoComplete="off"
                maxLength={20}
                label={form.gamertagLabel}
                hint={form.gamertagHint}
                error={error?.field === 'gamertag' ? error.message : undefined}
                value={values.gamertag}
                onChange={(event) => set('gamertag', event.target.value)}
              />
              <TextField
                name="name"
                type="text"
                autoComplete="off"
                maxLength={40}
                label={form.nameLabel}
                hint={form.nameHint}
                error={error?.field === 'name' ? error.message : undefined}
                value={values.name}
                onChange={(event) => set('name', event.target.value)}
              />
            </div>
            <CardPreview
              caption={form.previewCaption}
              archetype={archetypeLabel(values.archetype)}
              gamertag={values.gamertag.trim() || content.print.exampleGamertag}
            />
          </div>
        )}

        {step === 'confirm' && replaced && (
          <p
            role="note"
            className="rounded-md border border-danger/40 bg-danger/[0.06] px-4 py-3 text-sm leading-relaxed text-foreground"
          >
            {form.replacing(archetypeLabel(replaced.archetype), replaced.state === 'verified')}
          </p>
        )}

        {step === 'confirm' && (
          <div className="relative grid gap-5 overflow-hidden rounded-md border border-accent/30 bg-surface p-5 shadow-[inset_0_1px_0_0_rgb(255_255_255/6%)]">
            <Brackets />
            <div className="flex flex-col gap-3">
              <span className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft">
                {content.categoryCodes[values.category as CharacterCategory]}
              </span>
              <PositionPitch category={values.category as CharacterCategory} marker="set" />
            </div>
            <dl className="flex flex-col divide-y divide-white/8">
              <SummaryRow
                label={form.steps.category}
                value={content.categories[values.category as CharacterCategory]}
                onChange={() => go('category')}
                changeLabel={form.change}
                disabled={submitting}
              />
              <SummaryRow
                label={form.steps.archetype}
                value={archetypeLabel(values.archetype)}
                onChange={() => go('archetype')}
                changeLabel={form.change}
                disabled={submitting}
              />
              <SummaryRow
                label={form.steps.platform}
                value={content.platforms[values.platform as Platform]}
                onChange={() => go('platform')}
                changeLabel={form.change}
                disabled={submitting}
              />
              <SummaryRow
                label={form.gamertagLabel}
                value={values.gamertag.trim()}
                onChange={() => go('gamertag')}
                changeLabel={form.change}
                disabled={submitting}
              />
              {values.name.trim() && (
                <SummaryRow
                  label={form.nameLabel}
                  value={values.name.trim()}
                  onChange={() => go('gamertag')}
                  changeLabel={form.change}
                  disabled={submitting}
                />
              )}
            </dl>
          </div>
        )}
      </div>

      {error && !error.field && (
        <p role="alert" className="text-sm text-danger">
          {error.message}
        </p>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-white/8 pt-5">
        {index > 0 ? (
          <BackAction onClick={() => go(STEPS[index - 1]!)} label={form.back} />
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={submitting}
          className="landing-focus landing-sheen rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-background transition-transform duration-200 hover:scale-[1.03] active:scale-95 disabled:opacity-60"
        >
          {step === 'confirm' ? (submitting ? form.submitting : form.create) : form.next}
        </button>
      </div>
    </form>
  )
}

/**
 * The pre-match rail: five stations on one line, the stretch behind the
 * current one lit. Done stations are buttons back; the ones ahead are not,
 * because each step depends on the one before it.
 */
function StepRail({
  current,
  disabled,
  onJump,
}: {
  current: number
  disabled: boolean
  onJump: (step: number) => void
}) {
  const form = useCharacterContent().form

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs tabular-nums text-foreground-soft sm:hidden">
        {form.stepOf(current + 1, STEPS.length)} · {form.steps[STEPS[current]!]}
      </p>
      <ol className="relative grid grid-cols-5">
        {/* Track and its lit stretch, drawn behind the stations' centres. */}
        <span aria-hidden className="absolute left-[10%] right-[10%] top-3.5 h-px bg-white/12" />
        <span
          aria-hidden
          className="absolute left-[10%] top-3.5 h-px origin-left bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${(current / (STEPS.length - 1)) * 80}%` }}
        />
        {STEPS.map((station, at) => {
          const state = at < current ? 'done' : at === current ? 'current' : 'ahead'
          const node = (
            <>
              <span
                className={`relative flex size-7 items-center justify-center rounded-full border transition-colors ${
                  state === 'done'
                    ? 'border-accent bg-accent text-background'
                    : state === 'current'
                      ? 'border-accent bg-background text-accent'
                      : 'border-white/20 bg-background text-foreground-soft'
                }`}
              >
                {state === 'done' ? (
                  <CheckMark className="size-3.5" />
                ) : state === 'current' ? (
                  <span className="landing-slot-wait size-2 rounded-full bg-accent" />
                ) : (
                  <span className="text-[0.55rem] font-semibold tabular-nums">{at + 1}</span>
                )}
              </span>
              <span
                className={`hidden text-xs sm:block ${
                  state === 'ahead' ? 'text-foreground-soft' : 'text-foreground'
                }`}
              >
                {form.steps[station]}
              </span>
            </>
          )
          return (
            <li
              key={station}
              aria-current={state === 'current' ? 'step' : undefined}
              className="flex justify-center"
            >
              {state === 'done' ? (
                <button
                  type="button"
                  onClick={() => onJump(at)}
                  disabled={disabled}
                  className="landing-focus flex flex-col items-center gap-2 rounded-sm disabled:cursor-not-allowed"
                >
                  {node}
                  <span className="sr-only">{form.change}</span>
                </button>
              ) : (
                <span className="flex flex-col items-center gap-2">{node}</span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function TileGroup({
  legend,
  columns,
  children,
}: {
  legend: string
  columns: string
  children: ReactNode
}) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className={`grid gap-3 ${columns}`}>{children}</div>
    </fieldset>
  )
}

/**
 * A choice drawn as a piece of the squad sheet. The native radio stays in
 * the tile, visually hidden, so arrow keys, focus and the checked state are
 * the platform's own.
 */
function Tile({
  name,
  value,
  checked,
  onSelect,
  children,
}: {
  name: string
  value: string
  checked: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <label
      className={`relative flex cursor-pointer flex-col items-start gap-2.5 overflow-hidden rounded-md border px-4 py-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
        checked
          ? 'border-accent/60 bg-accent/[0.06]'
          : 'border-white/10 bg-surface hover:border-white/25'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      {checked && <Brackets />}
      {children}
    </label>
  )
}

/**
 * How the card will read in the game's Archetypes screen: the archetype on
 * top, the gamertag under it with the platform mark — the two things the
 * print has to show. Drawn, never a real print (it would carry a real tag).
 */
function CardPreview({
  caption,
  archetype,
  gamertag,
}: {
  caption: string
  archetype: string
  gamertag: string
}) {
  return (
    <figure className="flex w-full max-w-52 flex-col gap-2 justify-self-center sm:max-w-none sm:justify-self-auto">
      <div className="relative flex aspect-[3/4] flex-col items-center justify-end gap-1.5 overflow-hidden rounded-md border border-white/10 bg-surface p-4">
        <Brackets />
        <span
          aria-hidden
          className="absolute left-1/2 top-[22%] size-16 -translate-x-1/2 rounded-full border border-white/15 bg-white/[0.03]"
        />
        <span className="font-display text-base font-semibold tracking-tight text-foreground">
          {archetype}
        </span>
        <span className="flex max-w-full items-center gap-1.5 rounded-sm border border-accent/50 px-2 py-0.5 text-xs text-foreground">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground-soft" />
          <span className="truncate">{gamertag}</span>
        </span>
      </div>
      <figcaption className="text-xs leading-snug text-foreground-soft">{caption}</figcaption>
    </figure>
  )
}

function SummaryRow({
  label,
  value,
  onChange,
  changeLabel,
  disabled,
}: {
  label: string
  value: string
  onChange: () => void
  changeLabel: string
  disabled: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col">
        <dt className="text-xs text-foreground-soft">{label}</dt>
        <dd className="truncate text-sm text-foreground">{value}</dd>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className="landing-focus shrink-0 disabled:opacity-50 text-xs text-foreground-soft underline underline-offset-4 hover:text-foreground"
      >
        {changeLabel}
        <span className="sr-only"> {label}</span>
      </button>
    </div>
  )
}

function ControllerMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M7 8h10a4 4 0 0 1 3.9 4.9l-.9 3.8a2 2 0 0 1-3.4.9L14.5 15h-5l-2.1 2.6a2 2 0 0 1-3.4-.9l-.9-3.8A4 4 0 0 1 7 8Z" />
      <path d="M8 11v3M6.5 12.5h3" />
      <circle cx="15.5" cy="11.5" r=".6" />
      <circle cx="17" cy="13" r=".6" />
    </svg>
  )
}

function MonitorMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M9 20h6M12 16v4" />
    </svg>
  )
}

'use client'

import { useState, type FormEvent } from 'react'
import { SelectField } from '@/common/ui/select-field'
import { TextField } from '@/common/ui/text-field'
import type { CharacterCategory, Platform } from '@/content/character'
import { useCharacterContent } from '@/hooks/use-character-content'
import { archetypeLabel, type ArchetypeOption, type CharacterView } from './types'

const CATEGORIES: CharacterCategory[] = [
  'goalkeeper',
  'defender',
  'midfielder',
  'winger',
  'striker',
]
const PLATFORMS: Platform[] = ['ps5', 'xbox_series', 'pc']
// Same rule as `CreateCharacterDto`; the API is still what decides.
const GAMERTAG = /^[A-Za-z0-9][A-Za-z0-9 _.#-]{2,19}$/
const NAME = /^[\p{L}\p{N} ._-]+$/u

type Errors = Partial<Record<'category' | 'archetype' | 'platform' | 'gamertag' | 'name', string>>

const API_ERRORS: Record<string, 'mismatch' | 'categoryTaken' | 'gamertagLocked'> = {
  archetype_category_mismatch: 'mismatch',
  category_taken: 'categoryTaken',
  gamertag_change_requires_moderation: 'gamertagLocked',
}

/**
 * Creates the character — #194, screen #196. The archetype list follows the
 * chosen category, from the table the API serves, so the screen can never
 * offer a combination the API would refuse.
 */
export function CharacterForm({
  archetypes,
  onCreated,
}: {
  archetypes: ArchetypeOption[]
  onCreated: (character: CharacterView) => void
}) {
  const content = useCharacterContent()
  const [category, setCategory] = useState<CharacterCategory | ''>('')
  const [errors, setErrors] = useState<Errors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const allowed = category
    ? archetypes.filter((option) => option.categories.includes(category))
    : []

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const values = {
      category: String(data.get('category') ?? ''),
      archetype: String(data.get('archetype') ?? ''),
      platform: String(data.get('platform') ?? ''),
      gamertag: String(data.get('gamertag') ?? '').trim(),
      name: String(data.get('name') ?? '').trim(),
    }

    const next: Errors = {}
    for (const field of ['category', 'archetype', 'platform', 'gamertag'] as const) {
      if (!values[field]) {
        next[field] = content.form.fieldRequired
      }
    }
    if (values.gamertag && !GAMERTAG.test(values.gamertag)) {
      next.gamertag = content.form.gamertagInvalid
    }
    if (values.name && !NAME.test(values.name)) {
      next.name = content.form.nameInvalid
    }
    setErrors(next)
    setApiError(null)
    if (Object.keys(next).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/bff/characters', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          category: values.category,
          archetype: values.archetype,
          platform: values.platform,
          gamertag: values.gamertag,
          ...(values.name ? { name: values.name } : {}),
        }),
      })
      if (response.ok) {
        onCreated((await response.json()) as CharacterView)
        return
      }
      if (response.status === 429) {
        setApiError(content.form.createLimit)
        return
      }
      const body = (await response.json().catch(() => ({}))) as { message?: string }
      const key = body.message ? API_ERRORS[body.message] : undefined
      setApiError(key ? content.form[key] : content.form.genericError)
    } catch {
      setApiError(content.form.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <SelectField
        name="category"
        label={content.form.categoryLabel}
        placeholder={content.form.choose}
        value={category}
        onChange={(event) => setCategory(event.target.value as CharacterCategory | '')}
        options={CATEGORIES.map((value) => ({ value, label: content.categories[value] }))}
        error={errors.category}
      />
      <SelectField
        key={category}
        name="archetype"
        label={content.form.archetypeLabel}
        placeholder={content.form.choose}
        hint={content.form.archetypeHint}
        disabled={!category}
        options={allowed.map((option) => ({
          value: option.archetype,
          label: archetypeLabel(option.archetype),
        }))}
        error={errors.archetype}
      />
      <SelectField
        name="platform"
        label={content.form.platformLabel}
        placeholder={content.form.choose}
        options={PLATFORMS.map((value) => ({ value, label: content.platforms[value] }))}
        error={errors.platform}
      />
      <TextField
        name="gamertag"
        type="text"
        autoComplete="off"
        maxLength={20}
        label={content.form.gamertagLabel}
        hint={content.form.gamertagHint}
        error={errors.gamertag}
      />
      <TextField
        name="name"
        type="text"
        autoComplete="off"
        maxLength={40}
        label={content.form.nameLabel}
        hint={content.form.nameHint}
        error={errors.name}
      />

      {apiError && (
        <p role="alert" className="text-sm text-danger">
          {apiError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-sm bg-accent px-4 py-3 text-base font-medium text-background disabled:opacity-60"
      >
        {submitting ? content.form.submitting : content.form.submit}
      </button>
    </form>
  )
}

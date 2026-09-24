'use client'

import { useState, type FormEvent } from 'react'
import { SelectField } from '@/common/ui/select-field'
import { TextField } from '@/common/ui/text-field'
import type { CharacterCategory, PrintRejection } from '@/content/character'
import { CHARACTER_CONTENT } from '@/content/character'
import type { ModeratorRejection } from '@/content/moderation'
import { useLocale } from '@/common/providers/locale-provider'
import { useModerationContent } from '@/hooks/use-moderation-content'
import { archetypeLabel } from '@/modules/character/types'

export interface VerificationCase {
  caseId: string
  category: CharacterCategory
  declaredArchetype: string
  platform: string
  declaredGamertag: string
}

const REJECTIONS: ModeratorRejection[] = [
  'unreadable',
  'not_active_archetype',
  'archetype_mismatch',
]

type Decided = { approved: boolean; rejection: PrintRejection | null }

/**
 * Character prints waiting for a moderator — #198. Approving means typing
 * what the print shows (RF-073); the server compares it with what the player
 * declared, so the screen never shows the declared tag as a hint to copy.
 */
export function VerificationQueue({
  cases,
  archetypes,
}: {
  cases: VerificationCase[]
  archetypes: string[]
}) {
  const content = useModerationContent()

  if (cases.length === 0) {
    return <p className="text-sm text-foreground-soft">{content.empty}</p>
  }

  return (
    <ul className="flex flex-col gap-6">
      {cases.map((item) => (
        <li key={item.caseId}>
          <CaseCard item={item} archetypes={archetypes} />
        </li>
      ))}
    </ul>
  )
}

function CaseCard({ item, archetypes }: { item: VerificationCase; archetypes: string[] }) {
  const content = useModerationContent()
  const { locale } = useLocale()
  const categories = CHARACTER_CONTENT[locale].categories
  const rejectionText = CHARACTER_CONTENT[locale].print.rejections
  const [decided, setDecided] = useState<Decided | null>(null)
  const [errors, setErrors] = useState<{ archetype?: string; gamertag?: string }>({})
  const [failed, setFailed] = useState(false)
  const [sending, setSending] = useState(false)

  async function send(body: Record<string, unknown>) {
    setSending(true)
    setFailed(false)
    try {
      const response = await fetch(
        `/bff/moderation/character-verifications/${item.caseId}/decisions`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      if (!response.ok) {
        setFailed(true)
        return
      }
      setDecided((await response.json()) as Decided)
    } catch {
      setFailed(true)
    } finally {
      setSending(false)
    }
  }

  function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const archetype = String(data.get('archetype') ?? '')
    const gamertag = String(data.get('gamertag') ?? '').trim()
    const next = {
      archetype: archetype ? undefined : content.fieldRequired,
      gamertag: gamertag ? undefined : content.fieldRequired,
    }
    setErrors(next)
    if (next.archetype || next.gamertag) {
      return
    }
    void send({ approve: true, archetype, gamertag })
  }

  function reject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const rejection = String(new FormData(event.currentTarget).get('rejection') ?? '')
    if (rejection) {
      void send({ approve: false, rejection })
    }
  }

  return (
    <article className="flex flex-col gap-4 rounded-md border border-white/10 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- private, uncached image from our own proxy */}
      <img
        src={`/bff/moderation/character-verifications/${item.caseId}/print`}
        alt={content.printAlt}
        className="w-full rounded-sm border border-white/10"
      />
      <p className="text-sm text-foreground-soft">
        {content.declared}: {categories[item.category]} · {archetypeLabel(item.declaredArchetype)} ·{' '}
        {item.platform}
      </p>

      {decided ? (
        <p role="status" className="text-sm text-foreground">
          {decided.approved
            ? content.approved
            : `${content.rejectedWith} ${decided.rejection ? rejectionText[decided.rejection] : ''}`}
        </p>
      ) : (
        <>
          <form onSubmit={approve} noValidate className="flex flex-col gap-3">
            <SelectField
              name="archetype"
              label={content.typedArchetype}
              placeholder="—"
              options={archetypes.map((value) => ({ value, label: archetypeLabel(value) }))}
              error={errors.archetype}
            />
            <TextField
              name="gamertag"
              type="text"
              autoComplete="off"
              maxLength={20}
              label={content.typedGamertag}
              hint={content.typedGamertagHint}
              error={errors.gamertag}
            />
            <button
              type="submit"
              disabled={sending}
              className="rounded-sm bg-accent px-4 py-2.5 text-sm font-medium text-background disabled:opacity-60"
            >
              {sending ? content.deciding : content.approve}
            </button>
          </form>

          <form onSubmit={reject} className="flex flex-col gap-3 border-t border-white/10 pt-3">
            <SelectField
              name="rejection"
              label={content.rejectionLabel}
              placeholder="—"
              options={REJECTIONS.map((value) => ({ value, label: content.rejections[value] }))}
            />
            <button
              type="submit"
              disabled={sending}
              className="rounded-sm border border-white/15 px-4 py-2.5 text-sm text-foreground disabled:opacity-60"
            >
              {content.reject}
            </button>
          </form>

          {failed && (
            <p role="alert" className="text-sm text-danger">
              {content.error}
            </p>
          )}
        </>
      )}
    </article>
  )
}

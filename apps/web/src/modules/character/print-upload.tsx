'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useCharacterContent } from '@/hooks/use-character-content'
import { ArchetypeExample } from './archetype-example'
import type { PrintResult } from './types'

// The web proxy buffers at most 10 MB of body; the multipart wrapping of the
// file needs a little of it.
const MAX_BYTES = 10 * 1024 * 1024 - 64 * 1024

type Outcome =
  { kind: 'idle' } | { kind: 'sending' } | { kind: 'received' } | { kind: 'message'; text: string }

/**
 * The verification print — #195, screen #196. Instructions come before the
 * file picker, not after a failure: they are what keeps bad prints from being
 * sent at all (06-piloto-ocr.md, decisions of 2026-09-24).
 */
export function PrintUpload({
  characterId,
  onBack,
}: {
  characterId: string
  /** `received`: a print went in, so the list shows it in review. */
  onBack: (received: boolean) => void
}) {
  const content = useCharacterContent().print
  const inputId = useId()
  const hintId = `${inputId}-hint`
  const alertId = `${inputId}-alert`
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' })
  const receivedRef = useRef<HTMLParagraphElement>(null)

  // The form goes away with the button that had focus; the message takes it,
  // so a screen reader reads it and focus is not dropped on <body>.
  useEffect(() => {
    if (outcome.kind === 'received') {
      receivedRef.current?.focus()
    }
  }, [outcome.kind])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = event.currentTarget.elements.namedItem('print') as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!file) {
      setOutcome({ kind: 'message', text: content.fileRequired })
      return
    }
    if (file.size === 0) {
      setOutcome({ kind: 'message', text: content.rejections.invalid_format })
      return
    }
    if (file.size > MAX_BYTES) {
      setOutcome({ kind: 'message', text: content.tooLarge })
      return
    }

    const body = new FormData()
    body.append('print', file)
    setOutcome({ kind: 'sending' })
    try {
      const response = await fetch(`/bff/characters/${characterId}/prints`, {
        method: 'POST',
        body,
      })
      if (response.status === 429) {
        const { retryAfterSeconds = 3600 } = (await response.json().catch(() => ({}))) as {
          retryAfterSeconds?: number
        }
        setOutcome({
          kind: 'message',
          text: content.uploadLimit(Math.max(1, Math.ceil(retryAfterSeconds / 60))),
        })
        return
      }
      if (response.status === 413) {
        setOutcome({ kind: 'message', text: content.tooLarge })
        return
      }
      if (!response.ok) {
        setOutcome({ kind: 'message', text: content.genericError })
        return
      }
      const result = (await response.json()) as PrintResult
      setOutcome(
        result.status === 'received'
          ? { kind: 'received' }
          : {
              kind: 'message',
              // A cause this screen does not know yet still says something.
              text:
                (result.rejection && content.rejections[result.rejection]) || content.genericError,
            },
      )
    } catch {
      setOutcome({ kind: 'message', text: content.genericError })
    }
  }

  if (outcome.kind === 'received') {
    return (
      <div className="flex flex-col gap-4">
        <p ref={receivedRef} tabIndex={-1} role="status" className="text-base text-foreground">
          {content.received}
        </p>
        <button
          type="button"
          onClick={() => onBack(true)}
          className="landing-focus self-start text-sm text-foreground-soft underline"
        >
          {content.backToList}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="text-base font-medium text-foreground">{content.heading}</h2>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-foreground-soft">
        {content.instructions.map((instruction) => (
          <li key={instruction}>{instruction}</li>
        ))}
      </ol>
      <ArchetypeExample caption={content.exampleCaption} gamertag={content.exampleGamertag} />

      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-xs font-medium text-foreground-soft">
          {content.fileLabel}
        </label>
        <input
          id={inputId}
          name="print"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={outcome.kind === 'message' ? `${hintId} ${alertId}` : hintId}
          aria-invalid={outcome.kind === 'message' || undefined}
          className="text-sm text-foreground-soft file:mr-3 file:rounded-sm file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-foreground"
        />
        <p id={hintId} className="text-xs text-foreground-soft">
          {content.fileHint}
        </p>
      </div>

      {outcome.kind === 'message' && (
        <p id={alertId} role="alert" className="text-sm text-danger">
          {outcome.text}
        </p>
      )}

      <button
        type="submit"
        disabled={outcome.kind === 'sending'}
        className="rounded-sm bg-accent px-4 py-3 text-base font-medium text-background disabled:opacity-60"
      >
        {outcome.kind === 'sending' ? content.submitting : content.submit}
      </button>
      <button
        type="button"
        onClick={() => onBack(false)}
        className="landing-focus self-start text-sm text-foreground-soft underline"
      >
        {content.cancel}
      </button>
    </form>
  )
}

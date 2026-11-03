'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocale } from '@/common/providers/locale-provider'
import { TERMS_CONTENT } from '@/content/terms'
import { CURRENT_TERMS_VERSION } from './terms-version'

/** The Terms text itself, the same on the page and in the sign-up dialog. */
export function TermsDocument({ headingLevel = 1 }: { headingLevel?: 1 | 2 }) {
  const { locale } = useLocale()
  const content = TERMS_CONTENT[locale]
  const Title = headingLevel === 1 ? 'h1' : 'h2'
  const Section = headingLevel === 1 ? 'h2' : 'h3'

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Title className="landing-section-title font-display text-foreground">
          {content.title}
        </Title>
        <p className="text-xs text-foreground-soft">{content.version(CURRENT_TERMS_VERSION)}</p>
        <p className="rounded-sm border border-white/15 bg-white/[0.04] px-3 py-2 text-sm leading-relaxed text-foreground-soft">
          {content.draft}
        </p>
      </header>
      {content.sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <Section className="font-display text-base font-medium text-foreground">
            {section.title}
          </Section>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-relaxed text-foreground-soft">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  )
}

/**
 * "Termos de Uso" on the sign-up form: reads the Terms in place, without
 * leaving a half-filled form (2026-11-03). A native `<dialog>` opened with
 * `showModal`: the page behind goes inert, focus is held inside, and Escape
 * closes it — no focus-trap code of our own.
 *
 * Rendered into <body> and only while open: the link sits inside the terms
 * checkbox's <label>, and a dialog left in there would tick the box on every
 * click on its text.
 */
export function TermsDialogLink({ label, id }: { label: string; id?: string }) {
  const { locale } = useLocale()
  const content = TERMS_CONTENT[locale]
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) dialog.current?.showModal()
  }, [open])

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        className="auth-link text-foreground"
      >
        {label}
      </button>
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            onClose={() => setOpen(false)}
            aria-label={content.title}
            className="terms-dialog m-auto w-[min(38rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-white/12 bg-surface p-0 text-foreground shadow-[0_20px_45px_rgb(0_0_0/45%)] outline-none"
            onClick={(event) => {
              // A click on the backdrop lands on the dialog itself: close.
              if (event.target === dialog.current) dialog.current.close()
            }}
          >
            <div className="flex max-h-[min(34rem,80svh)] flex-col">
              <div className="terms-scroll min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
                <TermsDocument headingLevel={2} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3 sm:px-8">
                <Link href="/termos" target="_blank" rel="noreferrer" className="auth-link text-sm">
                  {content.openPage}
                </Link>
                <button
                  type="button"
                  autoFocus
                  onClick={() => dialog.current?.close()}
                  className="landing-focus inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-background"
                >
                  {content.close}
                </button>
              </div>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  )
}

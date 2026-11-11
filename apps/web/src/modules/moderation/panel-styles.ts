/** Classes and helpers the panel's screens share. */
export const CHIP =
  'landing-focus inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors'
export const CHIP_OFF =
  'border-white/15 text-foreground-soft hover:border-white/30 hover:text-foreground'
export const CHIP_ON = 'border-accent bg-accent/10 text-foreground'
export const FIELD =
  'landing-focus min-h-11 w-full rounded-sm border border-white/30 bg-surface px-3.5 text-sm text-foreground placeholder:text-foreground-soft/70'

export function formatDate(iso: string, locale: 'pt' | 'es'): string {
  return new Date(iso).toLocaleString(locale === 'es' ? 'es' : 'pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

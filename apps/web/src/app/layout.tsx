import type { Metadata } from 'next'
import { Barlow_Condensed, Inter, Sora } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from '@/content/locale'
import { LocaleProvider } from '@/common/providers/locale-provider'

const sora = Sora({ variable: '--font-sora', subsets: ['latin'] })
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
// Kit Lab (2026-10-29): the scoreboard's voice, for numbers and kit lettering only.
const numeric = Barlow_Condensed({
  variable: '--font-barlow-condensed',
  subsets: ['latin'],
  weight: ['600', '700'],
})

export const metadata: Metadata = {
  title: 'ProLobby',
  description: 'Matchmaking competitivo e identidade verificada para EA FC Pro Clubs.',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Read once, server-side, so the very first paint already has the right
  // `lang` and copy — no flash of Portuguese before a client effect swaps it
  // to Spanish. `isLocale` guards against a stale or tampered cookie value.
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE

  return (
    <html
      lang={locale}
      className={`${sora.variable} ${inter.variable} ${numeric.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  )
}

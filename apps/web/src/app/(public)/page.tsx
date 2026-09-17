import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">ProLobby</h1>
      <p className="text-lg text-foreground-soft">
        Matchmaking competitivo e identidade verificada para EA FC Pro Clubs.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/sign-up"
          className="rounded-sm bg-accent px-6 py-3 text-base font-medium text-background"
        >
          Criar conta
        </Link>
        <Link
          href="/login"
          className="rounded-sm border border-white/10 px-6 py-3 text-base font-medium text-foreground"
        >
          Entrar
        </Link>
      </div>
    </main>
  )
}

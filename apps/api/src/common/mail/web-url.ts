/**
 * The web app's own origin — added 2026-09-23 review.
 *
 * Every transactional email that carries a link (verify address, reset
 * password) needs one, and nothing built it before: `sendVerification` and
 * `PasswordResetService.issue` sent only `{ token }`, and `renderText`
 * (`resend-mail.sender.ts`) rendered `email.data.url ?? ''` — every link the
 * platform has ever sent went out empty.
 *
 * Required in production, like every other boot-time value here: a missing
 * `WEB_URL` must stop the process, not silently mail out blank links.
 */
export function readWebUrl(): string {
  const configured = process.env.WEB_URL

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'WEB_URL is required in production — without it, every verification and password-reset email goes out with no link',
      )
    }
    return 'http://localhost:3000'
  }

  // A trailing slash would double up when a path is appended (`${webUrl}/x`).
  return configured.replace(/\/+$/, '')
}

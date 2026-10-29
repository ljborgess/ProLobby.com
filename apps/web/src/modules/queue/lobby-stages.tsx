'use client'

import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { useQueueContent } from '@/hooks/use-queue-content'
import { Brackets } from '@/modules/character/pitch-art'
import { CountdownRing, PRIMARY, SECONDARY, secondsTo, trapFocus } from './queue-ui'
import { type PlayerView, ReportStep, type ReportView, type Side } from './result-stages'

/** `GET /queue` → `entry.lobby` (#232, #247, #248, #249, 4.1). */
export interface LobbyView {
  state: string
  confirmBy: string
  /** This account's side: `scoreA` is side A's goals. */
  side: Side
  confirmed: boolean
  /** Before answering: the block a refusal would cost, in minutes (#234). */
  refusalBlockMinutes: number | null
  /** The captain role offered to this account right now. */
  captainOffer: { answerBy: string; clubName: string } | null
  isCaptain: boolean
  /** End of the 5 min invite window; null before both captains confirmed. */
  inviteBy: string | null
  inviteClubName: string | null
  inviteReceived: boolean
  clubFullDeclared: boolean
  formation: FormationView | null
  /** The result print is accepted from here; null before the lobby closed. */
  reportableFrom: string | null
  myReport: ReportView | null
  /** After the first report: the other side reports until here. */
  reportConfirmBy: string | null
  /** While the match runs: who played, to name an absence. */
  players: { teammates: PlayerView[]; opponents: PlayerView[] } | null
}

export interface FormationView {
  options: string[]
  /** End of the 60 s; null until the bot created the channels. */
  voteBy: string | null
  myVote: string | null
  /** The votes were counted; past the 60 s and not yet, the count is due. */
  counted: boolean
  chosen: string | null
  /** Only for the captain, only while the side waits on them. */
  captainChoices: string[] | null
}

/** The floodlights over the pitch: four beams from the stand roofs. */
const BEAMS = [
  { left: '6%', from: '-26deg', to: '-14deg', delay: '0s' },
  { left: '30%', from: '-10deg', to: '-2deg', delay: '0.12s' },
  { left: '70%', from: '10deg', to: '2deg', delay: '0.24s' },
  { left: '94%', from: '26deg', to: '14deg', delay: '0.36s' },
]

/**
 * A PUT to one of the lobby's steps, then the queue state again. A 409 is the
 * step's window closing under the click; anything else is "try again". The
 * answer counts once the PUT does: a failed reload after it is not an error,
 * the next poll brings the new state.
 */
function useStep(onChanged: () => Promise<void>, closedMessage?: string) {
  const content = useQueueContent()
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  async function send(path: string, body?: unknown, method: 'PUT' | 'DELETE' = 'PUT') {
    setSending(true)
    setFailed(null)
    let response: Response
    try {
      response = await fetch(`/bff/queue/${path}`, {
        method,
        ...(body === undefined
          ? {}
          : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
      })
    } catch {
      setFailed(content.error)
      setSending(false)
      return
    }
    if (!response.ok) {
      setFailed(
        response.status === 409 ? (closedMessage ?? content.lobby.stepClosed) : content.error,
      )
      setSending(false)
      return
    }
    try {
      await onChanged()
    } catch {
      // Already answered; the poll catches up.
    } finally {
      setSending(false)
    }
  }

  return { sending, failed, send }
}

/**
 * The lobby, out of the tunnel and on the pitch — #232 and #252. One scene
 * for every step: the floodlights stay on and the card in the middle changes
 * with the lobby's state — the 30 s answer, the captains, the invite with the
 * formation vote beside it, and the match on.
 */
export function LobbyOverlay({
  lobby,
  now,
  code,
  onChanged,
}: {
  lobby: LobbyView
  now: number
  code: string
  onChanged: () => Promise<void>
}) {
  const content = useQueueContent()
  const dialog = useRef<HTMLDivElement>(null)
  // Each step swaps the buttons out from under the focus: if it fell out of
  // the dialog (or never came in), it lands on the dialog again.
  useEffect(() => {
    const node = dialog.current
    if (node && !node.contains(document.activeElement)) node.focus()
  }, [lobby.state])
  const title =
    lobby.state === 'waiting_players'
      ? content.placedTitle
      : lobby.state === 'waiting_captain'
        ? lobby.captainOffer
          ? content.lobby.captainTitle
          : content.lobby.choosingTitle
        : lobby.state === 'waiting_invite'
          ? content.lobby.inviteTitle
          : lobby.state === 'in_dispute'
            ? content.result.disputeTitle
            : content.lobby.matchTitle

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lobby-step"
      tabIndex={-1}
      onKeyDown={trapFocus}
      className="queue-overlay fixed inset-0 z-50 flex justify-center overflow-y-auto overflow-x-hidden bg-background/85 px-4 py-6 backdrop-blur-sm"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_80%_70%_at_50%_100%,color-mix(in_srgb,var(--color-accent-strong)_45%,transparent),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-[repeating-linear-gradient(90deg,rgb(255_255_255/3%)_0_8%,transparent_8%_16%)] [mask-image:linear-gradient(to_top,black,transparent)]"
      />
      {BEAMS.map((beam) => (
        <span
          key={beam.left}
          aria-hidden
          className="queue-beam pointer-events-none absolute -top-4 h-[85vh] w-[22vw] max-w-72 -translate-x-1/2 bg-[linear-gradient(to_bottom,rgb(255_255_255/38%),transparent_85%)] [clip-path:polygon(44%_0,56%_0,100%_100%,0_100%)]"
          style={
            {
              left: beam.left,
              '--beam-from': beam.from,
              '--beam-to': beam.to,
              animationDelay: `${beam.delay}, calc(1.6s + ${beam.delay})`,
            } as CSSProperties
          }
        />
      ))}

      {/* The halfway line and the centre circle: the card stands on the centre spot. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-[linear-gradient(to_bottom,transparent,rgb(255_255_255/9%)_30%,rgb(255_255_255/9%)_70%,transparent)]"
      />
      <span
        aria-hidden
        className="queue-centre-circle pointer-events-none absolute left-1/2 top-1/2 size-[min(78vw,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07]"
      />

      {/* my-auto, not items-center: a card taller than the screen scrolls from its top. */}
      <div className="queue-card-rise relative my-auto w-full max-w-sm">
        <div className="relative flex flex-col items-center gap-5 px-6 pb-6 pt-8 text-center">
          <Brackets lit />
          <MatchdayStrip state={lobby.state} />
          <h2
            id="lobby-step"
            className="font-display text-[clamp(1.65rem,1.1rem+1.7vw,2.4rem)] font-light leading-tight tracking-[-0.028em] text-foreground"
          >
            {title}
          </h2>
          {/* Key per step: a new step starts with no error and no pending click. */}
          {lobby.state === 'waiting_players' && (
            <ConfirmStep key="confirm" lobby={lobby} now={now} code={code} onChanged={onChanged} />
          )}
          {lobby.state === 'waiting_captain' && (
            <CaptainStep key="captain" lobby={lobby} now={now} onChanged={onChanged} />
          )}
          {lobby.state === 'waiting_invite' && (
            <InviteStep key="invite" lobby={lobby} now={now} onChanged={onChanged} />
          )}
          {(lobby.state === 'in_progress' || lobby.state === 'awaiting_confirmation') && (
            <ReportStep key="report" lobby={lobby} now={now} onChanged={onChanged} />
          )}
          {lobby.state === 'in_dispute' && (
            <p className="text-sm text-foreground-soft">{content.result.disputeHint}</p>
          )}
          {(lobby.state === 'waiting_invite' || lobby.state === 'in_progress') &&
            lobby.formation && (
              <FormationVote formation={lobby.formation} now={now} onChanged={onChanged} />
            )}
        </div>
      </div>
    </div>
  )
}

const STAGE_OF: Record<string, number> = {
  waiting_players: 0,
  waiting_captain: 1,
  waiting_invite: 2,
}

/**
 * The road from the 30 s to kick-off, as the matchday board shows it: the
 * steps behind lit, the one now marked, the ones ahead faint.
 */
function MatchdayStrip({ state }: { state: string }) {
  const content = useQueueContent()
  const now = STAGE_OF[state] ?? 3
  return (
    <ol aria-label={content.lobby.stagesLabel} className="queue-strip flex w-full items-center">
      {content.lobby.stages.map((stage, index) => (
        <li
          key={stage}
          aria-current={index === now ? 'step' : undefined}
          data-done={index < now || undefined}
          className="queue-strip-step flex flex-1 flex-col items-center gap-1.5"
        >
          <span aria-hidden className="queue-strip-dot" />
          <span className="text-xs font-medium leading-none">{stage}</span>
        </li>
      ))}
    </ol>
  )
}

function Failure({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  )
}

/** The 30 s: accept or refuse the lobby the queue found (#232). */
function ConfirmStep({
  lobby,
  now,
  code,
  onChanged,
}: {
  lobby: LobbyView
  now: number
  code: string
  onChanged: () => Promise<void>
}) {
  const content = useQueueContent()
  const { sending, failed, send } = useStep(onChanged, content.answerClosed)
  // Refusing costs a block (RF-009): it is said first, and refused on a second click.
  const [refusing, setRefusing] = useState(false)
  const left = secondsTo(lobby.confirmBy, now)
  const closed = left === 0
  const minutes = lobby.refusalBlockMinutes

  return (
    <>
      <CountdownRing left={left} total={30} caption={content.secondsLeft} />
      {/* The ready check: your place on your half, its light on once you accept. */}
      <div
        data-ready={lobby.confirmed || undefined}
        className="queue-ready flex w-full flex-col gap-2"
      >
        <div
          aria-hidden
          className="grid grid-cols-2 text-[0.7rem] font-medium uppercase tracking-[0.2em]"
        >
          <span className="flex items-center justify-center gap-2 border-r border-white/10 py-1 text-foreground">
            <span className="queue-ready-light" />
            {content.result.mine}
          </span>
          <span className="py-1 text-foreground-soft">{content.result.theirs}</span>
        </div>
        <p className="flex items-center justify-center gap-2 text-sm text-foreground-soft">
          <span className="queue-code">{code}</span>
          {lobby.confirmed ? content.confirmed : content.placedHint}
        </p>
      </div>
      {!lobby.confirmed && refusing && minutes !== null && (
        <div role="alert" className="flex w-full flex-col gap-3">
          <p className="text-sm text-foreground">{content.refuseWarning(minutes)}</p>
          <div className="flex w-full flex-col gap-3 sm:flex-row-reverse">
            <button
              type="button"
              autoFocus
              onClick={() => setRefusing(false)}
              className={`${PRIMARY} flex-1 py-3 text-base`}
            >
              {content.refuseBack}
            </button>
            <button
              type="button"
              onClick={() => send('confirmation', { accept: false })}
              disabled={sending || closed}
              className={`${SECONDARY} flex-1 py-3 text-base`}
            >
              {content.refuseConfirm}
            </button>
          </div>
        </div>
      )}
      {!lobby.confirmed && !(refusing && minutes !== null) && (
        <div className="flex w-full flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            autoFocus
            onClick={() => send('confirmation', { accept: true })}
            disabled={sending || closed}
            className={`${PRIMARY} flex-1 py-3 text-base`}
          >
            {content.accept}
          </button>
          <button
            type="button"
            onClick={() =>
              minutes === null ? send('confirmation', { accept: false }) : setRefusing(true)
            }
            disabled={sending || closed}
            className={`${SECONDARY} flex-1 py-3 text-base`}
          >
            {content.refuse}
          </button>
        </div>
      )}
      <Failure message={failed} />
    </>
  )
}

/**
 * The captains (#247). The one called sees the club it declared and 30 s to
 * say there is room, there is not, or the club filled up; everyone else
 * waits while the call goes from one to the next.
 */
function CaptainStep({
  lobby,
  now,
  onChanged,
}: {
  lobby: LobbyView
  now: number
  onChanged: () => Promise<void>
}) {
  const content = useQueueContent()
  const { sending, failed, send } = useStep(onChanged)
  // A 409 on withdrawing means the other captain confirmed first, not a deadline.
  const withdrawal = useStep(onChanged, content.lobby.withdrawClosed)
  const offer = lobby.captainOffer

  if (!offer) {
    if (!lobby.isCaptain) {
      return <p className="text-sm text-foreground-soft">{content.lobby.choosingHint}</p>
    }
    // RF-032: until the other side confirms, the role can go back, with no penalty.
    return (
      <>
        <p className="text-sm text-foreground-soft">{content.lobby.captainConfirmed}</p>
        <button
          type="button"
          onClick={() => withdrawal.send('captaincy', undefined, 'DELETE')}
          disabled={withdrawal.sending}
          className={`${SECONDARY} w-full`}
        >
          {content.lobby.captainWithdraw}
        </button>
        <Failure message={withdrawal.failed} />
      </>
    )
  }
  const left = secondsTo(offer.answerBy, now)
  const closed = left === 0
  const answer = (value: 'confirm' | 'decline' | 'full') => send('captaincy', { answer: value })

  return (
    <>
      <CountdownRing left={left} total={30} caption={content.lobby.captainLeft} />
      <p className="text-sm text-foreground-soft">{content.lobby.captainBody(offer.clubName)}</p>
      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          autoFocus
          onClick={() => answer('confirm')}
          disabled={sending || closed}
          className={`${PRIMARY} py-3 text-base`}
        >
          {content.lobby.captainYes}
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => answer('decline')}
            disabled={sending || closed}
            className={`${SECONDARY} flex-1`}
          >
            {content.lobby.captainNo}
          </button>
          <button
            type="button"
            onClick={() => answer('full')}
            disabled={sending || closed}
            className={`${SECONDARY} flex-1`}
          >
            {content.lobby.captainFull}
          </button>
        </div>
      </div>
      <Failure message={failed} />
    </>
  )
}

/**
 * The invite (#248): 5 min from the lobby closing for everyone to get it.
 * A player marks it received; the captain, already in the club, sends them
 * and may say the club filled up — then someone left out is no one's fault.
 */
function InviteStep({
  lobby,
  now,
  onChanged,
}: {
  lobby: LobbyView
  now: number
  onChanged: () => Promise<void>
}) {
  const content = useQueueContent()
  const { sending, failed, send } = useStep(onChanged)
  const left = lobby.inviteBy ? secondsTo(lobby.inviteBy, now) : 0
  const closed = left === 0
  const club = lobby.inviteClubName ?? ''

  return (
    <>
      <CountdownRing left={left} total={300} caption={content.lobby.inviteLeft} />
      {lobby.isCaptain ? (
        <>
          <p className="text-sm text-foreground-soft">{content.lobby.captainInviteBody(club)}</p>
          {lobby.clubFullDeclared ? (
            <p className="text-sm text-foreground">{content.lobby.clubFullDone}</p>
          ) : (
            <button
              type="button"
              onClick={() => send('club-full')}
              disabled={sending || closed}
              className={SECONDARY}
            >
              {content.lobby.clubFull}
            </button>
          )}
        </>
      ) : lobby.inviteReceived ? (
        <p className="text-sm text-foreground">{content.lobby.inviteDone}</p>
      ) : (
        <>
          <p className="text-sm text-foreground-soft">{content.lobby.inviteBody(club)}</p>
          <button
            type="button"
            autoFocus
            onClick={() => send('invite')}
            disabled={sending || closed}
            className={`${PRIMARY} w-full py-3 text-base`}
          >
            {content.lobby.inviteReceived}
          </button>
        </>
      )}
      <Failure message={failed} />
    </>
  )
}

/**
 * The side's formation (#249, RF-034): 60 s from the channels being ready,
 * one vote each and changeable; a tie or no vote waits on the captain, who
 * picks among the tied ones.
 */
function FormationVote({
  formation,
  now,
  onChanged,
}: {
  formation: FormationView
  now: number
  onChanged: () => Promise<void>
}) {
  const content = useQueueContent()
  const { sending, failed, send } = useStep(onChanged)
  const left = formation.voteBy ? secondsTo(formation.voteBy, now) : 0
  const open = formation.voteBy !== null && left > 0 && !formation.chosen

  let body: React.ReactNode
  if (formation.chosen) {
    body = (
      <p className="text-sm text-foreground">{content.lobby.formationChosen(formation.chosen)}</p>
    )
  } else if (formation.voteBy === null) {
    body = <p className="text-sm text-foreground-soft">{content.lobby.formationNotOpen}</p>
  } else if (formation.captainChoices) {
    body = (
      <>
        <p className="text-sm text-foreground-soft">{content.lobby.formationCaptainPick}</p>
        <Choices
          options={formation.captainChoices}
          mine={null}
          disabled={sending}
          onPick={(value) => send('formation', { formation: value })}
        />
      </>
    )
  } else if (open) {
    body = (
      <>
        <p className="text-sm text-foreground-soft">{content.lobby.formationHint}</p>
        <Choices
          options={formation.options}
          mine={formation.myVote}
          mineLabel={content.lobby.formationMine}
          disabled={sending}
          onPick={(value) => send('formation-vote', { formation: value })}
        />
      </>
    )
  } else if (formation.counted) {
    body = <p className="text-sm text-foreground-soft">{content.lobby.formationWaitCaptain}</p>
  } else {
    body = <p className="text-sm text-foreground-soft">{content.lobby.formationCounting}</p>
  }

  return (
    <section
      aria-labelledby="formation-title"
      className="flex w-full flex-col items-center gap-3 border-t border-white/10 pt-5"
    >
      <div className="flex w-full items-center justify-between gap-3">
        <h3
          id="formation-title"
          className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft"
        >
          {content.lobby.formationTitle}
        </h3>
        {open && (
          <span className="text-xs tabular-nums text-accent">
            {left}
            {content.lobby.formationLeft}
          </span>
        )}
      </div>
      {body}
      <Failure message={failed} />
    </section>
  )
}

/** The formations as a row of toggles; the current vote is pressed. */
function Choices({
  options,
  mine,
  mineLabel,
  disabled,
  onPick,
}: {
  options: string[]
  mine: string | null
  mineLabel?: string
  disabled: boolean
  onPick: (value: string) => void
}) {
  return (
    <div className="flex w-full gap-2">
      {options.map((option) => {
        const pressed = option === mine
        return (
          <button
            key={option}
            type="button"
            aria-pressed={pressed}
            onClick={() => onPick(option)}
            disabled={disabled}
            className={`landing-focus flex flex-1 flex-col items-center gap-0.5 rounded-[10px] border px-2 py-2.5 text-sm tabular-nums transition-colors disabled:opacity-50 ${
              pressed
                ? 'border-accent bg-accent/10 text-foreground'
                : 'border-white/15 text-foreground-soft hover:border-white/35 hover:text-foreground'
            }`}
          >
            {option}
            {pressed && mineLabel && (
              <span className="text-[0.7rem] uppercase tracking-[0.2em] text-accent">
                {mineLabel}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

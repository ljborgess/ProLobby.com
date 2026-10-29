'use client'

import { useEffect, useRef } from 'react'
import { secondsTo } from './queue-ui'

/**
 * Asked on joining the queue, a click away from the prompt: browsers only
 * show it after a gesture, and later would be inside the 30 s.
 */
export function askToAlert() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
  Notification.requestPermission().catch(() => {
    // Refused or unsupported: the tab title still counts down.
  })
}

/**
 * The 30 s are spent looking at the console, not at this tab (audit of
 * 2026-10-28). While a lobby waits on this account's answer the tab title
 * counts it down; the moment it appears, a hidden tab raises a notification
 * and a phone vibrates.
 *
 * ponytail: the notification rides the poll, and a tab hidden for minutes
 * gets its timers throttled to about one a minute, so it can arrive late in
 * the 30 s. A worker timer or a push (SSE) is the upgrade if that bites.
 */
export function useMatchAlert(
  confirmBy: string | null,
  now: number,
  text: { title: string; body: string; tab: (seconds: number) => string },
) {
  useEffect(() => {
    if (!confirmBy) return
    navigator.vibrate?.([200, 100, 200])
    if (!document.hidden || typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    try {
      const notice = new Notification(text.title, { body: text.body, tag: 'prolobby-match' })
      notice.onclick = () => {
        window.focus()
        notice.close()
      }
    } catch {
      // Mobile Chrome only notifies through a service worker; the title stays.
    }
    // Once per lobby: the deadline is its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmBy])

  // The last title this wrote: only that one is given back, so leaving for
  // another page never overwrites the title that page just set.
  const written = useRef<string | null>(null)
  useEffect(() => {
    if (!confirmBy) return
    const original = document.title
    return () => {
      if (document.title === written.current) document.title = original
      written.current = null
    }
  }, [confirmBy])

  useEffect(() => {
    if (!confirmBy) return
    written.current = text.tab(secondsTo(confirmBy, now))
    document.title = written.current
  }, [confirmBy, now, text])
}

/**
 * `setInterval` that keeps its pace in a hidden tab (#298). Chrome throttles
 * the timers of a tab hidden for over ~5 min to about one a minute, so the
 * 30 s of a lobby could pass between two polls; a dedicated worker's timers
 * are left alone. Where a worker is missing or will not load (jsdom, an old
 * browser, a CSP refusal), the main thread's timer takes over.
 */
export function every(ms: number, tick: () => void): () => void {
  let fallback: ReturnType<typeof setInterval> | undefined
  const onMainThread = () => {
    fallback ??= setInterval(tick, ms)
  }
  if (typeof Worker === 'undefined') {
    onMainThread()
    return () => clearInterval(fallback)
  }
  let worker: Worker | undefined
  try {
    worker = new Worker('/queue-clock.js')
    worker.onmessage = () => tick()
    worker.onerror = () => {
      worker?.terminate()
      onMainThread()
    }
    worker.postMessage(ms)
  } catch {
    onMainThread()
  }
  return () => {
    worker?.terminate()
    clearInterval(fallback)
  }
}

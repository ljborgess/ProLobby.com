// The queue's clock, off the main thread (#298): see `every()` in
// src/modules/queue/clock.ts. Plain JS in public/: the bundler copies a
// worker written in TypeScript as a raw asset instead of compiling it.
self.onmessage = (event) => {
  setInterval(() => self.postMessage(null), event.data)
}

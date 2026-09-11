import express, { Express, Request, Response } from 'express'
import { platformEventSchema } from '@prolobby/types'

// Receives platform events (RF-058). Testable in isolation with a fake event
// (curl) until apps/api actually exists — see docs/discord/HANDOFF-bot.md.
export function createWebhookServer(): Express {
  const app = express()
  app.use(express.json())

  app.post('/events', (req: Request, res: Response) => {
    const parsed = platformEventSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }
    // TODO: route to the handler for each of RF-047..062 based on parsed.data.type
    res.status(202).json({ received: true })
  })

  return app
}

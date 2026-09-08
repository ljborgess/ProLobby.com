import express, { Express, Request, Response } from 'express'
import { platformEventSchema } from '@prolobby/types'

// Recebe evento da plataforma (RF-058). Testável isolado via evento fake
// (curl) até apps/api existir de verdade — ver docs/discord/HANDOFF-bot.md.
export function createWebhookServer(): Express {
  const app = express()
  app.use(express.json())

  app.post('/events', (req: Request, res: Response) => {
    const parsed = platformEventSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }
    // TODO: rotear pro handler de cada RF-047..062 conforme parsed.data.type
    res.status(202).json({ received: true })
  })

  return app
}

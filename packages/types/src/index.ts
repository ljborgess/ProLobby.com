import { z } from 'zod'

// Stub do contrato de evento webhook (RF-058, docs/discord/04-integracao.md).
// Cresce junto com apps/api e apps/bot conforme cada RF-047..RF-062 é implementado.

export const platformEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  occurredAt: z.string().datetime(),
  payload: z.record(z.unknown()),
})

export type PlatformEvent = z.infer<typeof platformEventSchema>

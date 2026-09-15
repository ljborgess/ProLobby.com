import { z } from 'zod'

export {
  WEBHOOK_MAX_SKEW_MS,
  WEBHOOK_SIGNATURE_HEADER,
  isWebhookTimestampFresh,
  signWebhookBody,
  verifyWebhookSignature,
} from './webhook-signature'

// Stub of the webhook event contract (RF-058, docs/discord/04-integracao.md).
// Grows alongside apps/api and apps/bot as each of RF-047..RF-062 is built.
// Issue #95 replaces the loose payload with a discriminated union per type.

export const platformEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  occurredAt: z.string().datetime(),
  payload: z.record(z.unknown()),
})

export type PlatformEvent = z.infer<typeof platformEventSchema>

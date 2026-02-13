import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { syncUserIntegration, scheduledSync } from '@/inngest/function'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncUserIntegration,
    scheduledSync
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
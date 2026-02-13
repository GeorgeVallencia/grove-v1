import { inngest } from './client'
import { createClient } from '@supabase/supabase-js'
import { getValidAccessToken } from '@/lib/refreshToken'
import { syncProvider } from '@/lib/providers'
import { evaluateGardenGrowth } from '@/lib/growthEngine'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const syncUserIntegration = inngest.createFunction(
  {
    id: 'sync-user-integration',
    retries: 3,
    rateLimit: {
      limit: 100,
      period: '1m'
    }
  },
  { event: 'grove/integration.sync' },
  
  async ({ event, step }) => {
    const { userId, providerId } = event.data

    // Step 1: Get integration
    const integration = await step.run('get-integration', async () => {
      const { data } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider_id', providerId)
        .single()
      
      return data
    })

    if (!integration || integration.status !== 'active') {
      return { skipped: true, reason: 'Integration not active' }
    }

    // Step 2: Get valid access token (refreshes if needed)
    const accessToken = await step.run('get-access-token', async () => {
      return getValidAccessToken(userId, providerId)
    })

    // Step 3: Sync data from provider
    const metrics = await step.run('sync-provider', async () => {
      return syncProvider(userId, providerId, accessToken, integration.config)
    })

    // Step 4: Save metrics
    await step.run('save-metrics', async () => {
      for (const metric of metrics) {
        await supabase
          .from('user_metrics')
          .upsert({
            user_id: userId,
            ...metric
          }, {
            onConflict: 'user_id, metric_id, date'
          })
      }
    })

    // Step 5: Update last sync time
    await step.run('update-sync-time', async () => {
      await supabase
        .from('user_integrations')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', integration.id)
    })

    // Step 6: Log the sync
    await step.run('log-sync', async () => {
      await supabase
        .from('sync_logs')
        .insert({
          user_id: userId,
          provider_id: providerId,
          records_processed: metrics.length,
          status: 'success'
        })
    })

    // Step 7: Evaluate garden
    await step.run('evaluate-garden', async () => {
      await evaluateGardenGrowth(userId)
    })

    return { success: true, metrics: metrics.length }
  }
)

export const scheduledSync = inngest.createFunction(
  { id: 'scheduled-sync' },
  { cron: '0 * * * *' }, // Every hour
  
  async ({ step }) => {
    // Get all active integrations
    const integrations = await step.run('get-active-integrations', async () => {
      const { data } = await supabase
        .from('user_integrations')
        .select('user_id, provider_id')
        .eq('status', 'active')
      
      return data || []
    })

    // Dispatch individual sync jobs
    await step.run('dispatch-syncs', async () => {
      const events = integrations.map(({ user_id, provider_id }) => ({
        name: 'grove/integration.sync',
        data: { userId: user_id, providerId: provider_id }
      }))

      await inngest.send(events)
    })

    return { dispatched: integrations.length }
  }
)



// import { inngest } from "./client";

// export const helloWorld = inngest.createFunction(
//   { id: "hello-world" },
//   { event: "test/hello.world" },
//   async ({ event, step }) => {
//     await step.sleep("wait-a-moment", "1s");
//     return { message: `Hello ${event.data.email}!` };
//   },
// );


import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/refreshToken'
import { syncProvider } from '@/lib/providers'
import { evaluateGardenGrowth } from '@/lib/growthEngine'

export async function POST(request: Request) {
  try {
    const { userId, providerId } = await request.json()
    const supabase = await createClient()

    // Get integration config
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider_id', providerId)
      .single()

    if (!integration || integration.status !== 'active') {
      return NextResponse.json({ error: 'Integration not active' }, { status: 400 })
    }

    // Get valid access token (refreshes if needed)
    const accessToken = await getValidAccessToken(userId, providerId)

    // Sync data from provider
    const metrics = await syncProvider(userId, providerId, accessToken, integration.config)

    // Save metrics to database
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

    // Update last sync time
    await supabase
      .from('user_integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', integration.id)

    // Log the sync
    await supabase
      .from('sync_logs')
      .insert({
        user_id: userId,
        provider_id: providerId,
        records_processed: metrics.length,
        status: 'success'
      })

    // Evaluate garden growth
    await evaluateGardenGrowth(userId)

    return NextResponse.json({ success: true, metrics })

  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


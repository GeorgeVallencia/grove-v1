import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { evaluateGardenGrowth } from '@/lib/growthEngine'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    /*
      Expected payload from Zapier/Make:
      {
        "token": "user's unique webhook token",
        "metric": "audible_minutes",
        "value": 45,
        "unit": "minutes",          // optional
        "date": "2026-02-10",       // optional, defaults to today
        "note": "Finished Chapter 12" // optional
      }
    */

    const { token, metric, value, unit, date, note } = body

    if (!token || !metric || value === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: token, metric, value' 
      }, { status: 400 })
    }

    // Verify token and get user ID
    const supabase = await createClient()
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('webhook_token', token)
      .single()

    if (!profile) {
      return NextResponse.json({ 
        error: 'Invalid webhook token' 
      }, { status: 401 })
    }

    const userId = profile.id

    // Find or create this custom metric
    const metricId = metric.toLowerCase().replace(/\s+/g, '_')
    
    const { data: existingMetric } = await supabase
      .from('user_custom_metrics')
      .select('metric_id')
      .eq('user_id', userId)
      .eq('metric_id', metricId)
      .single()

    if (!existingMetric) {
      // Auto-create the metric
      await supabase
        .from('user_custom_metrics')
        .insert({
          user_id: userId,
          metric_id: metricId,
          name: metric,
          unit: unit || '',
          category: 'custom',
          source: 'webhook'
        })
    }

    // Store the data point
    const today = date || new Date().toISOString().split('T')[0]
    
    const { error: metricError } = await supabase
      .from('user_metrics')
      .upsert({
        user_id: userId,
        metric_id: metricId,
        date: today,
        value: parseFloat(value.toString()),
        source: 'webhook',
        note: note,
        raw_data: { original_payload: body }
      }, {
        onConflict: 'user_id, metric_id, date'
      })

    if (metricError) throw metricError

    // Trigger garden growth evaluation
    await evaluateGardenGrowth(userId)

    return NextResponse.json({ 
      success: true, 
      metric: metricId, 
      value: parseFloat(value.toString())
    })

  } catch (error: any) {
    console.error('Webhook intake error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}


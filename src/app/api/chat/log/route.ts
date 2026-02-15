import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseNaturalLanguage } from '@/lib/ai/parseActivity'
import { evaluateGardenGrowth } from '@/lib/growthEngine'

export async function POST(request: Request) {
  try {
    const { message, userId } = await request.json()

    if (!message || !userId) {
      return NextResponse.json({ error: 'Missing message or userId' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user's existing metrics
    const { data: existingMetrics } = await supabase
      .from('user_custom_metrics')
      .select('metric_id, name')
      .eq('user_id', userId)

    const metricNames = existingMetrics?.map(m => m.metric_id) ?? []

    // Parse what the user said
    const activities = await parseNaturalLanguage(message, metricNames)

    const newMetrics: any[] = []
    const loggedActivities: any[] = []
    const today = new Date().toISOString().split('T')[0]

    for (const activity of activities) {
      if (activity.confidence < 0.7) continue // Skip low confidence

      if (activity.is_new_metric) {
        // Create the metric
        const { error: metricError } = await supabase
          .from('user_custom_metrics')
          .insert({
            user_id: userId,
            metric_id: activity.metric,
            name: activity.metric.replace(/_/g, ' '),
            unit: activity.unit,
            category: activity.category,
            source: 'nlp'
          })

        if (metricError && metricError.code !== '23505') {
          console.error('Metric creation error:', metricError)
          continue
        }

        newMetrics.push(activity)
      }

      // Log the activity
      const { error: logError } = await supabase
        .from('user_metrics')
        .upsert({
          user_id: userId,
          metric_id: activity.metric,
          date: today,
          value: activity.value,
          source: 'nlp',
          raw_data: {
            original_message: message,
            parsed_activity: activity,
            confidence: activity.confidence,
            logged_at: new Date().toISOString()
          }
        }, {
          onConflict: 'user_id, metric_id, date'
        })

      if (!logError) {
        loggedActivities.push(activity)
      }
    }

    // Evaluate garden growth
    if (loggedActivities.length > 0) {
      await evaluateGardenGrowth(userId)
    }

    return NextResponse.json({
      success: true,
      logged: loggedActivities,
      new_metrics: newMetrics
    })

  } catch (error: any) {
    console.error('Chat log error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


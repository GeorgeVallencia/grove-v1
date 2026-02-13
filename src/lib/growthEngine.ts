import { createClient } from '@/lib/supabase/server'

export async function evaluateGardenGrowth(userId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: plants } = await supabase
    .from('user_plants')
    .select(`
      id,
      current_level,
      plant_growth_rules (
        metric_id,
        condition_type,
        condition_value,
        growth_amount,
        decay_per_day
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!plants) return { success: false, error: 'No plants found' }

  const updates = []

  for (const plant of plants) {
    let levelDelta = 0

    for (const rule of plant.plant_growth_rules) {
      const { data: metric } = await supabase
        .from('user_metrics')
        .select('value')
        .eq('user_id', userId)
        .eq('metric_id', rule.metric_id)
        .eq('date', today)
        .single()

      const metricValue = metric?.value ?? 0
      const threshold = rule.condition_value ?? 0

      const conditionMet = evaluateCondition(
        rule.condition_type,
        metricValue,
        threshold
      )

      if (conditionMet) {
        levelDelta += rule.growth_amount
      } else {
        levelDelta -= rule.decay_per_day
      }
    }

    const newLevel = Math.min(100, Math.max(0, plant.current_level + levelDelta))

    await supabase
      .from('user_plants')
      .update({ current_level: newLevel })
      .eq('id', plant.id)

    updates.push({ id: plant.id, oldLevel: plant.current_level, newLevel, delta: levelDelta })
  }

  return { success: true, updates }
}

function evaluateCondition(type: string, value: number, threshold: number): boolean {
  switch (type) {
    case 'gte': return value >= threshold
    case 'lte': return value <= threshold
    case 'eq': return value === threshold
    case 'any_activity': return value > 0
    default: return false
  }
}


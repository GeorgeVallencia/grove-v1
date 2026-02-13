import { NextResponse } from 'next/server'
import { evaluateGardenGrowth } from '@/lib/growthEngine'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    const result = await evaluateGardenGrowth(userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Evaluation error:', error)
    return NextResponse.json({ error: 'Failed to evaluate' }, { status: 500 })
  }
}



// import { createClient } from '@/lib/supabase/server'
// import { NextResponse } from 'next/server'

// export async function POST(request: Request) {
//   try {
//     const { userId } = await request.json()
//     const supabase = await createClient()
    
//     const today = new Date().toISOString().split('T')[0]

//     // Get all active plants and their rules
//     const { data: plants } = await supabase
//       .from('user_plants')
//       .select(`
//         id,
//         current_level,
//         plant_growth_rules (
//           metric_id,
//           condition_type,
//           condition_value,
//           growth_amount,
//           decay_per_day
//         )
//       `)
//       .eq('user_id', userId)
//       .eq('is_active', true)

//     if (!plants) return NextResponse.json({ error: 'No plants found' })

//     // Evaluate each plant
//     for (const plant of plants) {
//       let levelDelta = 0

//       for (const rule of plant.plant_growth_rules) {
//         // Get today's metric value
//         const { data: metric } = await supabase
//           .from('user_metrics')
//           .select('value')
//           .eq('user_id', userId)
//           .eq('metric_id', rule.metric_id)
//           .eq('date', today)
//           .single()

//         const metricValue = metric?.value ?? 0
//         const threshold = rule.condition_value ?? 0

//         // Check if condition is met
//         let conditionMet = false
//         switch (rule.condition_type) {
//           case 'gte':
//             conditionMet = metricValue >= threshold
//             break
//           case 'lte':
//             conditionMet = metricValue <= threshold
//             break
//           case 'eq':
//             conditionMet = metricValue === threshold
//             break
//           case 'any_activity':
//             conditionMet = metricValue > 0
//             break
//         }

//         if (conditionMet) {
//           levelDelta += rule.growth_amount
//         } else {
//           levelDelta -= rule.decay_per_day
//         }
//       }

//       // Update plant level (clamped 0-100)
//       const newLevel = Math.min(100, Math.max(0, plant.current_level + levelDelta))

//       await supabase
//         .from('user_plants')
//         .update({ current_level: newLevel })
//         .eq('id', plant.id)
//     }

//     return NextResponse.json({ success: true })
    
//   } catch (error) {
//     console.error('Evaluation error:', error)
//     return NextResponse.json({ error: 'Failed to evaluate' }, { status: 500 })
//   }
// }
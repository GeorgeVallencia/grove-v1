'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const categories = [
  { id: 'career', label: 'Career & Business', icon: '💼', plantType: 'oak' },
  { id: 'health', label: 'Health & Fitness', icon: '🏃', plantType: 'bamboo' },
  { id: 'relationships', label: 'Relationships', icon: '❤️', plantType: 'rose' },
  { id: 'learning', label: 'Learning & Skills', icon: '📚', plantType: 'pine' },
  { id: 'mindfulness', label: 'Mind & Wellbeing', icon: '🧘', plantType: 'lily' },
]

type AvailableMetric = {
  id: string
  name: string
  unit: string
  source: 'custom' | 'provider'
  category: string
  default_goal?: number
}

export default function AddPlantButton({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'category' | 'metric' | 'creating'>('category')
  const [category, setCategory] = useState('')
  const [selectedMetric, setSelectedMetric] = useState<AvailableMetric | null>(null)
  const [goal, setGoal] = useState('')
  const [availableMetrics, setAvailableMetrics] = useState<AvailableMetric[]>([])
  
  const router = useRouter()
  const supabase = createClient()

 const handleCategorySelect = async (cat: string) => {
  setCategory(cat)
  
  console.log('Selected category:', cat)
  
  // Fetch available metrics for this category
  const { data: customMetrics } = await supabase
    .from('user_custom_metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('category', cat)

  console.log('Custom metrics:', customMetrics)

  // Check which integrations are connected
  const { data: integrations } = await supabase
    .from('user_integrations')
    .select('provider_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  console.log('Connected integrations:', integrations)

  const connectedProviders = integrations?.map(i => i.provider_id) || []
  console.log('Connected providers array:', connectedProviders)

  const { data: providerMetrics } = await supabase
    .from('provider_metrics')
    .select('*')

  console.log('All provider metrics:', providerMetrics)

  // Filter for Gmail
  const gmailMetrics = (providerMetrics || []).filter(m => {
    console.log('Checking metric:', m.id, 'Connected providers includes gmail?', connectedProviders.includes('gmail'), 'Category matches?', cat === 'career')
    if (m.id === 'gmail.emails_sent' && connectedProviders.includes('gmail')) {
      return cat === 'career'
    }
    return false
  })

  console.log('Filtered Gmail metrics:', gmailMetrics)

  // Combine custom and provider metrics
  const custom: AvailableMetric[] = (customMetrics || []).map(m => ({
    id: m.metric_id,
    name: m.name,
    unit: m.unit,
    source: 'custom' as const,
    category: m.category,
    default_goal: m.default_goal
  }))

  const provider: AvailableMetric[] = gmailMetrics.map(m => ({
    id: m.id,
    name: m.name,
    unit: m.unit || '',
    source: 'provider' as const,
    category: cat,
  }))

  console.log('Final available metrics:', [...custom, ...provider])

  setAvailableMetrics([...custom, ...provider])
  setStep('metric')
}

  // const handleCategorySelect = async (cat: string) => {
  //   setCategory(cat)
    
  //   // Fetch available metrics for this category
  //   const { data: customMetrics } = await supabase
  //     .from('user_custom_metrics')
  //     .select('*')
  //     .eq('user_id', userId)
  //     .eq('category', cat)

  //   const { data: providerMetrics } = await supabase
  //     .from('provider_metrics')
  //     .select('*')

  //   // Combine custom and provider metrics
  //   const custom: AvailableMetric[] = (customMetrics || []).map(m => ({
  //     id: m.metric_id,
  //     name: m.name,
  //     unit: m.unit,
  //     source: 'custom' as const,
  //     category: m.category,
  //     default_goal: m.default_goal
  //   }))

  //   const provider: AvailableMetric[] = (providerMetrics || [])
  //     .filter(m => {
  //       // Only show Gmail if connected
  //       if (m.id === 'gmail.emails_sent') {
  //         return cat === 'career' // Gmail fits career category
  //       }
  //       return false // Other providers not implemented yet
  //     })
  //     .map(m => ({
  //       id: m.id,
  //       name: m.name,
  //       unit: m.unit || '',
  //       source: 'provider' as const,
  //       category: cat,
  //     }))

  //   setAvailableMetrics([...custom, ...provider])
  //   setStep('metric')
  // }

  const handleCreatePlant = async () => {
    if (!selectedMetric) return
    setStep('creating')

    try {
      const plantType = categories.find(c => c.id === category)?.plantType || 'oak'
      const plantName = `${selectedMetric.name} ${plantType}`

      // Create plant
      const { data: plant, error: plantError } = await supabase
        .from('user_plants')
        .insert({
          user_id: userId,
          name: plantName,
          plant_type: plantType,
          category: category,
          current_level: 0,
        })
        .select()
        .single()

      if (plantError) throw plantError

      // Create growth rule
      await supabase
        .from('plant_growth_rules')
        .insert({
          plant_id: plant.id,
          user_id: userId,
          metric_id: selectedMetric.id,
          condition_type: 'gte',
          condition_value: parseFloat(goal) || selectedMetric.default_goal || 1,
          growth_amount: 10,
          decay_per_day: 5,
        })

      setIsOpen(false)
      setStep('category')
      setCategory('')
      setSelectedMetric(null)
      setGoal('')
      router.refresh()

    } catch (error) {
      console.error('Create plant error:', error)
      alert('Failed to create plant. Try again.')
      setStep('metric')
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
      >
        <span>🌱</span>
        Add Plant
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1a2e1a] border border-green-900/40 rounded-2xl p-8 max-w-md w-full">
        
        {step === 'category' && (
          <>
            <h2 className="text-white text-xl font-semibold mb-6">
              What area is this for?
            </h2>
            <div className="space-y-3 mb-4">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className="w-full bg-[#0f1a0f] border border-green-900/50 rounded-xl p-4 text-left hover:border-green-500/50 transition-all flex items-center gap-3"
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-white font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-green-400/60 text-sm hover:text-green-400 transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {step === 'metric' && (
          <>
            <h2 className="text-white text-xl font-semibold mb-2">
              Choose what to track
            </h2>
            <p className="text-green-400/60 text-sm mb-6">
              {categories.find(c => c.id === category)?.label}
            </p>

            {availableMetrics.length === 0 ? (
              <p className="text-green-400/40 text-sm mb-6">
                No metrics available for this category yet. Create a custom metric first.
              </p>
            ) : (
              <div className="space-y-3 mb-6">
                {availableMetrics.map(metric => (
                  <button
                    key={metric.id}
                    onClick={() => setSelectedMetric(metric)}
                    className={`w-full border rounded-xl p-4 text-left transition-all ${
                      selectedMetric?.id === metric.id
                        ? 'bg-green-900/30 border-green-500/50'
                        : 'bg-[#0f1a0f] border-green-900/50 hover:border-green-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-white font-medium">{metric.name}</div>
                        <div className="text-green-400/60 text-sm mt-1">
                          {metric.source === 'provider' ? '🔗 Auto-synced' : '📝 Manual entry'}
                        </div>
                      </div>
                      {selectedMetric?.id === metric.id && (
                        <div className="text-green-500">✓</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedMetric && (
              <div className="mb-6">
                <label className="text-green-300/70 text-sm block mb-2">
                  Daily goal ({selectedMetric.unit})
                </label>
                <input
                  type="number"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder={selectedMetric.default_goal?.toString() || '10'}
                  className="w-full bg-[#0f1a0f] border border-green-900/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('category')}
                className="flex-1 bg-[#0f1a0f] border border-green-900/50 text-green-400 font-medium py-3 rounded-xl hover:border-green-500/50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreatePlant}
                disabled={!selectedMetric || !goal}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Create Plant
              </button>
            </div>
          </>
        )}

        {step === 'creating' && (
          <div className="text-center">
            <div className="text-5xl mb-4 animate-bounce">🌱</div>
            <p className="text-white">Creating your plant...</p>
          </div>
        )}

      </div>
    </div>
  )
}


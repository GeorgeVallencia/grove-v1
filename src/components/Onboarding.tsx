'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Step = 'categories' | 'metrics' | 'creating'

type CategoryConfig = {
  metricName: string
  unit: string
  goal: string
}

const categories = [
  { id: 'career', label: 'Career & Business', icon: '💼', color: 'from-blue-600 to-blue-400' },
  { id: 'health', label: 'Health & Fitness', icon: '🏃', color: 'from-green-600 to-green-400' },
  { id: 'relationships', label: 'Relationships', icon: '❤️', color: 'from-pink-600 to-pink-400' },
  { id: 'learning', label: 'Learning & Skills', icon: '📚', color: 'from-purple-600 to-purple-400' },
  { id: 'mindfulness', label: 'Mind & Wellbeing', icon: '🧘', color: 'from-indigo-600 to-indigo-400' },
]

const plantTypes = {
  career: 'oak',
  health: 'bamboo',
  relationships: 'rose',
  learning: 'pine',
  mindfulness: 'lily',
}

const placeholders = {
  career: { metric: 'Emails sent to investors', unit: 'emails', goal: '10' },
  health: { metric: 'Minutes exercising', unit: 'minutes', goal: '30' },
  relationships: { metric: 'Minutes calling family', unit: 'minutes', goal: '15' },
  learning: { metric: 'Pages read', unit: 'pages', goal: '20' },
  mindfulness: { metric: 'Minutes meditating', unit: 'minutes', goal: '10' },
}

export default function Onboarding({ userId }: { userId: string }) {
  const [step, setStep] = useState<Step>('categories')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [configs, setConfigs] = useState<Record<string, CategoryConfig>>({})
  const [currentConfigIndex, setCurrentConfigIndex] = useState(0)
  
  const router = useRouter()
  const supabase = createClient()

  const toggleCategory = (catId: string) => {
  if (selectedCategories.includes(catId)) {
    setSelectedCategories(selectedCategories.filter(c => c !== catId))
    const newConfigs = { ...configs }
    delete newConfigs[catId]
    setConfigs(newConfigs)
  } else {
    if (selectedCategories.length >= 5) return // Max 5 categories
    setSelectedCategories([...selectedCategories, catId])
    // Initialize config immediately when category is selected
    setConfigs({
      ...configs,
      [catId]: { metricName: '', unit: '', goal: '' }
    })
  }
}
  // const toggleCategory = (catId: string) => {
  //   if (selectedCategories.includes(catId)) {
  //     setSelectedCategories(selectedCategories.filter(c => c !== catId))
  //     const newConfigs = { ...configs }
  //     delete newConfigs[catId]
  //     setConfigs(newConfigs)
  //   } else {
  //     if (selectedCategories.length >= 5) return // Max 5 categories
  //     setSelectedCategories([...selectedCategories, catId])
  //   }
  // }

  const handleContinueToMetrics = () => {
    if (selectedCategories.length === 0) return
    setStep('metrics')
  }

  const updateConfig = (catId: string, field: keyof CategoryConfig, value: string) => {
    setConfigs({
      ...configs,
      [catId]: {
        ...configs[catId],
        [field]: value
      }
    })
  }

  const currentCategory = selectedCategories[currentConfigIndex]
  const currentConfig = configs[currentCategory] || { metricName: '', unit: '', goal: '' }
  const isLastCategory = currentConfigIndex === selectedCategories.length - 1
  const isConfigValid = currentConfig.metricName && currentConfig.unit && currentConfig.goal

  const handleNextCategory = () => {
    if (isLastCategory) {
      handleCreateGarden()
    } else {
      setCurrentConfigIndex(currentConfigIndex + 1)
    }
  }

  const handlePrevCategory = () => {
    setCurrentConfigIndex(Math.max(0, currentConfigIndex - 1))
  }

  const handleCreateGarden = async () => {
  setStep('creating')

  try {
    // Check if user already has plants (from a previous failed attempt)
    const { data: existingPlants } = await supabase
      .from('user_plants')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (existingPlants && existingPlants.length > 0) {
      // User already has plants, just mark onboarding complete
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId)

      if (profileError) {
        console.error('Profile update error:', profileError)
        throw new Error(`Failed to complete onboarding: ${profileError.message}`)
      }

      router.refresh()
      return
    }

    // Create all metrics, plants, and rules
    for (const catId of selectedCategories) {
      const config = configs[catId]
      if (!config || !config.metricName || !config.unit || !config.goal) continue

      const metricId = config.metricName.toLowerCase().replace(/\s+/g, '_')

      // 1. Create custom metric
      const { error: metricError } = await supabase
        .from('user_custom_metrics')
        .insert({
          user_id: userId,
          metric_id: metricId,
          name: config.metricName,
          unit: config.unit,
          category: catId,
          default_goal: parseFloat(config.goal)
        })

      if (metricError && metricError.code !== '23505') { // Ignore unique constraint violations
        console.error('Metric creation error:', metricError)
        throw new Error(`Failed to create metric: ${metricError.message}`)
      }

      // 2. Create plant
      const plantName = `${config.metricName} ${plantTypes[catId as keyof typeof plantTypes]}`
      
      const { data: plant, error: plantError } = await supabase
        .from('user_plants')
        .insert({
          user_id: userId,
          name: plantName,
          plant_type: plantTypes[catId as keyof typeof plantTypes],
          category: catId,
          current_level: 0,
          position_x: selectedCategories.indexOf(catId) * 100,
          position_y: 0
        })
        .select()
        .single()

      if (plantError) {
        console.error('Plant creation error:', plantError)
        throw new Error(`Failed to create plant: ${plantError.message}`)
      }

      // 3. Create growth rule
      if (plant) {
        const { error: ruleError } = await supabase
          .from('plant_growth_rules')
          .insert({
            plant_id: plant.id,
            user_id: userId,
            metric_id: metricId,
            condition_type: 'gte',
            condition_value: parseFloat(config.goal),
            growth_amount: 10,
            decay_per_day: 5
          })

        if (ruleError) {
          console.error('Rule creation error:', ruleError)
          throw new Error(`Failed to create growth rule: ${ruleError.message}`)
        }
      }
    }

    // 4. Mark onboarding complete
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      throw new Error(`Failed to complete onboarding: ${profileError.message}`)
    }

    // 5. Refresh and show the garden
    router.refresh()
    
  } catch (error) {
    console.error('Onboarding error:', error)
    setStep('metrics')
    setCurrentConfigIndex(0)
    alert(`Error: ${error instanceof Error ? error.message : 'Something went wrong'}. Check console for details.`)
  }
}

  // const handleCreateGarden = async () => {
  //   setStep('creating')

  //   try {
  //     // Create all metrics, plants, and rules
  //     for (const catId of selectedCategories) {
  //       const config = configs[catId]
  //       if (!config || !config.metricName || !config.unit || !config.goal) continue

  //       const metricId = config.metricName.toLowerCase().replace(/\s+/g, '_')

  //       // 1. Create custom metric
  //       await supabase
  //         .from('user_custom_metrics')
  //         .insert({
  //           user_id: userId,
  //           metric_id: metricId,
  //           name: config.metricName,
  //           unit: config.unit,
  //           category: catId,
  //           default_goal: parseFloat(config.goal)
  //         })

  //       // 2. Create plant
  //       const plantName = `${config.metricName} ${plantTypes[catId as keyof typeof plantTypes]}`
        
  //       const { data: plant } = await supabase
  //         .from('user_plants')
  //         .insert({
  //           user_id: userId,
  //           name: plantName,
  //           plant_type: plantTypes[catId as keyof typeof plantTypes],
  //           category: catId,
  //           current_level: 0,
  //           position_x: selectedCategories.indexOf(catId) * 100,
  //           position_y: 0
  //         })
  //         .select()
  //         .single()

  //       // 3. Create growth rule
  //       if (plant) {
  //         await supabase
  //           .from('plant_growth_rules')
  //           .insert({
  //             plant_id: plant.id,
  //             user_id: userId,
  //             metric_id: metricId,
  //             condition_type: 'gte',
  //             condition_value: parseFloat(config.goal),
  //             growth_amount: 10,
  //             decay_per_day: 5
  //           })
  //       }
  //     }

  //     // 4. Mark onboarding complete
  //     await supabase
  //       .from('profiles')
  //       .update({ onboarding_completed: true })
  //       .eq('id', userId)

  //     router.refresh()
      
  //   } catch (error) {
  //     console.error('Onboarding error:', error)
  //     setStep('metrics')
  //     setCurrentConfigIndex(0)
  //     alert(`Error: ${error instanceof Error ? error.message : 'Something went wrong'}. Check console for details.`)
  //     // alert('Something went wrong. Please try again.')
  //   }
  // }

  return (
    <div className="min-h-screen bg-[#0f1a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🌿</div>
          <h1 className="text-4xl font-bold text-white mb-2">Welcome to Grove</h1>
          <p className="text-green-400/60">Let's plant your first seeds</p>
        </div>

        {/* Step 1: Select Categories */}
        {step === 'categories' && (
          <div>
            <h2 className="text-white text-xl font-semibold mb-2 text-center">
              What areas of life do you want to improve?
            </h2>
            <p className="text-green-400/40 text-sm text-center mb-2">
              Select 1-5 areas to start
            </p>
            <p className="text-green-500/60 text-xs text-center mb-8">
              {selectedCategories.length} selected
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {categories.map(cat => {
                const isSelected = selectedCategories.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`group relative overflow-hidden border rounded-2xl p-6 text-left transition-all ${
                      isSelected 
                        ? 'bg-[#1a2e1a] border-green-500/50 scale-105' 
                        : 'bg-[#1a2e1a] border-green-900/40 hover:border-green-500/30 hover:scale-102'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-linear-to-br ${cat.color} opacity-0 ${isSelected ? 'opacity-20' : 'group-hover:opacity-10'} transition-opacity`}></div>
                    <div className="relative flex items-start justify-between">
                      <div>
                        <div className="text-4xl mb-3">{cat.icon}</div>
                        <div className="text-white font-medium">{cat.label}</div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'border-green-500 bg-green-500' 
                          : 'border-green-900'
                      }`}>
                        {isSelected && <span className="text-white text-sm">✓</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleContinueToMetrics}
              disabled={selectedCategories.length === 0}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Continue with {selectedCategories.length} {selectedCategories.length === 1 ? 'area' : 'areas'}
            </button>
          </div>
        )}

        {/* Step 2: Configure Each Category */}
        {step === 'metrics' && currentCategory && (
          <div>
            {/* Progress indicator */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-green-400/60 text-sm">
                  {currentConfigIndex + 1} of {selectedCategories.length}
                </span>
                <span className="text-green-400/60 text-sm">
                  {categories.find(c => c.id === currentCategory)?.label}
                </span>
              </div>
              <div className="bg-[#0f1a0f] rounded-full h-1 overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all duration-300"
                  style={{ width: `${((currentConfigIndex + 1) / selectedCategories.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-[#1a2e1a] border border-green-900/40 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-4xl">
                  {categories.find(c => c.id === currentCategory)?.icon}
                </div>
                <h2 className="text-white text-xl font-semibold">
                  {categories.find(c => c.id === currentCategory)?.label}
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-green-300/70 text-sm block mb-2">
                    What do you want to track?
                  </label>
                  <input
                    type="text"
                    value={currentConfig.metricName}
                    onChange={e => updateConfig(currentCategory, 'metricName', e.target.value)}
                    placeholder={placeholders[currentCategory as keyof typeof placeholders]?.metric}
                    className="w-full bg-[#0f1a0f] border border-green-900/50 rounded-xl px-4 py-3 text-white placeholder-green-900 text-sm focus:outline-none focus:border-green-500/50"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-green-300/70 text-sm block mb-2">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={currentConfig.unit}
                      onChange={e => updateConfig(currentCategory, 'unit', e.target.value)}
                      placeholder={placeholders[currentCategory as keyof typeof placeholders]?.unit}
                      className="w-full bg-[#0f1a0f] border border-green-900/50 rounded-xl px-4 py-3 text-white placeholder-green-900 text-sm focus:outline-none focus:border-green-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-green-300/70 text-sm block mb-2">
                      Daily goal
                    </label>
                    <input
                      type="number"
                      value={currentConfig.goal}
                      onChange={e => updateConfig(currentCategory, 'goal', e.target.value)}
                      placeholder={placeholders[currentCategory as keyof typeof placeholders]?.goal}
                      className="w-full bg-[#0f1a0f] border border-green-900/50 rounded-xl px-4 py-3 text-white placeholder-green-900 text-sm focus:outline-none focus:border-green-500/50"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handlePrevCategory}
                    disabled={currentConfigIndex === 0}
                    className="flex-1 bg-[#0f1a0f] border border-green-900/50 text-green-400 font-medium py-3 rounded-xl hover:border-green-500/50 transition-colors disabled:opacity-30"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNextCategory}
                    disabled={!isConfigValid}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
                  >
                    {isLastCategory ? 'Plant my garden' : 'Next'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Creating */}
        {step === 'creating' && (
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">🌱</div>
            <p className="text-white text-lg mb-2">Planting your garden...</p>
            <p className="text-green-400/60 text-sm">
              Creating {selectedCategories.length} plants
            </p>
          </div>
        )}

      </div>
    </div>
  )
}



// 'use client'

// import { useState } from 'react'
// import { createClient } from '@/lib/supabase/client'
// import { useRouter } from 'next/navigation'

// type Step = 'category' | 'metric' | 'goal' | 'creating'

// const categories = [
//   { id: 'career', label: 'Career & Business', icon: '💼', color: 'from-blue-600 to-blue-400' },
//   { id: 'health', label: 'Health & Fitness', icon: '🏃', color: 'from-green-600 to-green-400' },
//   { id: 'relationships', label: 'Relationships', icon: '❤️', color: 'from-pink-600 to-pink-400' },
//   { id: 'learning', label: 'Learning & Skills', icon: '📚', color: 'from-purple-600 to-purple-400' },
//   { id: 'mindfulness', label: 'Mind & Wellbeing', icon: '🧘', color: 'from-indigo-600 to-indigo-400' },
// ]

// const plantTypes = {
//   career: 'oak',
//   health: 'bamboo',
//   relationships: 'rose',
//   learning: 'pine',
//   mindfulness: 'lily',
// }

// export default function Onboarding({ userId }: { userId: string }) {
//   const [step, setStep] = useState<Step>('category')
//   const [category, setCategory] = useState('')
//   const [metricName, setMetricName] = useState('')
//   const [unit, setUnit] = useState('')
//   const [goal, setGoal] = useState('')
  
//   const router = useRouter()
//   const supabase = createClient()

//   const handleCategorySelect = (cat: string) => {
//     setCategory(cat)
//     setStep('metric')
//   }

//   const handleCreateGarden = async () => {
//     setStep('creating')

//     try {
//       // 1. Create the custom metric
//       const metricId = metricName.toLowerCase().replace(/\s+/g, '_')
      
//       const { error: metricError } = await supabase
//         .from('user_custom_metrics')
//         .insert({
//           user_id: userId,
//           metric_id: metricId,
//           name: metricName,
//           unit: unit,
//           category: category,
//           default_goal: parseFloat(goal)
//         })

//       if (metricError) throw metricError

//       // 2. Create the plant
//       const plantName = `${metricName} ${plantTypes[category as keyof typeof plantTypes]}`
      
//       const { data: plant, error: plantError } = await supabase
//         .from('user_plants')
//         .insert({
//           user_id: userId,
//           name: plantName,
//           plant_type: plantTypes[category as keyof typeof plantTypes],
//           category: category,
//           current_level: 0,
//           position_x: 0,
//           position_y: 0
//         })
//         .select()
//         .single()

//       if (plantError) throw plantError

//       // 3. Create the growth rule
//       const { error: ruleError } = await supabase
//         .from('plant_growth_rules')
//         .insert({
//           plant_id: plant.id,
//           user_id: userId,
//           metric_id: metricId,
//           condition_type: 'gte',
//           condition_value: parseFloat(goal),
//           growth_amount: 10,
//           decay_per_day: 5
//         })

//       if (ruleError) throw ruleError

//       // 4. Mark onboarding as complete
//       await supabase
//         .from('profiles')
//         .update({ onboarding_completed: true })
//         .eq('id', userId)

//       // 5. Refresh and show the garden
//       router.refresh()
      
//     } catch (error) {
//       console.error('Onboarding error:', error)
//       alert('Something went wrong. Please try again.')
//       setStep('goal')
//     }
//   }

//   return (
//     <div className="min-h-screen bg-[#0f1a0f] flex items-center justify-center p-4">
//       <div className="w-full max-w-2xl">
        
//         {/* Logo */}
//         <div className="text-center mb-12">
//           <div className="text-6xl mb-4">🌿</div>
//           <h1 className="text-4xl font-bold text-white mb-2">Welcome to Grove</h1>
//           <p className="text-green-400/60">Let's plant your first seed</p>
//         </div>

//         {/* Step 1: Category */}
//         {step === 'category' && (
//           <div>
//             <h2 className="text-white text-xl font-semibold mb-2 text-center">
//               What area of life do you want to improve?
//             </h2>
//             <p className="text-green-400/40 text-sm text-center mb-8">
//               Pick one to start — you can add more later
//             </p>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {categories.map(cat => (
//                 <button
//                   key={cat.id}
//                   onClick={() => handleCategorySelect(cat.id)}
//                   className="group relative overflow-hidden bg-[rgb(26,46,26)] border border-green-900/40 rounded-2xl p-6 text-left hover:border-green-500/50 cursor-pointer transition-all hover:scale-105"
//                 >
//                   <div className={`absolute inset-0 bg-linear-to-br ${cat.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
//                   <div className="relative">
//                     <div className="text-4xl mb-3">{cat.icon}</div>
//                     <div className="text-white font-medium">{cat.label}</div>
//                   </div>
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Step 2: Define Metric */}
//         {step === 'metric' && (
//           <div className="bg-[#1a2e1a] border border-green-900/40 rounded-2xl p-8">
//             <h2 className="text-white text-xl font-semibold mb-6">
//               What specifically do you want to track?
//             </h2>

//             <div className="space-y-4">
//               <div>
//                 <label className="text-green-300/70 text-sm block mb-2">
//                   I want to track...
//                 </label>
//                 <input
//                   type="text"
//                   value={metricName}
//                   onChange={e => setMetricName(e.target.value)}
//                   placeholder="e.g. Emails sent, Pages read, Minutes running..."
//                   className="w-full bg-[#0f1a0f] border border-green-900/50 rounded-xl px-4 py-3 text-white placeholder-green-900 text-sm focus:outline-none focus:border-green-500/50"
//                   autoFocus
//                 />
//               </div>

//               <div>
//                 <label className="text-green-300/70 text-sm block mb-2">
//                   Measured in...
//                 </label>
//                 <input
//                   type="text"
//                   value={unit}
//                   onChange={e => setUnit(e.target.value)}
//                   placeholder="e.g. emails, pages, minutes, calls..."
//                   className="w-full bg-[#0f1a0f] border border-green-900/50 rounded-xl px-4 py-3 text-white placeholder-green-900 text-sm focus:outline-none focus:border-green-500/50"
//                 />
//               </div>

//               <button
//                 onClick={() => setStep('goal')}
//                 disabled={!metricName || !unit}
//                 className="w-full mt-6 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
//               >
//                 Continue
//               </button>
//             </div>
//           </div>
//         )}

//         {/* Step 3: Set Goal */}
//         {step === 'goal' && (
//           <div className="bg-[#1a2e1a] border border-green-900/40 rounded-2xl p-8">
//             <h2 className="text-white text-xl font-semibold mb-6">
//               What's your daily goal?
//             </h2>

//             <div className="space-y-4">
//               <div>
//                 <label className="text-green-300/70 text-sm block mb-2">
//                   Each day I want to achieve at least...
//                 </label>
//                 <div className="flex items-center gap-3">
//                   <input
//                     type="number"
//                     value={goal}
//                     onChange={e => setGoal(e.target.value)}
//                     placeholder="10"
//                     className="flex-1 bg-[#0f1a0f] border border-green-900/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500/50"
//                     autoFocus
//                   />
//                   <span className="text-green-400/60 text-sm">{unit}</span>
//                 </div>
//               </div>

//               <div className="bg-green-900/20 border border-green-900/40 rounded-xl p-4 text-sm text-green-300/70">
//                 <p className="mb-2">Here's how it works:</p>
//                 <ul className="space-y-1 text-xs">
//                   <li>✓ Hit {goal} {unit}? Your plant grows</li>
//                   <li>✗ Miss the goal? It wilts slightly</li>
//                   <li>🌱 Keep consistent and watch it flourish</li>
//                 </ul>
//               </div>

//               <div className="flex gap-3">
//                 <button
//                   onClick={() => setStep('metric')}
//                   className="flex-1 bg-[#0f1a0f] border border-green-900/50 text-green-400 font-medium py-3 rounded-xl hover:border-green-500/50 transition-colors"
//                 >
//                   Back
//                 </button>
//                 <button
//                   onClick={handleCreateGarden}
//                   disabled={!goal}
//                   className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
//                 >
//                   Plant my seed
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Step 4: Creating */}
//         {step === 'creating' && (
//           <div className="text-center">
//             <div className="text-6xl mb-4 animate-bounce">🌱</div>
//             <p className="text-white text-lg">Planting your first seed...</p>
//           </div>
//         )}

//       </div>
//     </div>
//   )
// }


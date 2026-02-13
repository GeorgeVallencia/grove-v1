import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Onboarding from '@/components/Onboarding'
import LogEntry from '@/components/LogEntry'
import Integrations from '@/components/Integrations'
import AddPlantButton from '@/components/AddPlantButton'
import WebhookToken from '@/components/WebhookToken'
import ChatLog from '@/components/ChatLog'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_completed) {
    return <Onboarding userId={user.id} />
  }

  const { data: plants } = await supabase
    .from('user_plants')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const { data: metrics } = await supabase
    .from('user_custom_metrics')
    .select('*')
    .eq('user_id', user.id)

  const { data: gmailIntegration } = await supabase
    .from('user_integrations')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider_id', 'gmail')
    .eq('status', 'active')
    .single()

  return (
    <div className="min-h-screen bg-[#0f1a0f] p-6">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-8">
          <h1 className="text-white text-3xl font-bold">Your Grove</h1>
          <p className="text-green-400/60 mt-1">{profile?.display_name}'s garden</p>
        </header>

        {/* Integrations */}
        <Integrations userId={user.id} hasGmail={!!gmailIntegration} />

        {/* Webhook Token */}
        <WebhookToken token={profile?.webhook_token || ''} />

        {/* Add Plant Button */}
        <div className="mb-6">
          <AddPlantButton userId={user.id} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Left Column - Logging */}
          <div className="lg:col-span-1 space-y-6">
            <ChatLog userId={user.id} />
            <LogEntry userId={user.id} metrics={metrics || []} />
          </div>

          {/* Right Column - Plants */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {plants?.map(plant => (
              <div key={plant.id} className="bg-[#1a2e1a] border border-green-900/40 rounded-2xl p-6">
                <div className="text-5xl mb-3">
                  {plant.plant_type === 'oak' && '🌳'}
                  {plant.plant_type === 'rose' && '🌹'}
                  {plant.plant_type === 'bamboo' && '🎋'}
                  {plant.plant_type === 'pine' && '🌲'}
                  {plant.plant_type === 'lily' && '🌸'}
                  {plant.plant_type === 'cactus' && '🌵'}
                  {plant.plant_type === 'sunflower' && '🌻'}
                </div>
                <h3 className="text-white font-semibold mb-2">{plant.name}</h3>
                <div className="bg-[#0f1a0f] rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-linear-to-r from-green-600 to-green-400 h-full transition-all duration-1000"
                    style={{ width: `${plant.current_level}%` }}
                  />
                </div>
                <p className="text-green-400/60 text-sm mt-2">
                  Level {Math.floor(plant.current_level)} / 100
                </p>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  )
}


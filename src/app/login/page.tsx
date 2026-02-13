'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')
  setMessage('')

  if (isSignUp) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) {
      setError(error.message)
    } else if (data.session) {
      // Email confirmation is off — session created immediately
      router.push('/dashboard')
    } else {
      // Email confirmation is on — user needs to confirm
      setMessage('Check your email for a confirmation link.')
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/dashboard')
  }

  setLoading(false)
}

  // const handleAuth = async (e: React.FormEvent) => {
  //   e.preventDefault()
  //   setLoading(true)
  //   setError('')
  //   setMessage('')

  //   if (isSignUp) {
  //     const { error } = await supabase.auth.signUp({
  //       email,
  //       password,
  //       options: {
  //         emailRedirectTo: `${window.location.origin}/auth/callback`
  //       }
  //     })
  //     if (error) setError(error.message)
  //     else setMessage('Check your email for a confirmation link.')
  //   } else {
  //     const { error } = await supabase.auth.signInWithPassword({ email, password })
  //     if (error) setError(error.message)
  //     else router.push('/dashboard')
  //   }

  //   setLoading(false)
  // }

  return (
    <div className="min-h-screen bg-[#0f1a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌿</div>
          <h1 className="text-3xl font-bold text-white">Grove</h1>
          <p className="text-green-400/60 mt-1 text-sm">
            Your life, growing.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1a2e1a] border border-green-900/40 rounded-2xl p-8">
          <h2 className="text-white font-semibold text-lg mb-6">
            {isSignUp ? 'Create your grove' : 'Welcome back'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-green-300/70 text-sm block mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#0f1a0f] border border-green-900/50 rounded-xl px-4 py-3 text-white placeholder-green-900 text-sm focus:outline-none focus:border-green-500/50 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-green-300/70 text-sm block mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#0f1a0f] border border-green-900/50 rounded-xl px-4 py-3 text-white placeholder-green-900 text-sm focus:outline-none focus:border-green-500/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">
                {error}
              </p>
            )}

            {message && (
              <p className="text-green-400 text-sm bg-green-900/20 px-4 py-2 rounded-lg">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white font-medium py-3 rounded-xl transition-colors text-sm"
            >
              {loading ? 'Loading...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-green-300/40 text-sm mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}
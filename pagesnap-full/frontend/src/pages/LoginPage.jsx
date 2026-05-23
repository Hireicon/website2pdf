import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

function AuthForm({ mode }) {
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth    = useAuthStore((s) => s.setAuth)
  const navigate   = useNavigate()
  const isRegister = mode === 'register'

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login'
      const body = isRegister ? { email, password, name } : { email, password }
      const { data } = await api.post(endpoint, body)

      setAuth(data.user, data.accessToken, data.refreshToken)
      toast.success(isRegister ? 'Account created! Welcome.' : 'Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 font-serif text-xl text-ink mb-10 justify-center">
          <span className="w-2 h-2 rounded-full bg-accent" />PageSnap
        </Link>

        <div className="bg-white border border-border rounded-xl p-8">
          <h1 className="font-serif text-2xl mb-1">{isRegister ? 'Create account' : 'Welcome back'}</h1>
          <p className="text-sm text-ink-3 mb-7">
            {isRegister ? 'Free forever for 3 conversions/day.' : 'Sign in to your account.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm text-ink-2 mb-1.5">Name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-border rounded-md px-3.5 py-2.5 text-sm bg-cream
                             outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-ink-2 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="you@example.com"
                className="w-full border border-border rounded-md px-3.5 py-2.5 text-sm bg-cream
                           outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
              />
            </div>
            <div>
              <label className="block text-sm text-ink-2 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPass(e.target.value)}
                required placeholder={isRegister ? 'At least 8 characters' : '••••••••'}
                className="w-full border border-border rounded-md px-3.5 py-2.5 text-sm bg-cream
                           outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-white font-semibold
                         text-sm py-3 rounded-md transition disabled:bg-ink-3 mt-2"
            >
              {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-3 mt-5">
            {isRegister
              ? <>Already have an account? <Link to="/login" className="text-accent hover:underline">Sign in</Link></>
              : <>No account? <Link to="/register" className="text-accent hover:underline">Sign up free</Link></>
            }
          </p>
        </div>
      </div>
    </div>
  )
}

export function LoginPage()    { return <AuthForm mode="login" /> }
export function RegisterPage() { return <AuthForm mode="register" /> }
export default LoginPage

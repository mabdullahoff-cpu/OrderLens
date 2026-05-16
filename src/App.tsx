import { useState } from 'react'
import { supabase } from './supabase'

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSignUp = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Check your email to confirm your account!')
    setLoading(false)
  }

  const handleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Logged in!')
    setLoading(false)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', background: '#0f0f0f',
      fontFamily: 'monospace'
    }}>
      <div style={{
        background: '#1a1a1a', padding: '40px', borderRadius: '12px',
        border: '1px solid #333', width: '360px', display: 'flex',
        flexDirection: 'column', gap: '12px'
      }}>
        <h1 style={{ color: '#fff', margin: 0, fontSize: '22px' }}>OrderLens</h1>
        <p style={{ color: '#888', margin: 0, fontSize: '13px' }}>Trading order flow visualizer</p>

        <input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: '8px', border: '1px solid #333',
            background: '#111', color: '#fff', fontSize: '14px', outline: 'none'
          }}
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: '8px', border: '1px solid #333',
            background: '#111', color: '#fff', fontSize: '14px', outline: 'none'
          }}
        />

        <button onClick={handleLogin} disabled={loading} style={{
          padding: '10px', borderRadius: '8px', border: 'none',
          background: '#2563eb', color: '#fff', fontSize: '14px',
          cursor: 'pointer', fontWeight: '500'
        }}>
          {loading ? 'Loading...' : 'Log in'}
        </button>

        <button onClick={handleSignUp} disabled={loading} style={{
          padding: '10px', borderRadius: '8px', border: '1px solid #333',
          background: 'transparent', color: '#aaa', fontSize: '14px',
          cursor: 'pointer'
        }}>
          Create account
        </button>

        {message && <p style={{ color: '#22c55e', fontSize: '13px', margin: 0 }}>{message}</p>}
      </div>
    </div>
  )
}
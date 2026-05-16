 import FootprintChart from './FootprintChart'
 import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

function Login() {
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

function Dashboard({ session }: { session: Session }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#0f0f0f', fontFamily: 'monospace', color: '#fff'
    }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: '48px', background: '#1a1a1a',
        borderBottom: '1px solid #333', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontWeight: '600', fontSize: '15px' }}>OrderLens</span>
          <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
            background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44'
          }}>LIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>{session.user.email}</span>
          <button onClick={handleLogout} style={{
            padding: '4px 12px', borderRadius: '6px', border: '1px solid #333',
            background: 'transparent', color: '#aaa', fontSize: '12px', cursor: 'pointer'
          }}>Logout</button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: '200px', background: '#141414', borderRight: '1px solid #333',
          padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px'
        }}>
          {['Footprint Chart', 'Volume Profile', 'CVD', 'DOM Heatmap', 'Alerts'].map(item => (
            <div key={item} style={{
              padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
              color: '#aaa', cursor: 'pointer'
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#222')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', gap: '12px'
        }}>
          <FootprintChart />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return session ? <Dashboard session={session} /> : <Login />
}
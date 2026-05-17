import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import TradingChart from './TradingChart'
import MarketWatch from './MarketWatch'
import FootprintChart from './FootprintChart'

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
      justifyContent: 'center', height: '100vh', background: '#080808',
      fontFamily: 'monospace'
    }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' }}>
          Order<span style={{ color: '#2563eb' }}>Lens</span>
        </div>
        <div style={{ fontSize: '13px', color: '#555', marginTop: '6px' }}>
          Professional order flow visualization
        </div>
      </div>
      <div style={{
        background: '#111', padding: '32px', borderRadius: '12px',
        border: '1px solid #222', width: '360px', display: 'flex',
        flexDirection: 'column', gap: '12px'
      }}>
        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: '8px', border: '1px solid #2a2a2a',
            background: '#0a0a0a', color: '#fff', fontSize: '14px', outline: 'none',
            fontFamily: 'monospace'
          }} />
        <input type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: '8px', border: '1px solid #2a2a2a',
            background: '#0a0a0a', color: '#fff', fontSize: '14px', outline: 'none',
            fontFamily: 'monospace'
          }} />
        <button onClick={handleLogin} disabled={loading} style={{
          padding: '10px', borderRadius: '8px', border: 'none',
          background: '#2563eb', color: '#fff', fontSize: '14px',
          cursor: 'pointer', fontWeight: '600', fontFamily: 'monospace'
        }}>{loading ? 'Loading...' : 'Log in'}</button>
        <button onClick={handleSignUp} disabled={loading} style={{
          padding: '10px', borderRadius: '8px', border: '1px solid #2a2a2a',
          background: 'transparent', color: '#666', fontSize: '14px',
          cursor: 'pointer', fontFamily: 'monospace'
        }}>Create account</button>
        {message && <p style={{ color: '#22c55e', fontSize: '13px', margin: 0 }}>{message}</p>}
      </div>
    </div>
  )
}

function Dashboard({ session }: { session: Session }) {
  const [activeSymbol, setActiveSymbol] = useState('AAPL')
  const [isCrypto, setIsCrypto] = useState(false)
  const [activePanel, setActivePanel] = useState<'footprint' | 'none'>('none')
  const [showMarketWatch, setShowMarketWatch] = useState(true)

  const handleLogout = async () => await supabase.auth.signOut()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#080808', fontFamily: 'monospace', color: '#fff',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: '44px', background: '#0d0d0d',
        borderBottom: '1px solid #1e1e1e', flexShrink: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.3px' }}>
            Order<span style={{ color: '#2563eb' }}>Lens</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { label: 'Market Watch', key: 'mw' },
              { label: 'Footprint', key: 'fp' },
            ].map(item => (
              <button key={item.key} onClick={() => {
                if (item.key === 'mw') setShowMarketWatch(s => !s)
                if (item.key === 'fp') setActivePanel(s => s === 'footprint' ? 'none' : 'footprint')
              }} style={{
                padding: '3px 10px', borderRadius: '4px', border: '1px solid #222',
                background: (item.key === 'mw' && showMarketWatch) || (item.key === 'fp' && activePanel === 'footprint')
                  ? '#1e3a5f' : 'transparent',
                color: (item.key === 'mw' && showMarketWatch) || (item.key === 'fp' && activePanel === 'footprint')
                  ? '#60a5fa' : '#555',
                fontSize: '11px', cursor: 'pointer'
              }}>{item.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
            background: '#052e16', color: '#22c55e', border: '1px solid #166534'
          }}>● LIVE</div>
          <span style={{ fontSize: '11px', color: '#444' }}>{session.user.email}</span>
          <button onClick={handleLogout} style={{
            padding: '3px 10px', borderRadius: '4px', border: '1px solid #222',
            background: 'transparent', color: '#555', fontSize: '11px', cursor: 'pointer'
          }}>Logout</button>
        </div>
      </div>

      {/* Main body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Market Watch sidebar */}
        {showMarketWatch && (
          <div style={{
            width: '200px', borderRight: '1px solid #1e1e1e',
            background: '#0a0a0a', flexShrink: 0, overflowY: 'auto'
          }}>
            <MarketWatch
              activeSymbol={activeSymbol}
              isCrypto={isCrypto}
              onSelect={(sym, crypto) => { setActiveSymbol(sym); setIsCrypto(crypto) }}
            />
          </div>
        )}

        {/* Chart area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Main chart */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <TradingChart
              symbol={activeSymbol}
              isCrypto={isCrypto}
              onSymbolChange={(sym, crypto) => { setActiveSymbol(sym); setIsCrypto(crypto) }}
            />
          </div>

          {/* Footprint panel */}
          {activePanel === 'footprint' && (
            <div style={{
              height: '280px', borderTop: '1px solid #1e1e1e',
              flexShrink: 0, overflow: 'hidden'
            }}>
              <FootprintChart symbol={activeSymbol} isCrypto={isCrypto} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  return session ? <Dashboard session={session} /> : <Login />
}
import { useEffect, useState } from 'react'

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 2500)
    const t2 = setTimeout(() => onDone(), 3000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.5s ease'
    }}>
      <img src="/animation.png" style={{ width: '200px', height: '200px' }} />
    </div>
  )
}
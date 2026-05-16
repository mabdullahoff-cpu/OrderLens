import CVDChart from './CVDChart'
import { useEffect, useRef } from 'react'

interface CVDPoint {
  time: string
  delta: number
  cumDelta: number
}

interface Props {
  candles: {
    time: string
    open: number
    close: number
    levels: { bidVol: number; askVol: number }[]
  }[]
}

export default function CVDChart({ candles }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || candles.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0f0f0f'
    ctx.fillRect(0, 0, W, H)

    // Compute CVD
    const points: CVDPoint[] = []
    let cumDelta = 0
    candles.forEach(candle => {
      const totalBid = candle.levels.reduce((s, l) => s + l.bidVol, 0)
      const totalAsk = candle.levels.reduce((s, l) => s + l.askVol, 0)
      const delta = totalBid - totalAsk
      cumDelta += delta
      points.push({ time: candle.time, delta, cumDelta })
    })

    const padding = { top: 10, bottom: 24, left: 50, right: 10 }
    const chartW = W - padding.left - padding.right
    const chartH = H - padding.top - padding.bottom

    const maxCum = Math.max(...points.map(p => Math.abs(p.cumDelta))) || 1
    const barW = chartW / points.length

    const toY = (val: number) =>
      padding.top + chartH / 2 - (val / maxCum) * (chartH / 2)

    // Zero line
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top + chartH / 2)
    ctx.lineTo(W - padding.right, padding.top + chartH / 2)
    ctx.stroke()

    // Bars
    points.forEach((p, i) => {
      const x = padding.left + i * barW
      const zeroY = padding.top + chartH / 2
      const barH = Math.abs(toY(p.cumDelta) - zeroY)
      ctx.fillStyle = p.cumDelta >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'
      ctx.fillRect(
        x + 2,
        p.cumDelta >= 0 ? zeroY - barH : zeroY,
        barW - 4,
        barH || 2
      )

      // Time label
      ctx.fillStyle = '#444'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(p.time, x + barW / 2, H - 6)
    })

    // CVD line
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    points.forEach((p, i) => {
      const x = padding.left + i * barW + barW / 2
      const y = toY(p.cumDelta)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Y axis labels
    ctx.fillStyle = '#555'
    ctx.font = '9px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`+${maxCum.toFixed(0)}`, padding.left - 4, padding.top + 10)
    ctx.fillText('0', padding.left - 4, padding.top + chartH / 2 + 3)
    ctx.fillText(`-${maxCum.toFixed(0)}`, padding.left - 4, padding.top + chartH - 4)

  }, [candles])

  return (
    <div style={{ borderTop: '1px solid #222' }}>
      <div style={{
        padding: '4px 12px', fontSize: '10px',
        color: '#555', letterSpacing: '0.08em'
      }}>
        CUMULATIVE VOLUME DELTA (CVD)
      </div>
      <canvas
        ref={canvasRef}
        width={900}
        height={120}
        style={{ width: '100%', height: '120px', display: 'block' }}
    
      /><CVDChart candles={candles} />
    </div>
  )
}
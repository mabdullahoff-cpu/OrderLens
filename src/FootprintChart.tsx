import { useEffect, useRef } from 'react'

interface FootprintCandle {
  time: string
  open: number
  high: number
  low: number
  close: number
  levels: {
    price: number
    bidVol: number
    askVol: number
  }[]
}

function generateMockCandle(basePrice: number, time: string): FootprintCandle {
  const open = basePrice + (Math.random() - 0.5) * 4
  const close = open + (Math.random() - 0.5) * 6
  const high = Math.max(open, close) + Math.random() * 3
  const low = Math.min(open, close) - Math.random() * 3
  const levels = []
  for (let p = Math.floor(low); p <= Math.ceil(high); p += 0.25) {
    const bidVol = Math.floor(Math.random() * 800) + 50
    const askVol = Math.floor(Math.random() * 800) + 50
    levels.push({ price: p, bidVol, askVol })
  }
  return { time, open, high, low, close, levels }
}

export default function FootprintChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const candles: FootprintCandle[] = []
  const basePrice = 5280
  for (let i = 0; i < 8; i++) {
    candles.push(generateMockCandle(basePrice + i * 2, `${9 + i}:00`))
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#0f0f0f'
    ctx.fillRect(0, 0, W, H)

    const paddingLeft = 60
    const paddingRight = 20
    const paddingTop = 20
    const paddingBottom = 40

    const allPrices = candles.flatMap(c => c.levels.map(l => l.price))
    const minPrice = Math.min(...allPrices)
    const maxPrice = Math.max(...allPrices)
    const priceRange = maxPrice - minPrice

    const chartW = W - paddingLeft - paddingRight
    const chartH = H - paddingTop - paddingBottom
    const candleWidth = chartW / candles.length
    const maxVol = Math.max(...candles.flatMap(c => c.levels.flatMap(l => [l.bidVol, l.askVol])))

    const priceToY = (price: number) =>
      paddingTop + chartH - ((price - minPrice) / priceRange) * chartH

    // Grid lines
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 5; i++) {
      const y = paddingTop + (chartH / 5) * i
      ctx.beginPath()
      ctx.moveTo(paddingLeft, y)
      ctx.lineTo(W - paddingRight, y)
      ctx.stroke()
    }

    candles.forEach((candle, i) => {
      const x = paddingLeft + i * candleWidth
      const cw = candleWidth - 4

      // Candle body
      const yOpen = priceToY(candle.open)
      const yClose = priceToY(candle.close)
      const yHigh = priceToY(candle.high)
      const yLow = priceToY(candle.low)
      const isUp = candle.close >= candle.open
      const bodyTop = Math.min(yOpen, yClose)
      const bodyH = Math.abs(yClose - yOpen) || 2

      // Wick
      ctx.strokeStyle = isUp ? '#22c55e' : '#ef4444'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + cw / 2, yHigh)
      ctx.lineTo(x + cw / 2, yLow)
      ctx.stroke()

      // Body
      ctx.fillStyle = isUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'
      ctx.strokeStyle = isUp ? '#22c55e' : '#ef4444'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.roundRect(x + 2, bodyTop, cw, bodyH, 2)
      ctx.fill()
      ctx.stroke()

      // Footprint levels
      candle.levels.forEach(level => {
        const y = priceToY(level.price)
        const levelH = (chartH / priceRange) * 0.25 - 1

        // Imbalance check (bid > ask * 3 = strong buying)
        const isImbalanceBuy = level.bidVol > level.askVol * 3
        const isImbalanceSell = level.askVol > level.bidVol * 3

        if (isImbalanceBuy) {
          ctx.fillStyle = 'rgba(34,197,94,0.2)'
          ctx.fillRect(x + 2, y - levelH, cw, levelH)
        }
        if (isImbalanceSell) {
          ctx.fillStyle = 'rgba(239,68,68,0.2)'
          ctx.fillRect(x + 2, y - levelH, cw, levelH)
        }

        // Bid volume (left, green)
        ctx.fillStyle = '#22c55e'
        ctx.font = '8px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(level.bidVol.toString(), x + 4, y - 2)

        // Ask volume (right, red)
        ctx.fillStyle = '#ef4444'
        ctx.textAlign = 'right'
        ctx.fillText(level.askVol.toString(), x + cw, y - 2)
      })

      // Time label
      ctx.fillStyle = '#555'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(candle.time, x + cw / 2, H - 10)
    })

    // Price axis
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * i
      const y = priceToY(price)
      ctx.fillStyle = '#555'
      ctx.font = '10px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(price.toFixed(2), paddingLeft - 4, y + 3)
    }

  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={500}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
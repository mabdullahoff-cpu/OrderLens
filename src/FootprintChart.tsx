import { useEffect, useRef, useState } from 'react'

interface Level {
  price: number
  bidVol: number
  askVol: number
}

interface FootprintCandle {
  time: string
  open: number
  high: number
  low: number
  close: number
  levels: Level[]
}

interface AlpacaBar {
  t: string
  o: number
  h: number
  l: number
  c: number
  v: number
}

function barToCandle(bar: AlpacaBar): FootprintCandle {
  const levels: Level[] = []
  const step = 0.25
  for (let p = Math.floor(bar.l * 4) / 4; p <= bar.h; p = Math.round((p + step) * 100) / 100) {
    const totalVol = Math.floor(bar.v / Math.ceil((bar.h - bar.l) / step + 1))
    const split = Math.random()
    levels.push({
      price: p,
      bidVol: Math.floor(totalVol * split),
      askVol: Math.floor(totalVol * (1 - split))
    })
  }
  return {
    time: new Date(bar.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    levels
  }
}

function drawChart(canvas: HTMLCanvasElement, candles: FootprintCandle[]) {
  const ctx = canvas.getContext('2d')
  if (!ctx || candles.length === 0) return
  const W = canvas.width
  const H = canvas.height
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#0f0f0f'
  ctx.fillRect(0, 0, W, H)
  const paddingLeft = 60
  const paddingRight = 20
  const paddingTop = 20
  const paddingBottom = 40
  const allPrices = candles.flatMap(c => c.levels.map(l => l.price))
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const priceRange = maxPrice - minPrice || 1
  const chartW = W - paddingLeft - paddingRight
  const chartH = H - paddingTop - paddingBottom
  const candleWidth = chartW / candles.length
  const priceToY = (price: number) =>
    paddingTop + chartH - ((price - minPrice) / priceRange) * chartH
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
    const isUp = candle.close >= candle.open
    const yOpen = priceToY(candle.open)
    const yClose = priceToY(candle.close)
    const yHigh = priceToY(candle.high)
    const yLow = priceToY(candle.low)
    const bodyTop = Math.min(yOpen, yClose)
    const bodyH = Math.abs(yClose - yOpen) || 2
    ctx.strokeStyle = isUp ? '#22c55e' : '#ef4444'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + cw / 2, yHigh)
    ctx.lineTo(x + cw / 2, yLow)
    ctx.stroke()
    ctx.fillStyle = isUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'
    ctx.strokeStyle = isUp ? '#22c55e' : '#ef4444'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.roundRect(x + 2, bodyTop, cw, bodyH, 2)
    ctx.fill()
    ctx.stroke()
    candle.levels.forEach(level => {
      const y = priceToY(level.price)
      const isImbalanceBuy = level.bidVol > level.askVol * 3
      const isImbalanceSell = level.askVol > level.bidVol * 3
      const levelH = Math.max((chartH / priceRange) * 0.25 - 1, 8)
      if (isImbalanceBuy) {
        ctx.fillStyle = 'rgba(34,197,94,0.2)'
        ctx.fillRect(x + 2, y - levelH, cw, levelH)
      }
      if (isImbalanceSell) {
        ctx.fillStyle = 'rgba(239,68,68,0.2)'
        ctx.fillRect(x + 2, y - levelH, cw, levelH)
      }
      ctx.fillStyle = '#22c55e'
      ctx.font = '8px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(level.bidVol.toString(), x + 4, y - 2)
      ctx.fillStyle = '#ef4444'
      ctx.textAlign = 'right'
      ctx.fillText(level.askVol.toString(), x + cw, y - 2)
    })
    ctx.fillStyle = '#555'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(candle.time, x + cw / 2, H - 10)
  })
  for (let i = 0; i <= 5; i++) {
    const price = minPrice + (priceRange / 5) * i
    const y = priceToY(price)
    ctx.fillStyle = '#555'
    ctx.font = '10px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(price.toFixed(2), paddingLeft - 4, y + 3)
  }
}

function CVDChart({ candles }: { candles: FootprintCandle[] }) {
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
    let cumDelta = 0
    const points = candles.map(candle => {
      const totalBid = candle.levels.reduce((s, l) => s + l.bidVol, 0)
      const totalAsk = candle.levels.reduce((s, l) => s + l.askVol, 0)
      cumDelta += totalBid - totalAsk
      return { time: candle.time, cumDelta }
    })
    const padding = { top: 10, bottom: 24, left: 50, right: 10 }
    const chartW = W - padding.left - padding.right
    const chartH = H - padding.top - padding.bottom
    const maxCum = Math.max(...points.map(p => Math.abs(p.cumDelta))) || 1
    const barW = chartW / points.length
    const toY = (val: number) =>
      padding.top + chartH / 2 - (val / maxCum) * (chartH / 2)
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top + chartH / 2)
    ctx.lineTo(W - padding.right, padding.top + chartH / 2)
    ctx.stroke()
    points.forEach((p, i) => {
      const x = padding.left + i * barW
      const zeroY = padding.top + chartH / 2
      const barH = Math.abs(toY(p.cumDelta) - zeroY)
      ctx.fillStyle = p.cumDelta >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'
      ctx.fillRect(x + 2, p.cumDelta >= 0 ? zeroY - barH : zeroY, barW - 4, barH || 2)
      ctx.fillStyle = '#444'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(p.time, x + barW / 2, H - 6)
    })
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    points.forEach((p, i) => {
      const x = padding.left + i * barW + barW / 2
      const y = toY(p.cumDelta)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  }, [candles])
  return (
    <div style={{ borderTop: '1px solid #222' }}>
      <div style={{ padding: '4px 12px', fontSize: '10px', color: '#555', letterSpacing: '0.08em' }}>
        CUMULATIVE VOLUME DELTA (CVD)
      </div>
      <canvas ref={canvasRef} width={900} height={120}
        style={{ width: '100%', height: '120px', display: 'block' }} />
    </div>
  )
}
function VolumeProfile({ candles }: { candles: FootprintCandle[] }) {
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

    // Aggregate volume per price level across all candles
    const volMap = new Map<number, number>()
    candles.forEach(candle => {
      candle.levels.forEach(level => {
        const p = Math.round(level.price * 4) / 4
        volMap.set(p, (volMap.get(p) || 0) + level.bidVol + level.askVol)
      })
    })

    const entries = Array.from(volMap.entries()).sort((a, b) => a[0] - b[0])
    if (entries.length === 0) return

    const maxVol = Math.max(...entries.map(e => e[1]))
    const minPrice = entries[0][0]
    const maxPrice = entries[entries.length - 1][0]
    const priceRange = maxPrice - minPrice || 1

    const padding = { top: 10, bottom: 30, left: 55, right: 10 }
    const chartH = H - padding.top - padding.bottom
    const chartW = W - padding.left - padding.right

    const pocPrice = entries.reduce((a, b) => b[1] > a[1] ? b : a)[0]

    entries.forEach(([price, vol]) => {
      const y = padding.top + chartH - ((price - minPrice) / priceRange) * chartH
      const barW = (vol / maxVol) * chartW
      const isPOC = price === pocPrice

      ctx.fillStyle = isPOC ? 'rgba(250,199,117,0.8)' : 'rgba(99,153,220,0.5)'
      ctx.fillRect(padding.left, y - 3, barW, 5)

      if (isPOC) {
        ctx.strokeStyle = 'rgba(250,199,117,0.4)'
        ctx.lineWidth = 0.5
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(W - padding.right, y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    })

    // Price axis
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * i
      const y = padding.top + chartH - (i / 5) * chartH
      ctx.fillStyle = '#555'
      ctx.font = '9px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(price.toFixed(2), padding.left - 4, y + 3)
    }

    // POC label
    const pocY = padding.top + chartH - ((pocPrice - minPrice) / priceRange) * chartH
    ctx.fillStyle = '#f59e0b'
    ctx.font = '9px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`POC ${pocPrice.toFixed(2)}`, padding.left + 4, pocY - 5)

  }, [candles])

  return (
    <div style={{ borderTop: '1px solid #222' }}>
      <div style={{ padding: '4px 12px', fontSize: '10px', color: '#555', letterSpacing: '0.08em' }}>
        VOLUME PROFILE — POC highlighted in yellow
      </div>
      <canvas ref={canvasRef} width={900} height={160}
        style={{ width: '100%', height: '160px', display: 'block' }} />
    </div>
  )
}
export default function FootprintChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [candles, setCandles] = useState<FootprintCandle[]>([])
  const [symbol, setSymbol] = useState('AAPL')
  const [status, setStatus] = useState('Loading...')
  const [isCrypto, setIsCrypto] = useState(false)

  const fetchBars = async (sym: string) => {
    setStatus('Loading...')
    try {
      const end = new Date()
      const start = new Date(end.getTime() - 35 * 60 * 1000)
      const url = isCrypto
  ? `https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=${sym}&timeframe=1Min&start=${start.toISOString()}&end=${end.toISOString()}&limit=30`
  : `https://data.alpaca.markets/v2/stocks/${sym}/bars?timeframe=1Min&start=${start.toISOString()}&end=${end.toISOString()}&limit=30`
      const res = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': import.meta.env.VITE_ALPACA_KEY,
          'APCA-API-SECRET-KEY': import.meta.env.VITE_ALPACA_SECRET,
        }
      })
       
      const data = await res.json()
      const bars = isCrypto ? data.bars?.[sym] : data.bars
      if (bars && bars.length > 0) {
        setCandles(bars.map(barToCandle))
        setStatus(`${sym} — ${bars.length} candles loaded`)
      } else {
        setStatus('No data — market may be closed, showing mock data')
        loadMock()
      }
    } catch {
      setStatus('Error fetching data — showing mock data')
      loadMock()
    }
  }

  const loadMock = () => {
    const mock: FootprintCandle[] = []
    let price = 180
    for (let i = 0; i < 8; i++) {
      price += (Math.random() - 0.5) * 3
      const open = price
      const close = price + (Math.random() - 0.5) * 4
      const high = Math.max(open, close) + Math.random() * 2
      const low = Math.min(open, close) - Math.random() * 2
      const levels: Level[] = []
      for (let p = Math.floor(low * 4) / 4; p <= high; p = Math.round((p + 0.25) * 100) / 100) {
        levels.push({
          price: p,
          bidVol: Math.floor(Math.random() * 600) + 50,
          askVol: Math.floor(Math.random() * 600) + 50
        })
      }
      mock.push({ time: `${9 + i}:00`, open, high, low, close, levels })
    }
    setCandles(mock)
  }

  useEffect(() => {
    fetchBars(symbol)
    const interval = setInterval(() => fetchBars(symbol), 30000)
    return () => clearInterval(interval)
  }, [symbol, isCrypto])

  useEffect(() => {
    if (canvasRef.current && candles.length > 0) {
      drawChart(canvasRef.current, candles)
    }
  }, [candles])

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
     <div style={{ borderBottom: '1px solid #222', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#555' }}>STOCKS</span>
          {['AAPL', 'TSLA', 'SPY', 'QQQ', 'NVDA'].map(s => (
            <button key={s} onClick={() => { setSymbol(s); setIsCrypto(false) }} style={{
              padding: '3px 10px', borderRadius: '6px', border: '1px solid',
              borderColor: symbol === s && !isCrypto ? '#2563eb' : '#333',
              background: symbol === s && !isCrypto ? '#2563eb22' : 'transparent',
              color: symbol === s && !isCrypto ? '#60a5fa' : '#666',
              fontSize: '12px', cursor: 'pointer'
            }}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#555' }}>CRYPTO</span>
          {['BTC/USD', 'ETH/USD', 'SOL/USD'].map(s => (
            <button key={s} onClick={() => { setSymbol(s); setIsCrypto(true) }} style={{
              padding: '3px 10px', borderRadius: '6px', border: '1px solid',
              borderColor: symbol === s && isCrypto ? '#f59e0b' : '#333',
              background: symbol === s && isCrypto ? '#f59e0b22' : 'transparent',
              color: symbol === s && isCrypto ? '#fbbf24' : '#666',
              fontSize: '12px', cursor: 'pointer'
            }}>{s}</button>
          ))}
          <span style={{ fontSize: '11px', color: '#444', marginLeft: 'auto' }}>{status}</span>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <canvas ref={canvasRef} width={900} height={500}
          style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
       <CVDChart candles={candles} />
<VolumeProfile candles={candles} />
    </div>
  )
}
import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts'

interface AlpacaBar {
  t: string
  o: number
  h: number
  l: number
  c: number
  v: number
}

interface Props {
  symbol: string
  isCrypto: boolean
  onSymbolChange: (symbol: string, isCrypto: boolean) => void
}

export default function TradingChart({ symbol, isCrypto, onSymbolChange }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const vwapSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const footprintDataRef = useRef<Map<number, {bidVol: number, askVol: number}[]>>(new Map())
 const anchoredVwapRef = useRef<any>(null)
  const barsDataRef = useRef<any[]>([])
  const [timeframe, setTimeframe] = useState('1Min')
  const [status, setStatus] = useState('Loading...')

  // Chart settings state
  const [settings, setSettings] = useState({
    showVwap: true,
    showVolume: true,
    upColor: '#a855f7',
    downColor: '#22c55e',
    background: '#0f0f0f',
    wickUpColor: '#a855f7',
    wickDownColor: '#22c55e',
  })
  const [showSettings, setShowSettings] = useState(false)

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: settings.background },
        textColor: '#666',
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      crosshair: {
        vertLine: { color: '#444', labelBackgroundColor: '#222' },
        horzLine: { color: '#444', labelBackgroundColor: '#222' },
      },
      rightPriceScale: {
        borderColor: '#222',
        textColor: '#666',
      },
      timeScale: {
        borderColor: '#222',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: settings.upColor,
      downColor: settings.downColor,
      borderUpColor: settings.upColor,
      borderDownColor: settings.downColor,
      wickUpColor: settings.wickUpColor,
      wickDownColor: settings.wickDownColor,
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    const vwapSeries = chart.addSeries(LineSeries, {
      color: '#a78bfa',
      lineWidth: 1,
      lineStyle: 1,
      title: 'VWAP',
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    vwapSeriesRef.current = vwapSeries
    volumeSeriesRef.current = volumeSeries

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
        drawFootprintOverlay()
      }
    }
    window.addEventListener('resize', handleResize)

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      drawFootprintOverlay()
    })chart.subscribeClick((param) => {
      if (!param.time || !param.point) return
      try {
        const clickTime = param.time as number
        if (anchoredVwapRef.current) {
          chart.removeSeries(anchoredVwapRef.current)
          anchoredVwapRef.current = null
        }
        const avwapSeries = chart.addSeries(LineSeries, {
          color: '#f59e0b',
          lineWidth: 1,
          lineStyle: 2,
          title: 'AVWAP',
        })
        anchoredVwapRef.current = avwapSeries
        const bars = barsDataRef.current
        const anchorIndex = bars.findIndex((b: any) => b.time >= clickTime)
        if (anchorIndex === -1) return
        let cumVolPrice = 0
        let cumVol = 0
        const avwapData = bars.slice(anchorIndex).map((b: any) => {
          const typical = (b.high + b.low + b.close) / 3
          cumVolPrice += typical * b.volume
          cumVol += b.volume
          return {
            time: b.time as any,
            value: cumVol > 0 ? cumVolPrice / cumVol : typical
          }
        })
        avwapSeries.setData(avwapData)
      } catch (e) {
        console.error('AVWAP error:', e)
      }
    })
const drawFootprintOverlay = () => {
    const canvas = overlayRef.current
    const chart = chartRef.current
    const series = candleSeriesRef.current
    if (!canvas || !chart || !series) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)

    const timeScale = chart.timeScale()
    const bars = series.data() as any[]
    if (!bars || bars.length < 2) return

    // Detect candle width from two consecutive bars
    const x0 = timeScale.timeToCoordinate(bars[bars.length - 2].time)
    const x1 = timeScale.timeToCoordinate(bars[bars.length - 1].time)
    if (x0 === null || x1 === null) return
    const candleSpacing = Math.abs(x1 - x0)
    const halfWidth = Math.max(4, candleSpacing * 0.35)
    if (candleSpacing < 40) return

    bars.slice(-20).forEach((bar: any) => {
      try {
        const x = timeScale.timeToCoordinate(bar.time)
        const yHigh = series.priceToCoordinate(bar.high)
        const yLow = series.priceToCoordinate(bar.low)
        if (x === null || yHigh === null || yLow === null) return

        const barHeight = Math.abs(yLow - yHigh)
        const priceRange = bar.high - bar.low
        if (barHeight < 20 || priceRange === 0) return

        const levels = 4
        const levelHeight = barHeight / levels
        const fontSize = Math.min(9, Math.max(6, levelHeight - 2))

        for (let i = 0; i < levels; i++) {
          const y = yHigh + i * levelHeight
          const fpLevels = footprintDataRef.current.get(bar.time)
          const bidVol = fpLevels?.[i]?.bidVol ?? Math.floor(Math.random() * 500) + 50
          const askVol = fpLevels?.[i]?.askVol ?? Math.floor(Math.random() * 500) + 50
          const isImbalance = bidVol > askVol * 2.5 || askVol > bidVol * 2.5

          if (isImbalance) {
            ctx.fillStyle = bidVol > askVol ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
            ctx.fillRect(x - halfWidth, y, halfWidth * 2, levelHeight - 1)
          }

          ctx.font = `${fontSize}px monospace`

          // Bid on left half
          ctx.textAlign = 'right'
          ctx.fillStyle = 'rgba(34,197,94,0.9)'
          ctx.fillText(bidVol.toString(), x - 2, y + levelHeight / 2 + 3)

          // Ask on right half
          ctx.textAlign = 'left'
          ctx.fillStyle = 'rgba(239,68,68,0.9)'
          ctx.fillText(askVol.toString(), x + 2, y + levelHeight / 2 + 3)
        }
      } catch {}
    })
  }
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [])

  // Update chart colors when settings change
  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: settings.background },
      },
    })
    candleSeriesRef.current?.applyOptions({
      upColor: settings.upColor,
      downColor: settings.downColor,
      borderUpColor: settings.upColor,
      borderDownColor: settings.downColor,
      wickUpColor: settings.wickUpColor,
      wickDownColor: settings.wickDownColor,
    })
  }, [settings])

  // Fetch data
 const fetchBars = async (sym: string) => {
    setStatus('Loading...')
    try {
      let allBars: AlpacaBar[] = []
      let nextPageToken: string | null = null
      const end = new Date()
      const lookback = timeframe === '1Min' ? 2 * 24 * 60 * 60 * 1000
        : timeframe === '5Min' ? 7 * 24 * 60 * 60 * 1000
        : timeframe === '15Min' ? 14 * 24 * 60 * 60 * 1000
        : 60 * 24 * 60 * 60 * 1000 // 1h = 60 days
      const start = new Date(end.getTime() - lookback)

      const maxPages = timeframe === '1Min' ? 3 : timeframe === '5Min' ? 5 : 10
      for (let page = 0; page < maxPages; page++) {
        const baseUrl = isCrypto
          ? `https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=${sym}&timeframe=${timeframe}&start=${start.toISOString()}&end=${end.toISOString()}&limit=1000`
          : `https://data.alpaca.markets/v2/stocks/${sym}/bars?timeframe=${timeframe}&start=${start.toISOString()}&end=${end.toISOString()}&limit=1000`

        const url = nextPageToken ? `${baseUrl}&page_token=${nextPageToken}` : baseUrl

        const res = await fetch(url, {
          headers: {
            'APCA-API-KEY-ID': import.meta.env.VITE_ALPACA_KEY,
            'APCA-API-SECRET-KEY': import.meta.env.VITE_ALPACA_SECRET,
          }
        })
        const data = await res.json()
        const bars: AlpacaBar[] = isCrypto ? (data.bars?.[sym] || []) : (data.bars || [])
        allBars = [...allBars, ...bars]
        nextPageToken = data.next_page_token || null
        if (!nextPageToken || bars.length === 0) break
      }

      if (allBars.length > 0) {
        const candles = allBars.map(b => ({
          time: Math.floor(new Date(b.t).getTime() / 1000) as any,
          open: b.o, high: b.h, low: b.l, close: b.c
        }))
        candleSeriesRef.current?.setData(candles)

        // Store bars for footprint overlay
        barsDataRef.current = allBars.map(b => ({
          time: Math.floor(new Date(b.t).getTime() / 1000),
          open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v
        }))

        // Build footprint data
        const fpMap = new Map<number, { bidVol: number, askVol: number }[]>()
        allBars.forEach(b => {
          const time = Math.floor(new Date(b.t).getTime() / 1000)
          const numLevels = 6
          const levels = []
          for (let i = 0; i < numLevels; i++) {
            const split = 0.3 + Math.random() * 0.4
            const totalLevel = Math.floor(b.v / numLevels)
            levels.push({
              bidVol: Math.floor(totalLevel * split),
              askVol: Math.floor(totalLevel * (1 - split))
            })
          }
          fpMap.set(time, levels)
        })
        footprintDataRef.current = fpMap

        // Volume
        if (settings.showVolume) {
          const volumes = allBars.map(b => ({
            time: Math.floor(new Date(b.t).getTime() / 1000) as any,
            value: b.v,
            color: b.c >= b.o ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'
          }))
          volumeSeriesRef.current?.setData(volumes)
        }

        // VWAP
        if (settings.showVwap) {
          let cumVolPrice = 0
          let cumVol = 0
          const vwapData = allBars.map(b => {
            const typical = (b.h + b.l + b.c) / 3
            cumVolPrice += typical * b.v
            cumVol += b.v
            return {
              time: Math.floor(new Date(b.t).getTime() / 1000) as any,
              value: cumVol > 0 ? cumVolPrice / cumVol : typical
            }
          })
          vwapSeriesRef.current?.setData(vwapData)
        }

        chartRef.current?.timeScale().fitContent()
        setStatus(`${sym} — ${allBars.length} candles loaded`)
        drawFootprintOverlay()
      } else {
        setStatus('No data — market may be closed')
      }
    } catch {
      setStatus('Error loading data')
    }
  }

  useEffect(() => {
    fetchBars(symbol)
  }, [symbol, isCrypto, timeframe, settings.showVwap, settings.showVolume])

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0f0f0f' }}>

      {/* Toolbar */}
      <div style={{ borderBottom: '1px solid #222', padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 }}>

        {/* Timeframe row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#555' }}>TF</span>
          {[
            { label: '1m', value: '1Min' },
            { label: '5m', value: '5Min' },
            { label: '15m', value: '15Min' },
            { label: '1h', value: '1Hour' },
          ].map(tf => (
            <button key={tf.value} onClick={() => setTimeframe(tf.value)} style={{
              padding: '2px 8px', borderRadius: '4px', border: '1px solid',
              borderColor: timeframe === tf.value ? '#22c55e' : '#333',
              background: timeframe === tf.value ? '#22c55e22' : 'transparent',
              color: timeframe === tf.value ? '#22c55e' : '#666',
              fontSize: '11px', cursor: 'pointer'
            }}>{tf.label}</button>
          ))}

          <div style={{ width: '1px', height: '16px', background: '#333', margin: '0 4px' }} />

          {/* Toggles */}
          <button onClick={() => setSettings(s => ({ ...s, showVwap: !s.showVwap }))} style={{
            padding: '2px 8px', borderRadius: '4px', border: '1px solid',
            borderColor: settings.showVwap ? '#a78bfa' : '#333',
            background: settings.showVwap ? '#a78bfa22' : 'transparent',
            color: settings.showVwap ? '#a78bfa' : '#666',
            fontSize: '11px', cursor: 'pointer'
          }}>VWAP</button>

          <button onClick={() => setSettings(s => ({ ...s, showVolume: !s.showVolume }))} style={{
            padding: '2px 8px', borderRadius: '4px', border: '1px solid',
            borderColor: settings.showVolume ? '#60a5fa' : '#333',
            background: settings.showVolume ? '#60a5fa22' : 'transparent',
            color: settings.showVolume ? '#60a5fa' : '#666',
            fontSize: '11px', cursor: 'pointer'
          }}>VOL</button>

          <button onClick={() => setShowSettings(s => !s)} style={{
            padding: '2px 8px', borderRadius: '4px', border: '1px solid #333',
            background: showSettings ? '#333' : 'transparent',
            color: '#666', fontSize: '11px', cursor: 'pointer'
          }}>⚙ Settings</button>

          <span style={{ fontSize: '11px', color: '#444', marginLeft: 'auto' }}>{status}</span>
        </div>

        {/* Symbol row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#555' }}>STOCKS</span>
          {['AAPL', 'TSLA', 'SPY', 'QQQ', 'NVDA', 'AMZN', 'MSFT'].map(s => (
            <button key={s}onClick={() => onSymbolChange(s, false)}  style={{
              padding: '2px 8px', borderRadius: '4px', border: '1px solid',
              borderColor: symbol === s && !isCrypto ? '#2563eb' : '#333',
              background: symbol === s && !isCrypto ? '#2563eb22' : 'transparent',
              color: symbol === s && !isCrypto ? '#60a5fa' : '#666',
              fontSize: '11px', cursor: 'pointer'
            }}>{s}</button>
          ))}
          <span style={{ fontSize: '10px', color: '#555', marginLeft: '8px' }}>CRYPTO</span>
          {['BTC/USD', 'ETH/USD', 'SOL/USD'].map(s => (
            <button key={s} onClick={() => onSymbolChange(s, true)} style={{
              padding: '2px 8px', borderRadius: '4px', border: '1px solid',
              borderColor: symbol === s && isCrypto ? '#f59e0b' : '#333',
              background: symbol === s && isCrypto ? '#f59e0b22' : 'transparent',
              color: symbol === s && isCrypto ? '#fbbf24' : '#666',
              fontSize: '11px', cursor: 'pointer'
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #222',
          display: 'flex', gap: '20px', flexWrap: 'wrap', background: '#111', flexShrink: 0
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#555' }}>BULL COLOR</span>
            <input type="color" value={settings.upColor}
              onChange={e => setSettings(s => ({ ...s, upColor: e.target.value, wickUpColor: e.target.value }))}
              style={{ width: '40px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#555' }}>BEAR COLOR</span>
            <input type="color" value={settings.downColor}
              onChange={e => setSettings(s => ({ ...s, downColor: e.target.value, wickDownColor: e.target.value }))}
              style={{ width: '40px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#555' }}>BACKGROUND</span>
            <input type="color" value={settings.background}
              onChange={e => setSettings(s => ({ ...s, background: e.target.value }))}
              style={{ width: '40px', height: '24px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <button onClick={() => setSettings({
              showVwap: true, showVolume: true,
              upColor: '#22c55e', downColor: '#ef4444',
              background: '#0f0f0f', wickUpColor: '#22c55e', wickDownColor: '#ef4444'
            })} style={{
              padding: '4px 12px', borderRadius: '4px', border: '1px solid #333',
              background: 'transparent', color: '#666', fontSize: '11px', cursor: 'pointer'
            }}>Reset defaults</button>
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div ref={chartContainerRef} style={{ position: 'absolute', inset: 0 }} />
        <canvas
          ref={overlayRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: 2
          }}
        />
      </div>
    </div>
  )
}
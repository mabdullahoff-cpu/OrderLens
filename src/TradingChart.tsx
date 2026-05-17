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

 
  const [timeframe, setTimeframe] = useState('1Min')
  const [status, setStatus] = useState('Loading...')

  // Chart settings state
  const [settings, setSettings] = useState({
    showVwap: true,
    showVolume: true,
    upColor: '#22c55e',
    downColor: '#ef4444',
    background: '#0f0f0f',
    wickUpColor: '#22c55e',
    wickDownColor: '#ef4444',
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
      }
    }
    window.addEventListener('resize', handleResize)

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
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days back

      // Fetch up to 10 pages (10,000 candles)
      for (let page = 0; page < 10; page++) {
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
        // Candles
        const candles = allBars.map(b => ({
          time: Math.floor(new Date(b.t).getTime() / 1000) as any,
          open: b.o, high: b.h, low: b.l, close: b.c
        }))
        candleSeriesRef.current?.setData(candles)

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
      } else {
        setStatus('No data — market may be closed')
      }
    } catch {
      setStatus('Error loading data')
    }
  }

  useEffect(() => {
    fetchBars(symbol)
    const interval = setInterval(() => fetchBars(symbol), 30000)
    return () => clearInterval(interval)
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
      <div ref={chartContainerRef} style={{ flex: 1 }} />
    </div>
  )
}
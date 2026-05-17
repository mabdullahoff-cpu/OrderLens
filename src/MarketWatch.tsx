interface Props {
  activeSymbol: string
  isCrypto: boolean
  onSelect: (symbol: string, isCrypto: boolean) => void
}

const STOCKS = ['AAPL', 'TSLA', 'SPY', 'QQQ', 'NVDA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'AMD']
const CRYPTO = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD', 'AVAX/USD']

export default function MarketWatch({ activeSymbol, isCrypto, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '8px 12px', fontSize: '10px', color: '#555',
        letterSpacing: '0.08em', borderBottom: '1px solid #1e1e1e'
      }}>MARKET WATCH</div>

      <div style={{ padding: '6px 12px', fontSize: '10px', color: '#444' }}>STOCKS</div>
      {STOCKS.map(s => (
        <div key={s} onClick={() => onSelect(s, false)} style={{
          padding: '7px 12px', fontSize: '12px', cursor: 'pointer',
          background: activeSymbol === s && !isCrypto ? '#1e3a5f' : 'transparent',
          color: activeSymbol === s && !isCrypto ? '#60a5fa' : '#888',
          borderLeft: activeSymbol === s && !isCrypto ? '2px solid #2563eb' : '2px solid transparent',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}
          onMouseEnter={e => { if (!(activeSymbol === s && !isCrypto)) e.currentTarget.style.background = '#141414' }}
          onMouseLeave={e => { if (!(activeSymbol === s && !isCrypto)) e.currentTarget.style.background = 'transparent' }}
        >
          <span>{s}</span>
        </div>
      ))}

      <div style={{ padding: '6px 12px', fontSize: '10px', color: '#444', marginTop: '8px' }}>CRYPTO</div>
      {CRYPTO.map(s => (
        <div key={s} onClick={() => onSelect(s, true)} style={{
          padding: '7px 12px', fontSize: '12px', cursor: 'pointer',
          background: activeSymbol === s && isCrypto ? '#2d1b00' : 'transparent',
          color: activeSymbol === s && isCrypto ? '#fbbf24' : '#888',
          borderLeft: activeSymbol === s && isCrypto ? '2px solid #f59e0b' : '2px solid transparent',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}
          onMouseEnter={e => { if (!(activeSymbol === s && isCrypto)) e.currentTarget.style.background = '#141414' }}
          onMouseLeave={e => { if (!(activeSymbol === s && isCrypto)) e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{ fontSize: '11px' }}>{s}</span>
        </div>
      ))}
    </div>
  )
}
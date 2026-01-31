import { useStore } from '../../state/store'

export default function Trades() {
  const { trades } = useStore()

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Recent Trades</h2>

      <div className="grid grid-cols-3 text-xs text-gray-400 mb-2">
        <div>Price</div>
        <div className="text-right">Size</div>
        <div className="text-right">Time</div>
      </div>

      <div className="space-y-1">
        {trades.map((trade, idx) => (
          <div key={idx} className="grid grid-cols-3 text-sm py-1">
            <div className={trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>
              {Number(trade.price).toLocaleString()}
            </div>
            <div className="text-right">{Number(trade.quantity).toFixed(4)}</div>
            <div className="text-right text-gray-400 text-xs">
              {new Date(trade.created_at).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {trades.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No recent trades
        </div>
      )}
    </div>
  )
}

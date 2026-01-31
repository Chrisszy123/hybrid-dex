import { useStore } from '../../state/store'

export default function Orderbook() {
  const { orderbook, wsConnected } = useStore()

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Orderbook</h2>
        <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>

      {/* Asks (Sells) */}
      <div className="mb-6">
        <div className="grid grid-cols-3 text-xs text-gray-400 mb-2">
          <div>Price</div>
          <div className="text-right">Size</div>
          <div className="text-right">Total</div>
        </div>
        {orderbook.asks.slice(0, 10).reverse().map(([price, size], idx) => (
          <div key={idx} className="grid grid-cols-3 text-sm text-red-400 py-1">
            <div>{Number(price).toLocaleString()}</div>
            <div className="text-right">{Number(size).toFixed(4)}</div>
            <div className="text-right">{(Number(price) * Number(size)).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="border-t border-b border-gray-700 py-2 mb-6 text-center text-sm">
        Spread: {orderbook.asks[0] && orderbook.bids[0] 
          ? (Number(orderbook.asks[0][0]) - Number(orderbook.bids[0][0])).toFixed(2)
          : 'N/A'}
      </div>

      {/* Bids (Buys) */}
      <div>
        {orderbook.bids.slice(0, 10).map(([price, size], idx) => (
          <div key={idx} className="grid grid-cols-3 text-sm text-green-400 py-1">
            <div>{Number(price).toLocaleString()}</div>
            <div className="text-right">{Number(size).toFixed(4)}</div>
            <div className="text-right">{(Number(price) * Number(size)).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

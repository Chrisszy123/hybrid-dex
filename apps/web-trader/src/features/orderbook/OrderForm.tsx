import { useState } from 'react'
import { useStore } from '../../state/store'
import { ordersApi } from '../../services/api'

export default function OrderForm() {
  const { selectedMarket, connected } = useStore()
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!connected) {
      setError('Please connect your wallet first')
      return
    }

    if (!price || !quantity) {
      setError('Please fill all fields')
      return
    }

    setLoading(true)

    try {
      // Convert to wei-like units (assuming 8 decimals for this example)
      const priceInUnits = (Number(price) * 1e8).toString()
      const quantityInUnits = (Number(quantity) * 1e8).toString()

      const response = await ordersApi.create({
        market: selectedMarket,
        side,
        price: priceInUnits,
        quantity: quantityInUnits
      })

      setSuccess(`Order placed! ${response.data.trades?.length || 0} trades executed`)
      setPrice('')
      setQuantity('')
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Place Order</h2>

      {/* Side Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSide('BUY')}
          className={`flex-1 py-2 rounded ${
            side === 'BUY' ? 'bg-green-600' : 'bg-gray-700'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('SELL')}
          className={`flex-1 py-2 rounded ${
            side === 'SELL' ? 'bg-red-600' : 'bg-gray-700'
          }`}
        >
          Sell
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Price</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Quantity</label>
          <input
            type="number"
            step="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-gray-700 rounded px-3 py-2 text-white"
            placeholder="0.0000"
          />
        </div>

        <div className="text-sm text-gray-400">
          Total: {price && quantity ? (Number(price) * Number(quantity)).toFixed(2) : '0.00'}
        </div>

        {error && <div className="text-red-500 text-sm">{error}</div>}
        {success && <div className="text-green-500 text-sm">{success}</div>}

        <button
          type="submit"
          disabled={loading || !connected}
          className={`w-full py-3 rounded font-semibold ${
            side === 'BUY'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Placing...' : `Place ${side} Order`}
        </button>
      </form>
    </div>
  )
}

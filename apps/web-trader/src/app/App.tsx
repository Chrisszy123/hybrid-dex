import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '../state/store'
import { orderbookWs, tradesWs } from '../services/ws'
import Wallet from '../features/wallet'
import Orderbook from '../features/orderbook'
import OrderForm from '../features/orderbook/OrderForm'
import Trades from '../features/trades'

function App() {
  const { selectedMarket, setOrderbook, setTrades, setWsConnected } = useStore()

  useEffect(() => {
    // Connect to WebSocket streams
    orderbookWs.connect(
      `orderbook/${selectedMarket}`,
      (data) => {
        if (data.type === 'snapshot' || data.type === 'update') {
          setOrderbook(data)
        }
        setWsConnected(true)
      },
      (error) => {
        console.error('Orderbook WebSocket error:', error)
        setWsConnected(false)
      }
    )

    tradesWs.connect(
      `trades/${selectedMarket}`,
      (data) => {
        if (data.type === 'trade') {
          setTrades((prev: any) => [data.trade, ...prev].slice(0, 50))
        }
      }
    )

    // Cleanup on unmount
    return () => {
      orderbookWs.disconnect()
      tradesWs.disconnect()
    }
  }, [selectedMarket, setOrderbook, setTrades, setWsConnected])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white">
        <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Hybrid DEX</h1>
            <Wallet />
          </div>
        </nav>

        <Routes>
          <Route path="/" element={
            <div className="container mx-auto px-6 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Orderbook */}
                <div className="lg:col-span-1">
                  <Orderbook />
                </div>

                {/* Order Form */}
                <div className="lg:col-span-1">
                  <OrderForm />
                </div>

                {/* Trade History */}
                <div className="lg:col-span-1">
                  <Trades />
                </div>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App



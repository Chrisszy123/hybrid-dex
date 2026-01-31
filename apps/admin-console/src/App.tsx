import { useState, useEffect } from 'react'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
})

function App() {
  const [stats, setStats] = useState<any>(null)
  const [settlements, setSettlements] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, settlementsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/settlements'),
        api.get('/admin/users')
      ])

      setStats(statsRes.data)
      setSettlements(settlementsRes.data.settlements)
      setUsers(usersRes.data.users)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold">Admin Console</h1>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">Total Orders</h3>
            <p className="text-3xl font-bold">{stats?.totalOrders || 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">Total Trades</h3>
            <p className="text-3xl font-bold">{stats?.totalTrades || 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">Total Users</h3>
            <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">24h Volume</h3>
            <p className="text-3xl font-bold">${Number(stats?.volume24h || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Settlements */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Recent Settlements</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-3">ID</th>
                  <th className="pb-3">Market</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Quantity</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">TX Hash</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((settlement) => (
                  <tr key={settlement.id} className="border-b border-gray-700">
                    <td className="py-3">{settlement.id}</td>
                    <td className="py-3">{settlement.market}</td>
                    <td className="py-3">{settlement.price}</td>
                    <td className="py-3">{settlement.quantity}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        settlement.status === 'CONFIRMED' ? 'bg-green-600' :
                        settlement.status === 'PENDING' ? 'bg-yellow-600' :
                        'bg-gray-600'
                      }`}>
                        {settlement.status}
                      </span>
                    </td>
                    <td className="py-3 text-xs font-mono">
                      {settlement.tx_hash?.slice(0, 10)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-3">Wallet</th>
                  <th className="pb-3">Orders</th>
                  <th className="pb-3">Trades</th>
                  <th className="pb-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.wallet_address} className="border-b border-gray-700">
                    <td className="py-3 font-mono text-sm">
                      {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                    </td>
                    <td className="py-3">{user.order_count}</td>
                    <td className="py-3">{user.trade_count}</td>
                    <td className="py-3 text-sm text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App



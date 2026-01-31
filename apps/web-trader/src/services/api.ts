import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authApi = {
  getNonce: (wallet: string) =>
    api.get(`/auth/nonce/${wallet}`),
  
  login: (wallet: string, signature: string, message: string) =>
    api.post('/auth/login', { wallet, signature, message }),
  
  getProfile: () =>
    api.get('/auth/me')
}

export const ordersApi = {
  create: (order: {
    market: string
    side: 'BUY' | 'SELL'
    price: string
    quantity: string
  }) => api.post('/orders', order),
  
  getOrders: () => api.get('/orders'),
  
  getOrder: (id: string) => api.get(`/orders/${id}`),
  
  cancel: (id: string) => api.delete(`/orders/${id}`),
  
  replace: (id: string, price: string, quantity: string) =>
    api.put(`/orders/${id}`, { price, quantity })
}

export const marketsApi = {
  getMarkets: () => api.get('/markets'),
  
  getMarket: (symbol: string) => api.get(`/markets/${symbol}`),
  
  getTrades: (symbol: string, limit?: number) =>
    api.get(`/markets/${symbol}/trades`, { params: { limit } }),
  
  getOrderbook: (symbol: string) =>
    api.get(`/markets/${symbol}/orderbook`)
}

export const tradesApi = {
  getTrades: () => api.get('/trades'),
  
  getTrade: (id: string) => api.get(`/trades/${id}`)
}

export default api

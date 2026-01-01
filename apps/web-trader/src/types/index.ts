// Type definitions
export interface Order {
  id: string
  side: 'buy' | 'sell'
  price: string
  amount: string
}

export interface Trade {
  id: string
  price: string
  amount: string
  timestamp: number
}


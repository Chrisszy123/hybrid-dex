/**
 * Market Maker Bot
 * 
 * Provides continuous liquidity to the orderbook by placing buy and sell orders
 * Mimics professional market making strategies
 */

import axios from 'axios'
import { ethers } from 'ethers'
import { v4 as uuidv4 } from 'uuid'

const API_URL = process.env.API_URL || 'http://localhost:8080/api'
const MARKET = process.env.MARKET || 'BTC-USD'
const BASE_PRICE = parseInt(process.env.BASE_PRICE || '50000')
const SPREAD_BPS = parseInt(process.env.SPREAD_BPS || '10') // 10 basis points = 0.1%
const ORDER_SIZE = parseFloat(process.env.ORDER_SIZE || '0.1')
const LEVELS = parseInt(process.env.LEVELS || '5')
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL || '5000') // 5 seconds

interface Order {
  id: string
  market: string
  side: 'BUY' | 'SELL'
  price: string
  quantity: string
}

class MarketMaker {
  private api: any
  private token: string | null = null
  private activeOrders: Order[] = []
  private basePrice: number = BASE_PRICE
  private wallet: ethers.Wallet
  private walletAddress: string

  constructor() {
    // Create a deterministic wallet for the market maker
    // Using a fixed private key so it's the same wallet across restarts
    const privateKey = process.env.MM_PRIVATE_KEY || 
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' // Hardhat account #0
    
    this.wallet = new ethers.Wallet(privateKey)
    this.walletAddress = this.wallet.address

    this.api = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * Authenticate with the API Gateway using wallet signature
   */
  async authenticate() {
    try {
      console.log('Authenticating market maker...')
      console.log('Wallet:', this.walletAddress)

      // Step 1: Get nonce
      const nonceRes = await this.api.get(`/auth/nonce/${this.walletAddress}`)
      const { nonce, message } = nonceRes.data
      
      console.log('Got nonce:', nonce.slice(0, 10) + '...')

      // Step 2: Sign the message
      const signature = await this.wallet.signMessage(message)
      console.log('Signed message')

      // Step 3: Login to get JWT token
      const loginRes = await this.api.post('/auth/login', {
        wallet: this.walletAddress,
        signature,
        message
      })

      this.token = loginRes.data.token
      
      // Update axios instance to include token
      this.api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
      
      console.log('✓ Authentication successful\n')
      return true
    } catch (error: any) {
      console.error('Authentication failed:', error.response?.data || error.message)
      return false
    }
  }

  /**
   * Initialize market maker with authentication
   */
  async initialize() {
    console.log('Initializing market maker...')
    console.log('Market:', MARKET)
    console.log('Base Price:', BASE_PRICE)
    console.log('Spread:', SPREAD_BPS, 'bps')
    console.log('Levels:', LEVELS)
    console.log()

    // Authenticate with API Gateway
    const authenticated = await this.authenticate()
    if (!authenticated) {
      throw new Error('Failed to authenticate market maker')
    }
  }

  /**
   * Calculate fair price with some randomness to simulate market movement
   */
  private getFairPrice(): number {
    // Add small random walk (-0.5% to +0.5%)
    const volatility = 0.005
    const change = (Math.random() - 0.5) * 2 * volatility
    this.basePrice = this.basePrice * (1 + change)
    return this.basePrice
  }

  /**
   * Generate quotes (bid/ask) around fair price
   */
  private generateQuotes(): { bids: Order[], asks: Order[] } {
    const fairPrice = this.getFairPrice()
    const spreadAmount = fairPrice * (SPREAD_BPS / 10000)
    
    const bids: Order[] = []
    const asks: Order[] = []

    // Generate multiple price levels
    for (let i = 0; i < LEVELS; i++) {
      const levelSpread = spreadAmount * (i + 1)
      
      // Buy orders (bids)
      const bidPrice = fairPrice - levelSpread
      bids.push({
        id: `mm-bid-${i}-${Date.now()}`,
        market: MARKET,
        side: 'BUY',
        price: (bidPrice * 1e8).toFixed(0),
        quantity: ((ORDER_SIZE * (1 + i * 0.2)) * 1e8).toFixed(0)
      })

      // Sell orders (asks)
      const askPrice = fairPrice + levelSpread
      asks.push({
        id: `mm-ask-${i}-${Date.now()}`,
        market: MARKET,
        side: 'SELL',
        price: (askPrice * 1e8).toFixed(0),
        quantity: ((ORDER_SIZE * (1 + i * 0.2)) * 1e8).toFixed(0)
      })
    }

    return { bids, asks }
  }

  /**
   * Cancel all active orders
   */
  private async cancelAllOrders() {
    for (const order of this.activeOrders) {
      try {
        await this.api.delete(`/orders/${order.id}`)
        console.log(`Cancelled order: ${order.id}`)
      } catch (error: any) {
        // Order might already be filled
        if (error.response?.status !== 404) {
          console.error(`Failed to cancel order ${order.id}:`, error.message)
        }
      }
    }
    this.activeOrders = []
  }

  /**
   * Place a new order
   */
  private async placeOrder(order: Omit<Order, 'id'>): Promise<string | null> {
    try {
      const response = await this.api.post('/orders', order)
      
      const orderId = response.data.order.id
      console.log(`Placed ${order.side} order at ${Number(order.price) / 1e8} | Size: ${Number(order.quantity) / 1e8}`)
      
      if (response.data.trades && response.data.trades.length > 0) {
        console.log(`  -> ${response.data.trades.length} trades executed!`)
      }
      
      return orderId
    } catch (error: any) {
      console.error(`Failed to place order:`, error.response?.data || error.message)
      return null
    }
  }

  /**
   * Update quotes - cancel old orders and place new ones
   */
  private async updateQuotes() {
    console.log('\n--- Updating quotes ---')
    
    // Cancel existing orders
    await this.cancelAllOrders()

    // Generate new quotes
    const { bids, asks } = this.generateQuotes()

    // Place new orders
    this.activeOrders = []
    
    for (const bid of bids) {
      const orderId = await this.placeOrder(bid)
      if (orderId) {
        this.activeOrders.push({ ...bid, id: orderId })
      }
    }

    for (const ask of asks) {
      const orderId = await this.placeOrder(ask)
      if (orderId) {
        this.activeOrders.push({ ...ask, id: orderId })
      }
    }

    console.log(`Active orders: ${this.activeOrders.length}`)
    console.log('Fair price:', this.getFairPrice().toFixed(2))
  }

  /**
   * Run the market maker
   */
  async run() {
    await this.initialize()

    // Initial quote
    await this.updateQuotes()

    // Update quotes periodically
    setInterval(async () => {
      try {
        await this.updateQuotes()
      } catch (error) {
        console.error('Error updating quotes:', error)
      }
    }, UPDATE_INTERVAL)

    console.log(`\nMarket maker running... (updating every ${UPDATE_INTERVAL / 1000}s)`)
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('\nShutting down market maker...')
    await this.cancelAllOrders()
    console.log('All orders cancelled. Goodbye!')
    process.exit(0)
  }
}

// Main execution
const marketMaker = new MarketMaker()

// Handle shutdown gracefully
process.on('SIGINT', () => marketMaker.shutdown())
process.on('SIGTERM', () => marketMaker.shutdown())

// Start market maker
marketMaker.run().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

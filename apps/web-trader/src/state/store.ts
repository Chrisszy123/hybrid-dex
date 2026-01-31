import { create } from 'zustand'
import { ethers } from 'ethers'

interface AppState {
  // Wallet state
  wallet: string | null
  provider: ethers.BrowserProvider | null
  signer: ethers.Signer | null
  connected: boolean

  // Auth state
  token: string | null
  
  // Market state
  selectedMarket: string
  orderbook: {
    bids: [string, string][]
    asks: [string, string][]
  }
  trades: any[]
  
  // WebSocket state
  wsConnected: boolean

  // Actions
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  setToken: (token: string) => void
  setMarket: (market: string) => void
  setOrderbook: (orderbook: any) => void
  setTrades: (trades: any[]) => void
  setWsConnected: (connected: boolean) => void
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  wallet: null,
  provider: null,
  signer: null,
  connected: false,
  token: localStorage.getItem('auth_token'),
  selectedMarket: 'BTC-USD',
  orderbook: { bids: [], asks: [] },
  trades: [],
  wsConnected: false,

  // Connect to MetaMask/Web3 wallet
  connectWallet: async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask!')
        return
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      const wallet = accounts[0]

      set({
        provider,
        signer,
        wallet,
        connected: true
      })

      console.log('Connected to wallet:', wallet)
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  },

  disconnectWallet: () => {
    localStorage.removeItem('auth_token')
    set({
      wallet: null,
      provider: null,
      signer: null,
      connected: false,
      token: null
    })
  },

  setToken: (token: string) => {
    localStorage.setItem('auth_token', token)
    set({ token })
  },

  setMarket: (selectedMarket: string) => set({ selectedMarket }),
  
  setOrderbook: (orderbook: any) => set({ orderbook }),
  
  setTrades: (trades: any[]) => set({ trades }),
  
  setWsConnected: (wsConnected: boolean) => set({ wsConnected })
}))

// Extend window for ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

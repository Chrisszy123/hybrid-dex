const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws'

export class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(endpoint: string, onMessage: (data: any) => void, onError?: (error: any) => void) {
    const url = `${WS_URL}/${endpoint}`
    
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('WebSocket connected:', endpoint)
      this.reconnectAttempts = 0
      
      // Subscribe to updates
      this.send({ type: 'subscribe' })
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      onError?.(error)
    }

    this.ws.onclose = () => {
      console.log('WebSocket closed')
      
      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        
        setTimeout(() => {
          this.connect(endpoint, onMessage, onError)
        }, this.reconnectDelay * this.reconnectAttempts)
      }
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  ping() {
    this.send({ type: 'ping' })
  }
}

// Singleton instances
export const orderbookWs = new WebSocketService()
export const tradesWs = new WebSocketService()

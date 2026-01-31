import grpc from "@grpc/grpc-js"
import protoLoader from "@grpc/proto-loader"
import { config } from '../config/index.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load protobuf definition
const PROTO_PATH = path.join(__dirname, '../../../../engine/matching-engine/proto/exchange.proto')

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
})

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any
const MatchingEngineClient = protoDescriptor.engine.MatchingEngine

// Create gRPC client
const client = new MatchingEngineClient(
  config.engineUrl,
  grpc.credentials.createInsecure()
)

export interface Order {
  id: string
  market: string
  wallet: string
  side: 'BUY' | 'SELL'
  price: string
  quantity: string
}

export interface Trade {
  market: string
  buy_order: string
  sell_order: string
  price: string
  quantity: string
  sequence: string
}

export function submitOrder(order: Order): Promise<Trade[]> {
  return new Promise((resolve, reject) => {
    client.SubmitOrder({ order }, (err: any, response: any) => {
      if (err) {
        console.error('gRPC error:', err)
        return reject(err)
      }
      resolve(response.trades || [])
    })
  })
}

export function cancelOrder(orderId: string, market: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    client.CancelOrder({ order_id: orderId, market }, (err: any, response: any) => {
      if (err) {
        console.error('gRPC error:', err)
        return reject(err)
      }
      resolve(response.success)
    })
  })
}

export function replaceOrder(order: Order): Promise<Trade[]> {
  return new Promise((resolve, reject) => {
    client.ReplaceOrder({ order }, (err: any, response: any) => {
      if (err) {
        console.error('gRPC error:', err)
        return reject(err)
      }
      resolve(response.trades || [])
    })
  })
}
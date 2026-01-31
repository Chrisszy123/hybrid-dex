import { ethers } from 'ethers'
import { config } from '../config/index.js'
import { query } from '../db/index.js'

/**
 * Settlement Service - Orchestrates on-chain settlement of off-chain trades
 * 
 * This is the critical bridge between the fast matching engine and blockchain finality.
 * Settlement is batched for gas efficiency but must maintain strong consistency.
 */
export class SettlementService {
  private provider: ethers.JsonRpcProvider
  private settlementContract: ethers.Contract
  private signer?: ethers.Wallet

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl)
    
    // In production, this would use a hardware wallet or secure key management
    if (process.env.SETTLEMENT_PRIVATE_KEY) {
      this.signer = new ethers.Wallet(process.env.SETTLEMENT_PRIVATE_KEY, this.provider)
    }

    // Settlement contract ABI (minimal interface)
    const settlementABI = [
      'function settleTrades(bytes32[] calldata tradeIds, address[] calldata buyers, address[] calldata sellers, uint256[] calldata amounts) external',
      'function verifySettlement(bytes32 tradeId) external view returns (bool)',
      'event TradeSettled(bytes32 indexed tradeId, address indexed buyer, address indexed seller, uint256 amount)'
    ]

    this.settlementContract = new ethers.Contract(
      config.blockchain.settlementAddress || ethers.ZeroAddress,
      settlementABI,
      this.signer || this.provider
    )
  }

  /**
   * Generate deterministic trade ID for on-chain verification
   * This prevents replay attacks and ensures each trade can only be settled once
   */
  generateTradeId(trade: {
    market: string
    buy_order: string
    sell_order: string
    sequence: string
    price: string
    quantity: string
  }): string {
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'string', 'uint256', 'uint256', 'uint256'],
        [trade.market, trade.buy_order, trade.sell_order, trade.sequence, trade.price, trade.quantity]
      )
    )
  }

  /**
   * Batch settle trades on-chain
   * This amortizes gas costs across multiple trades
   */
  async batchSettleTrades(tradeIds: number[]): Promise<string> {
    if (!this.signer) {
      throw new Error('Settlement signer not configured')
    }

    // Fetch unsettled trades from database
    const result = await query(
      `SELECT id, market, buy_order, sell_order, price, quantity, sequence 
       FROM trades 
       WHERE id = ANY($1) AND settled = false`,
      [tradeIds]
    )

    if (result.rows.length === 0) {
      throw new Error('No unsettled trades found')
    }

    const trades = result.rows
    const onChainTradeIds: string[] = []
    const buyers: string[] = []
    const sellers: string[] = []
    const amounts: bigint[] = []

    for (const trade of trades) {
      const tradeId = this.generateTradeId(trade)
      onChainTradeIds.push(tradeId)

      // Look up buyer and seller wallet addresses
      const buyerResult = await query(
        'SELECT wallet FROM orders WHERE id = $1',
        [trade.buy_order]
      )
      const sellerResult = await query(
        'SELECT wallet FROM orders WHERE id = $1',
        [trade.sell_order]
      )

      buyers.push(buyerResult.rows[0]?.wallet || ethers.ZeroAddress)
      sellers.push(sellerResult.rows[0]?.wallet || ethers.ZeroAddress)
      amounts.push(BigInt(trade.price) * BigInt(trade.quantity))
    }

    // Submit settlement transaction
    const tx = await this.settlementContract.settleTrades(
      onChainTradeIds,
      buyers,
      sellers,
      amounts
    )

    console.log('Settlement transaction submitted:', tx.hash)

    // Mark as pending settlement
    await query(
      `INSERT INTO settlements (trade_id, tx_hash, status)
       SELECT unnest($1::int[]), $2, 'PENDING'`,
      [tradeIds, tx.hash]
    )

    // Wait for confirmation (in production, this would be async with monitoring)
    const receipt = await tx.wait()
    
    if (receipt?.status === 1) {
      // Mark trades as settled
      await query(
        `UPDATE trades SET settled = true, settlement_tx = $1 WHERE id = ANY($2)`,
        [tx.hash, tradeIds]
      )

      await query(
        `UPDATE settlements SET status = 'CONFIRMED', block_number = $1 WHERE tx_hash = $2`,
        [receipt.blockNumber, tx.hash]
      )
    }

    return tx.hash
  }

  /**
   * Verify settlement on-chain
   * Critical for detecting reorgs and ensuring consistency
   */
  async verifySettlement(tradeId: string): Promise<boolean> {
    try {
      return await this.settlementContract.verifySettlement(tradeId)
    } catch (error) {
      console.error('Settlement verification failed:', error)
      return false
    }
  }

  /**
   * Handle blockchain reorg
   * If a settlement transaction is reverted, we need to rollback the trade state
   */
  async handleReorg(blockNumber: number): Promise<void> {
    console.warn('Handling reorg at block:', blockNumber)

    // Find settlements that were in the reorged blocks
    const result = await query(
      `SELECT trade_id, tx_hash FROM settlements 
       WHERE block_number >= $1 AND status = 'CONFIRMED'`,
      [blockNumber]
    )

    for (const row of result.rows) {
      // Verify if transaction still exists
      try {
        const receipt = await this.provider.getTransactionReceipt(row.tx_hash)
        
        if (!receipt) {
          // Transaction was reorged out
          console.error('Settlement transaction reorged:', row.tx_hash)
          
          await query(
            `UPDATE trades SET settled = false WHERE id = $1`,
            [row.trade_id]
          )
          
          await query(
            `UPDATE settlements SET status = 'REORGED' WHERE trade_id = $1`,
            [row.trade_id]
          )
        }
      } catch (error) {
        console.error('Error checking settlement:', error)
      }
    }
  }

  /**
   * Monitor for settlement events
   * This ensures our database stays in sync with on-chain state
   */
  async startMonitoring(): Promise<void> {
    this.settlementContract.on('TradeSettled', async (tradeId, buyer, seller, amount, event) => {
      console.log('Trade settled on-chain:', {
        tradeId,
        buyer,
        seller,
        amount: amount.toString(),
        blockNumber: event.log.blockNumber
      })

      // Update database to reflect on-chain settlement
      await query(
        `UPDATE settlements SET 
         status = 'CONFIRMED',
         block_number = $1
         WHERE tx_hash = $2`,
        [event.log.blockNumber, event.log.transactionHash]
      )
    })

    console.log('Settlement monitoring started')
  }
}


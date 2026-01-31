use crate::engine::orderbook::OrderBook;
use crate::models::{order::Order, trade::Trade, side::Side, price::Price};
use uuid::Uuid;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct MatchingEngine {
    pub market: String,
    pub orderbook: OrderBook,
    pub sequence: u64,
}

impl MatchingEngine {
    pub fn new(market: &str) -> Self {
        Self {
            market: market.to_string(),
            orderbook: OrderBook::new(),
            sequence: 0,
        }
    }
    pub fn cancel(&mut self, order_id: Uuid) {
        if let Some((price, side)) = self.orderbook.index.remove(&order_id) {
            let book = if side == Side::Buy {
                &mut self.orderbook.bids
            } else {
                &mut self.orderbook.asks
            };
    
            if let Some(queue) = book.get_mut(&price) {
                queue.retain(|o| o.id != order_id);
            }
        }
    }
    pub fn replace(&mut self, order: Order) -> Vec<Trade> {
        self.cancel(order.id);
        self.submit(order)
    }    

    pub fn submit(&mut self, mut order: Order) -> Vec<Trade> {
        let mut trades = vec![];

        match order.side {
            Side::Buy => {
                while order.quantity > 0 {
                    // Get best price and check if we can match
                    let best_price = {
                        let (price, asks) = match self.orderbook.best_ask() {
                            Some(v) => v,
                            None => break,
                        };
                        
                        if order.price < *price {
                            break;
                        }
                        *price
                    };

                    // Now we can safely borrow mutably again
                    let (_, asks) = self.orderbook.best_ask().unwrap();
                    let mut resting = asks.pop_front().unwrap();
                    let qty = order.quantity.min(resting.quantity);

                    order.quantity -= qty;
                    resting.quantity -= qty;

                    // Create trade (borrow ended, so we can access self)
                    self.sequence += 1;
                    let trade = Trade {
                        market: self.market.clone(),
                        buy_order: order.id,
                        sell_order: resting.id,
                        price: best_price,
                        quantity: qty,
                        sequence: self.sequence,
                    };
                    trades.push(trade);

                    if resting.quantity > 0 {
                        asks.push_front(resting);
                    }
                }
            }

            Side::Sell => {
                while order.quantity > 0 {
                    // Get best price and check if we can match
                    let best_price = {
                        let (price, bids) = match self.orderbook.best_bid() {
                            Some(v) => v,
                            None => break,
                        };
                        
                        if order.price > *price {
                            break;
                        }
                        *price
                    };

                    // Now we can safely borrow mutably again
                    let (_, bids) = self.orderbook.best_bid().unwrap();
                    let mut resting = bids.pop_front().unwrap();
                    let qty = order.quantity.min(resting.quantity);

                    order.quantity -= qty;
                    resting.quantity -= qty;

                    // Create trade (borrow ended, so we can access self)
                    self.sequence += 1;
                    let trade = Trade {
                        market: self.market.clone(),
                        buy_order: resting.id,
                        sell_order: order.id,
                        price: best_price,
                        quantity: qty,
                        sequence: self.sequence,
                    };
                    trades.push(trade);

                    if resting.quantity > 0 {
                        bids.push_front(resting);
                    }
                }
            }
        }

        self.orderbook.cleanup();

        if order.quantity > 0 {
            self.orderbook.add(order);
        }

        trades
    }

}
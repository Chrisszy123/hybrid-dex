use crate::engine::orderbook::OrderBook;
use crate::models::{order::Order, trade::Trade, side::Side, price::Price};

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

    pub fn submit(&mut self, mut order: Order) -> Vec<Trade> {
        let mut trades = vec![];

        match order.side {
            Side::Buy => {
                while order.quantity > 0 {
                    let (best_price, asks) = match self.orderbook.best_ask() {
                        Some(v) => v,
                        None => break,
                    };

                    if order.price < *best_price {
                        break;
                    }

                    let mut resting = asks.pop_front().unwrap();
                    let qty = order.quantity.min(resting.quantity);

                    order.quantity -= qty;
                    resting.quantity -= qty;

                    trades.push(self.trade(&order, &resting, *best_price, qty));

                    if resting.quantity > 0 {
                        asks.push_front(resting);
                    }
                }
            }

            Side::Sell => {
                while order.quantity > 0 {
                    let (best_price, bids) = match self.orderbook.best_bid() {
                        Some(v) => v,
                        None => break,
                    };

                    if order.price > *best_price {
                        break;
                    }

                    let mut resting = bids.pop_front().unwrap();
                    let qty = order.quantity.min(resting.quantity);

                    order.quantity -= qty;
                    resting.quantity -= qty;

                    trades.push(self.trade(&resting, &order, *best_price, qty));

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

    fn trade(
        &mut self,
        buy: &Order,
        sell: &Order,
        price: Price,
        quantity: u64,
    ) -> Trade {
        self.sequence += 1;

        Trade {
            market: self.market.clone(),
            buy_order: buy.id,
            sell_order: sell.id,
            price,
            quantity,
            sequence: self.sequence,
        }
    }
}
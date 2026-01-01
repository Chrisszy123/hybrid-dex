use std::collections::{BTreeMap, VecDeque};
use crate::models::{order::Order, side::Side, price::Price};
use std::collections::HashMap;
use uuid::Uuid;

pub struct OrderBook {
    pub bids: BTreeMap<Price, VecDeque<Order>>,
    pub asks: BTreeMap<Price, VecDeque<Order>>,
    pub index: HashMap<Uuid, (Price, Side)>,
}
self.index.insert(order.id, (order.price, order.side));
impl OrderBook {
    pub fn new() -> Self {
        Self {
            bids: BTreeMap::new(),
            asks: BTreeMap::new(),
            index: HashMap::new(),
        }
    }

    pub fn add(&mut self, order: Order) {
        let book = match order.side {
            Side::Buy => &mut self.bids,
            Side::Sell => &mut self.asks,
        };

        book.entry(order.price)
            .or_insert_with(VecDeque::new)
            .push_back(order);
    }

    pub fn best_bid(&mut self) -> Option<(&Price, &mut VecDeque<Order>)> {
        self.bids.iter_mut().next_back()
    }

    pub fn best_ask(&mut self) -> Option<(&Price, &mut VecDeque<Order>)> {
        self.asks.iter_mut().next()
    }

    pub fn cleanup(&mut self) {
        self.bids.retain(|_, q| !q.is_empty());
        self.asks.retain(|_, q| !q.is_empty());
    }

}

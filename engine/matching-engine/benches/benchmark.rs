use criterion::{criterion_group, criterion_main, Criterion};
use uuid::Uuid;
use matching_engine::{engine::market::MarketRegistry, models::*};

fn engine_benchmark(c: &mut Criterion) {
    let mut registry = MarketRegistry::new();

    c.bench_function("submit 1000 orders", |b| {
        b.iter(|| {
            for i in 0..1000 {
                registry.submit(Order {
                    id: Uuid::new_v4(),
                    market: "ETH-USD".into(),
                    wallet: "bot".into(),
                    side: if i % 2 == 0 { Side::Buy } else { Side::Sell },
                    price: Price(2000),
                    quantity: 1,
                    timestamp: i,
                });
            }
        })
    });
}

criterion_group!(benches, engine_benchmark);
criterion_main!(benches);

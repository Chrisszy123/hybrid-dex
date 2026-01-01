use crate::models::order::Order;

pub fn validate(order: &Order) -> Result<(), &'static str> {
    if order.quantity == 0 {
        return Err("Invalid quantity");
    }
    Ok(())
}
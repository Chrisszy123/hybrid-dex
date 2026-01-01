export interface Order {
  id: string;
  side: 'buy' | 'sell';
  price: string;
  amount: string;
  timestamp: number;
}

export interface OrderRequest {
  side: 'buy' | 'sell';
  price: string;
  amount: string;
}


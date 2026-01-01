import { OrderRequest } from '@hybrid-dex/shared-types';

export class HybridDexClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async submitOrder(order: OrderRequest) {
    // Submit order logic
    return {};
  }
}


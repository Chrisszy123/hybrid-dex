export interface User {
  id: string;
  address: string;
  nonce: number;
}

export interface AuthToken {
  token: string;
  expiresAt: number;
}


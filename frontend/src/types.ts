export interface Trade {
  id: number;

  symbol: string;
  profit: number;
  volume: number;

  entry_price: number;
  exit_price: number;

  open_time: string;
  close_time: string;

  duration: number;

  trade_type: string;
  ticket: number;

  strategy: string;
  emotion: string;
  notes: string;

  account_id?: string;
  account_name?: string;
}

export interface PaginatedTradesResponse {
  trades: Trade[];
  total: number;
  limit: number;
  offset: number;
  total_pages: number;
}

export interface AccountInfo {
  account_id: string;
  account_name: string;
}

export interface AuthUser {
  id: number;
  email: string;
}

export interface ApiKeyResponse {
  api_key: string | null;
}
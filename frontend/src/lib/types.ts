// types.ts — TypeScript shapes matching the Go backend's JSON exactly.
// Field names/casing mirror the struct tags reported from backend/models/*.
// DO NOT change these to match the frontend's convenience; the backend is fixed.

export type Role = 'admin' | 'member' | 'child';

// GET /api/auth/me  -> models.User
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: Role;
  locale: string;
  created_at: number; // ms
  last_seen?: number; // ms
}

// GET /api/lists -> models.List[]
export interface List {
  id: string;
  name: string;
  type: 'group' | 'private';
  owner_id: string;
  icon: string;
  color: string;
  archived: boolean;
  created_at: number;
  updated_at: number;
  is_favorite: boolean;
}

// item rows nested in GET /api/lists/:id -> { list, items }
export interface ListItem {
  id: string;
  list_id: string;
  product_id: string | null;
  name_override: string | null;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  checked: boolean;
  checked_by: string | null;
  checked_at: number | null;
  added_by: string;
  added_at: number;
  sort_order: number;
  store_id: string | null;
  category_id: string | null;
  category_color: string | null;
  category_icon: string | null;
  display_name: string;
  preferred_store_ids: string[] | null;
}

export interface ListDetail {
  list: List;
  items: ListItem[];
}

// GET /api/categories -> Category[]
export interface Category {
  id: string;
  name_de: string;
  name_en: string;
  icon: string;
  color: string;
  sort_order?: number;
}

// GET /api/stores -> Store[]
export interface Store {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  address?: string;
  created_at: number;
}

// GET /api/products/:id -> Product
export interface Product {
  id: string;
  name_de?: string;
  name_en?: string;
  name_pt?: string;
  brand?: string;
  category_id?: string;
}

// GET /api/products/search -> Suggestion[]
export interface Suggestion {
  product_id: string;
  display_name: string;
  brand?: string;
  category?: { id: string; name_de: string; name_en: string; icon: string; color: string };
  preferred_store?: { id: string; name: string };
  score: number;
}

// ── Personal Access Tokens ──
// GET /api/tokens -> AccessToken[] ; DELETE /api/tokens/:id
export type TokenScope = 'read' | 'write';

export interface AccessToken {
  id: string;
  name: string;
  token_prefix: string; // e.g. "tem_a1b2c3d4"
  scopes: TokenScope[];
  last_used_at: number | null; // ms, null = never used
  expires_at: number | null; // ms, null = no expiry
  created_at: number; // ms
}

// POST /api/tokens -> CreatedToken (raw_token present only in this one response)
export interface CreatedToken extends AccessToken {
  raw_token: string;
}

// ── Events (POST /api/lists/:id/events ; GET .../events?since=) ──
// The client sends id/type/payload/client_ts; the server fills
// list_id/user_id/server_ts (and id if omitted).
export interface EventEnvelope {
  id: string;
  type: string;
  list_id?: string;
  user_id?: string;
  payload: Record<string, unknown>;
  client_ts: number;
  server_ts?: number;
}

export interface EventsResponse {
  events: EventEnvelope[];
}

// ── WebSocket server->client frames ──
export type WsServerMessage =
  | { type: 'hello'; conn_id: string }
  | { type: 'event'; event: EventEnvelope }
  | { type: 'presence'; user_id: string; list_id: string; active: boolean }
  | { type: 'ping' };

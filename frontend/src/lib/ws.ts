// ws.ts — WebSocket client, ported from the Svelte frontend's lib/ws.ts.
// Framework-agnostic singleton: a React hook subscribes via onMessage().
// Auth is the same `session` cookie used by REST (no ?token=). The server
// sends a `hello` frame with conn_id, which we echo as X-Conn-ID on event
// POSTs so the hub skips broadcasting our own events back to us.

import type { WsServerMessage } from './types';

// Same-origin ws:// URL (Vite proxies /ws to the backend in dev). Set
// VITE_WS_URL for cross-origin deploys — equivalent to the old PUBLIC_WS_URL.
function wsUrl(): string {
  const base = import.meta.env.VITE_WS_URL;
  if (base) return `${base}/ws`;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}

type MessageHandler = (msg: WsServerMessage) => void;

let socket: WebSocket | null = null;
let connId: string | null = null;
let reconnectDelay = 1000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const handlers = new Set<MessageHandler>();
const reconnectHandlers = new Set<() => void>();
const activeSubscriptions = new Set<string>();

/** Header identifying this connection, echoed on event POSTs to avoid self-echo. */
export function connHeaders(): Record<string, string> {
  return connId ? { 'X-Conn-ID': connId } : {};
}

function clearReconnectTimer() {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  clearReconnectTimer();
  const delay = Math.min(reconnectDelay, 30_000);
  reconnectTimer = setTimeout(connect, delay);
  reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
}

function connect() {
  clearReconnectTimer();
  if (
    socket &&
    (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)
  ) {
    return;
  }

  const ws = new WebSocket(wsUrl());
  socket = ws;

  ws.addEventListener('open', () => {
    if (socket !== ws) return;
    reconnectDelay = 1000;
    for (const listId of activeSubscriptions) {
      ws.send(JSON.stringify({ type: 'subscribe', list_id: listId }));
    }
    for (const h of reconnectHandlers) h();
  });

  ws.addEventListener('message', (e: MessageEvent<string>) => {
    let msg: WsServerMessage;
    try {
      msg = JSON.parse(e.data) as WsServerMessage;
    } catch {
      return;
    }
    if (msg.type === 'ping') {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }
    if (msg.type === 'hello') {
      connId = msg.conn_id;
      return;
    }
    for (const h of handlers) h(msg);
  });

  ws.addEventListener('close', () => {
    if (socket !== ws) return;
    socket = null;
    scheduleReconnect();
  });

  ws.addEventListener('error', () => ws.close());
}

export function subscribe(listId: string) {
  activeSubscriptions.add(listId);
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'subscribe', list_id: listId }));
  }
}

export function unsubscribe(listId: string) {
  activeSubscriptions.delete(listId);
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'unsubscribe', list_id: listId }));
  }
}

export function onMessage(handler: MessageHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function onReconnect(handler: () => void): () => void {
  reconnectHandlers.add(handler);
  return () => reconnectHandlers.delete(handler);
}

let started = false;
export function startWs() {
  if (started) {
    connect();
    return;
  }
  started = true;
  connect();
  window.addEventListener('online', () => {
    reconnectDelay = 1000;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      const old = socket;
      socket = null;
      old?.close();
      connect();
    }
  });
  window.addEventListener('offline', () => {
    clearReconnectTimer();
    const old = socket;
    socket = null;
    old?.close();
  });
}

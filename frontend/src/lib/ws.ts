import { dev } from '$app/environment';
import { PUBLIC_WS_URL } from '$env/static/public';
const WS_BASE = PUBLIC_WS_URL;

type WsMessage =
	| { type: 'event'; event: unknown }
	| { type: 'presence'; user_id: string; list_id: string; active: boolean }
	| { type: 'hello'; conn_id: string }
	| { type: 'ping' };

type MessageHandler = (msg: WsMessage) => void;

let socket: WebSocket | null = null;
// Server-assigned id for this WebSocket connection (from the 'hello' frame).
// Echoed as X-Conn-ID on event POSTs so the hub skips our own broadcast.
let connId: string | null = null;

/** Header map identifying this connection, or empty if not yet known. */
export function connHeaders(): Record<string, string> {
	return connId ? { 'X-Conn-ID': connId } : {};
}
let reconnectDelay = 1000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const handlers = new Set<MessageHandler>();
const reconnectHandlers = new Set<() => void>();
// Tracks active subscriptions so they can be re-sent after reconnect.
const activeSubscriptions = new Set<string>();

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
	// Don't open a second socket if one is already connecting or open.
	if (
		socket &&
		(socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)
	) {
		return;
	}

	const ws = new WebSocket(`${WS_BASE}/ws`);
	socket = ws;

	ws.addEventListener('open', () => {
		// Ignore if this socket has since been replaced.
		if (socket !== ws) return;
		if (dev)
			console.log(
				'[ws] open → re-subscribe',
				[...activeSubscriptions],
				'fire',
				reconnectHandlers.size,
				'handlers'
			);
		reconnectDelay = 1000;
		for (const listId of activeSubscriptions) {
			ws.send(JSON.stringify({ type: 'subscribe', list_id: listId }));
		}
		for (const h of reconnectHandlers) h();
	});

	ws.addEventListener('message', (e: MessageEvent<string>) => {
		let msg: WsMessage;
		try {
			msg = JSON.parse(e.data) as WsMessage;
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
		// Only react if this is still the current socket (avoid stale closes
		// scheduling extra reconnects).
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
	// If not yet open, the open handler will replay all activeSubscriptions.
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

export function startWs() {
	connect();

	if (typeof window !== 'undefined') {
		// A dead WebSocket often does not fire `close` when the network drops
		// (half-open socket). Drive reconnects explicitly from the browser's
		// online/offline events so onReconnect handlers run reliably.
		window.addEventListener('online', () => {
			if (dev) console.log('[ws] browser online → forcing reconnect');
			reconnectDelay = 1000;
			if (!socket || socket.readyState !== WebSocket.OPEN) {
				// Detach the old socket so its close handler is a no-op, then connect.
				const old = socket;
				socket = null;
				old?.close();
				connect();
			}
		});
		window.addEventListener('offline', () => {
			if (dev) console.log('[ws] browser offline → closing socket');
			clearReconnectTimer();
			const old = socket;
			socket = null;
			old?.close();
		});
	}
}

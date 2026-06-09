import { PUBLIC_WS_URL } from '$env/static/public';
const WS_BASE = PUBLIC_WS_URL;

type WsMessage =
	| { type: 'event';    event: unknown }
	| { type: 'presence'; user_id: string; list_id: string; active: boolean }
	| { type: 'ping' };

type MessageHandler = (msg: WsMessage) => void;

let socket: WebSocket | null = null;
let reconnectDelay = 1000;
const handlers = new Set<MessageHandler>();
const reconnectHandlers = new Set<() => void>();
// Tracks active subscriptions so they can be re-sent after reconnect.
const activeSubscriptions = new Set<string>();

function connect() {
	if (socket?.readyState === WebSocket.OPEN) return;

	socket = new WebSocket(`${WS_BASE}/ws`);

	socket.addEventListener('open', () => {
		reconnectDelay = 1000;
		// Re-subscribe to all rooms after (re)connect.
		for (const listId of activeSubscriptions) {
			socket?.send(JSON.stringify({ type: 'subscribe', list_id: listId }));
		}
		// Notify listeners so they can drain their offline queues.
		for (const h of reconnectHandlers) h();
	});

	socket.addEventListener('message', (e: MessageEvent<string>) => {
		const msg = JSON.parse(e.data) as WsMessage;
		if (msg.type === 'ping') {
			socket?.send(JSON.stringify({ type: 'pong' }));
			return;
		}
		for (const h of handlers) h(msg);
	});

	socket.addEventListener('close', () => {
		socket = null;
		setTimeout(connect, Math.min(reconnectDelay, 30_000));
		reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
	});

	socket.addEventListener('error', () => socket?.close());
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
}

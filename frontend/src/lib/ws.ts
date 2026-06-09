const WS_BASE = import.meta.env.PUBLIC_WS_URL ?? '';

type WsMessage =
	| { type: 'event';    event: unknown }
	| { type: 'presence'; user_id: string; list_id: string; active: boolean }
	| { type: 'ping' };

type MessageHandler = (msg: WsMessage) => void;

let socket: WebSocket | null = null;
let reconnectDelay = 1000;
const handlers = new Set<MessageHandler>();

function connect() {
	if (socket?.readyState === WebSocket.OPEN) return;

	socket = new WebSocket(`${WS_BASE}/ws`);

	socket.addEventListener('open', () => {
		reconnectDelay = 1000;
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
	socket?.send(JSON.stringify({ type: 'subscribe', list_id: listId }));
}

export function unsubscribe(listId: string) {
	socket?.send(JSON.stringify({ type: 'unsubscribe', list_id: listId }));
}

export function onMessage(handler: MessageHandler): () => void {
	handlers.add(handler);
	return () => handlers.delete(handler);
}

export function startWs() {
	connect();
}

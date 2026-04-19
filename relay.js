const WebSocket = require('ws');

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
const wss = new WebSocket.Server({ port: PORT });

const STORE_EVENTS = new Map();
const SUBS = new Map();
let subId = 0;

console.log(`Nostr relay running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  const clientId = `client_${++subId}`;
  console.log(`${clientId} connected`);

  ws.subs = new Set();
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleMessage(ws, msg);
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });

  ws.on('close', () => {
    console.log(`${clientId} disconnected`);
    for (const [subIdKey, client] of SUBS) {
      if (client === ws) SUBS.delete(subIdKey);
    }
  });
});

function handleMessage(ws, msg) {
  const type = msg[0];

  if (type === 'REQ') {
    const subIdKey = msg[1];
    const filter = msg[2] || {};
    ws.subs.add(subIdKey);
    SUBS.set(subIdKey, ws);
    sendStoredEvents(ws, subIdKey, filter);
  }

  if (type === 'CLOSE') {
    const subIdKey = msg[1];
    ws.subs.delete(subIdKey);
    SUBS.delete(subIdKey);
  }

  if (type === 'EVENT') {
    const event = msg[1];
    if (validateEvent(event)) {
      STORE_EVENTS.set(event.id, event);
      broadcastEvent(event);
    }
  }
}

function validateEvent(event) {
  return event && event.kind && event.content && event.created_at;
}

function sendStoredEvents(ws, subIdKey, filter) {
  for (const event of STORE_EVENTS.values()) {
    if (matchesFilter(event, filter)) {
      ws.send(JSON.stringify(['EVENT', subIdKey, event]));
    }
  }
}

function matchesFilter(event, filter) {
  if (filter.kind && event.kind !== filter.kind) return false;
  if (filter['#n'] && !filter['#n'].some(t => event.tags?.some(t => t[0] === 'n' && t[1] === t))) return false;
  return true;
}

function broadcastEvent(event) {
  for (const [subIdKey, client] of SUBS) {
    if (client.subs.has(subIdKey)) {
      try {
        client.send(JSON.stringify(['EVENT', subIdKey, event]));
      } catch {}
    }
  }
}

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  wss.close();
  process.exit(0);
});
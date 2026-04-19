# P2P Auto-Scaling LLM

A browser-only, peer-to-peer LLM system with automatic model tier selection that works offline and improves with peers.

## Quick Start (Local Testing)

1. **Start servers (in separate terminals):**
   ```bash
   node relay.js   # Nostr relay on port 3001
   node server.js  # HTTP server on port 8080
   ```

2. **Open http://localhost:8080** in 5 browser tabs

3. Wait ~30 seconds for peers to appear in "Connected Peers" list

4. Chat in any tab - all work locally, improve together with peers

## Network Setup

### Using Public Relays

System connects to public Nostr relays by default:
- `wss://relay.damus.io`
- `wss://nos.lol`
- `wss://relay.nostr.band`

Edit `CONFIG.relays` in index.html to use custom relays.

### Using Local Relay Only

Replace relay URLs in CONFIG:
```javascript
relays: ["ws://localhost:8080"]
```

Set `mobileAssistOnly: false` to allow all devices to assist.

## How Auto-Scaling Works

### 1. Network Capacity Score

Score = f(peers, RTT, device tiers)

```
score = min(peers, 6)
        + 1 if any Tier A peer exists
        - 1 if average RTT > 180ms
```

### 2. Tier Selection

| Tier | Model | Min Score | Mode | Use Case |
|------|-------|----------|------|---------|
| small | Llama-3.2-1B | 0 | local | Offline, mobile |
| medium | Llama-3.1-3B | 2 | assist | 1-2 peers |
| large | Llama-3.1-8B | 4 | assist+verify | 3+ peers |

### 3. Hysteresis

Wait 3 seconds (CONFIG.hysteresisMs) before switching tiers to prevent flapping.

### 4. Mode Progression

- **local**: All inference on device
- **assist**: Local draft + peer verification
- **assist+verify**: Speculative decoding + batch verification

## Adding New Tiers/Models

Edit CONFIG in index.html:

```javascript
tiers: [
  {
    name: "tiny",
    model: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    minScore: 0,
    mode: "local"
  },
  {
    name: "xlarge",
    model: "Llama-3.1-70B-Instruct-q4f16_1-MLC",
    minScore: 6,
    mode: "assist+verify"
  }
]
```

Models must be MLC-compatible and available in the web-llm model library.

## Limitations

### Browser Requirements
- WebGPU preferred (falls back to CPU, slower)
- IndexedDB for model/KV cache
- WebSocket for Nostr communication

### Mobile Constraints
- Limited memory (1-4GB)
- Variable network latency (30-300ms)
- May overheat with large models
- Set `mobileAssistOnly: true` to offload compute

### Network
- Max 6 peers tracked
- Max 2 remote workers per generation
- Max 1 remote hop per token

### Model Switching
- Downloads are slow (100MB-4GB)
- Non-blocking UI during load
- Previous model kept until new one ready

## Performance Targets

| Scenario | Expected TPS |
|----------|-------------|
| Offline (1B) | 5-15 |
| Offline (3B) | 2-8 |
| With peers (3B assist) | 8-20 |
| Desktop GPU (8B) | 1-5 |

## Troubleshooting

### No peers appearing
- Check browser console for Nostr errors
- Verify relay.js is running
- Try opening more tabs

### Slow generation
- Use smaller tier (edit CONFIG)
- Check network latency in peer list
- Disable WebGPU if unavailable

### Model load errors
- Check IndexedDB space
- Try different browser
- Clear cached models in browser storage

## Architecture

```
┌─────────────────────────────────────────┐
│              Chat UI                    │
├─────────────────────────────────────────┤
│         Local-First Engine              │
│    (WebLLM - always available)         │
├─────────────────────────────────────────┤
│        Peer Discovery (Nostr)          │
├─────────────────────────────────────────┤
│      WebRTC DataChannels               │
├─────────────────────────────────────────┤
│    Model Tier Selector (Score)        │
└─────────────────────────────────────────┘
```

Each browser tab operates independently as both client and node, with automatic scaling based on network capacity.
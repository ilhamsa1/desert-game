# 🚀 Quick Start - Multiplayer

## 5-Step Setup

### Host (Player Creating Room):
1. `npm run dev`
2. Enter name → Click "Host Multiplayer Room"
3. **Copy room code** (e.g., `camelup-abc123`)
4. Share code with friends
5. Start game when everyone joins

### Joining Players:
1. `npm run dev` 
2. Enter name → Paste room code
3. Click "Join Room"
4. Wait for host to start

## Test Locally (Same Computer)

```bash
npm run dev
```

Then:
- **Tab 1**: Create room → Get code: `camelup-xyz789`
- **Tab 2**: Join room → Enter: `camelup-xyz789`
- **Tab 3**: Join room → Enter: `camelup-xyz789`

Host (Tab 1) clicks "Start Game" → All tabs sync!

## What Works

✅ **Real-time multiplayer** across internet  
✅ **Peer-to-peer** connection (no server needed)  
✅ **Synchronized** game state  
✅ **Bots** work in multiplayer  
✅ **Turn-based** gameplay  

## Connection Status

Look for green status in lobby:
- 🟢 "Connected (2 connected)" = Working!
- 🔵 "Connecting..." = Wait a moment
- 🔴 Error = Check room code

## Common Issues

**Can't connect?**
- Room code must be **exact** (all lowercase)
- Both host and client need **internet**
- Try **different browser** if issues persist

**Host left?**
- Game ends (host has authority)
- Create new room to continue

---

That's it! Have fun! 🎉

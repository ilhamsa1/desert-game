# 🌐 WebRTC Multiplayer Setup Guide

## What's Fixed

The game now has **real WebRTC peer-to-peer multiplayer** functionality! Players can connect to each other across different hosts/networks using PeerJS.

## Changes Made

### 1. ✅ Added PeerJS for WebRTC Connectivity
- Installed `peerjs` package
- Peer-to-peer connections via PeerJS signaling server
- No backend server needed!

### 2. ✅ Real-Time Connection Features
- **Host creates room**: Generates unique room code (e.g., `camelup-abc123`)
- **Players join**: Connect using the host's room code
- **Live sync**: Game state synchronizes across all connected players
- **Bot support**: Host can add/remove bots, synced to all players
- **Turn-based**: All players see the same game state in real-time

### 3. ✅ Connection Status Display
- See connection status in the lobby
- Number of connected players shown
- Real-time feedback for connection issues

## How to Use Multiplayer

### For the Host (Player 1):

1. **Start the game**
   ```bash
   npm run dev
   ```

2. **Enter your name** in the menu

3. **Click "🌐 Host Multiplayer Room"**

4. **You'll see a room code** like: `camelup-abc123`
   - **Share this code** with other players
   - The code is unique to your session

5. **Wait for players to join** (you'll see them appear in the lobby)

6. **Add bots** if you want (optional)

7. **Click "🚀 START GAME"** when ready

### For Joining Players (Player 2, 3, etc.):

1. **Get the room code** from the host

2. **Start your own instance of the game**
   ```bash
   npm run dev
   ```
   Open in a different browser/tab/computer

3. **Enter your name** in the menu

4. **Enter the room code** in the "Enter Room Code" field
   - Example: `camelup-abc123`
   - Must match exactly (all lowercase)

5. **Click "🚪 Join Room"**

6. **Wait for host to start the game**

## Testing Locally

You can test multiplayer on the same computer using different browser tabs:

### Method 1: Multiple Browser Tabs
```bash
# Terminal 1
npm run dev
# Opens at http://localhost:5173

# Open 2-3 tabs in your browser:
# Tab 1: Host (create room)
# Tab 2: Player 2 (join with room code)
# Tab 3: Player 3 (join with room code)
```

### Method 2: Different Browsers
- Chrome for Host
- Firefox for Player 2
- Edge for Player 3

## Testing Across Different Computers

1. **Host** creates room on Computer A
2. **Share room code** (via chat, text, etc.)
3. **Players** join from Computer B, C, D...
4. **Everyone connects** through the internet using PeerJS signaling

## Connection Requirements

- ✅ Internet connection (for PeerJS signaling server)
- ✅ Modern browser with WebRTC support
- ✅ No firewall blocking WebRTC (most home networks are fine)
- ✅ No VPN conflicts (some VPNs may block peer connections)

## Troubleshooting

### "Failed to connect to host"
- ✅ Check room code is correct (case-sensitive: all lowercase)
- ✅ Ensure host's peer connection is open (green status in lobby)
- ✅ Try refreshing both host and client pages
- ✅ Check firewall/VPN settings

### "Peer disconnected"
- ✅ One player may have closed their browser
- ✅ Network connection lost
- ✅ Host closed the connection

### "Connection error"
- ✅ Check internet connection
- ✅ Disable VPN and try again
- ✅ Try different browser
- ✅ PeerJS signaling server may be down (rare)

## How Game State Syncs

### Host Authority
- Host controls game state
- All actions broadcast to peers
- Authoritative game logic runs on host

### Client Behavior  
- Clients receive game state updates
- Can perform actions on their turn
- Actions sent to host for validation

### Synchronized Events
- ✅ Player joining/leaving
- ✅ Bot addition/removal
- ✅ Game start
- ✅ All player actions (bets, rolls, tiles)
- ✅ Turn changes
- ✅ Leg endings
- ✅ Game completion

## Technical Details

### WebRTC Architecture
```
Host (Peer ID: camelup-abc123)
  ↓
PeerJS Signaling Server (cloud.peerjs.com)
  ↓
Client 1 (Auto-generated Peer ID)
Client 2 (Auto-generated Peer ID)
Client 3 (Auto-generated Peer ID)
```

### Message Types
- `PLAYER_JOIN`: New player connects
- `LOBBY_UPDATE`: Lobby state sync
- `GAME_START`: Host starts game
- `GAME_STATE_UPDATE`: Game state sync
- `PLAYER_ACTION`: Player performs action
- `BOT_ADD`: Host adds bot
- `BOT_REMOVE`: Host removes bot

## Performance Notes

- ✅ **Low latency**: Direct peer-to-peer connection
- ✅ **No server costs**: Uses free PeerJS signaling
- ✅ **Scales well**: 2-5 players recommended
- ⚠️ **Host-dependent**: If host disconnects, game ends

## Security

- ✅ Room codes are randomly generated
- ✅ Peer-to-peer encryption via WebRTC
- ✅ No data stored on servers
- ⚠️ Room codes are not passwords (don't reuse sensitive codes)

## Next Steps

Want to enhance multiplayer further?
- Add player authentication
- Implement reconnection logic
- Add chat functionality
- Save game history
- Tournament mode with multiple rooms

---

**Enjoy playing Camel Up with friends! 🐪🎮🌐**

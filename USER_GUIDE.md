# 🐪 Camel Up - Complete User Guide

## 🎯 Overview

You now have a fully enhanced Camel Up dice racing game with:
- ✅ **Centered dice roller** prominently displayed
- ✅ **Beautiful, modern UI** that's easy to use
- ✅ **WebRTC framework** for multiplayer (room codes ready)
- ✅ **Smart AI bot players** that make intelligent decisions
- ✅ **Action dialogs** that appear after each turn
- ✅ **Dual leaderboards** showing both player coins and camel race positions

---

## 🚀 Getting Started

### Start the Game
```bash
npm run dev
```
Then open your browser to `http://localhost:5174` (or the port shown)

---

## 🎮 Main Menu

### 1. **Enter Your Name**
- Type your desired player name in the input field
- This name will appear throughout the game

### 2. **Select Bot Players**
- Use the slider to choose 0-4 bot players
- Bots will automatically take turns and make decisions
- Each bot has a unique color and is marked with 🤖

### 3. **Choose Game Mode**

**🎮 Solo Game**
- Play locally with bots
- Perfect for learning or practice
- Click "Start Solo Game"

**🌐 Host Multiplayer Room**
- Creates a unique 6-character room code
- Other players can join (WebRTC framework ready)
- Room code displays at top of game screen
- Click "Host Multiplayer Room"

---

## 🎲 Playing the Game

### Game Screen Layout

**Top Section:**
- Current Leg number
- Current player's turn (highlighted in their color)
- Room code (if hosting multiplayer)

**Center Section:**
- **Race Track**: Circular track showing all camels
  - Camels stack when on same position
  - Start position marked in green
  - Smooth animations as camels move

- **Dice Pyramid** (Centered): 
  - Shows all 5 racing dice
  - Available dice: bright colors with 🎲
  - Rolled dice: dark with ✓
  - Remaining dice count displayed
  - Large "ROLL DICE" button

**Bottom Section:**
- **Dual Leaderboards**:
  - Left: Player Standings (💰 by coins)
  - Right: Race Positions (🏁 by track position)

- **Betting Panel**:
  - Buttons for each camel color
  - Shows available betting values (5, 3, 2 EP)
  - Sold out tickets shown as disabled

### Your Turn Actions

When it's your turn, you can:

#### Option 1: Place a Bet
1. Click on any camel color button in the betting panel
2. You'll receive the betting ticket shown (5, 3, or 2 EP)
3. A dialog appears confirming your bet
4. Click "Continue" to proceed
5. Turn passes to next player

#### Option 2: Roll the Dice
1. Click the large "🎲 ROLL DICE 🎲" button in the center
2. A random available die is rolled (1-3 spaces)
3. The matching camel moves forward
4. A dialog shows which camel moved and how far
5. You earn +1 pyramid ticket (EP)
6. Click "Continue" to proceed
7. Turn passes to next player

### Bot Players
- **Automatic**: Bots take their turn automatically after 1.5 seconds
- **Visible**: You'll see dialogs for bot actions too
- **Smart**: Bots prefer higher-value bets but also roll dice
- **Marked**: All bots show 🤖 emoji in leaderboards

---

## 📊 Understanding the Leaderboards

### Left: Player Standings 💰

Shows players ranked by coins (Egyptian Pounds):
- **🥇 Gold Medal**: 1st place
- **🥈 Silver Medal**: 2nd place  
- **🥉 Bronze Medal**: 3rd place
- **Numbers**: 4th place and beyond
- **Display**: Name, Bot indicator, Coins

### Right: Race Positions 🏁

Shows camels ranked by race position:
- **Ranking**: 1st through 5th place
- **Camel Icon**: 🐪 with color
- **Position**: Current track position number
- **Updates**: Live updates after each dice roll

---

## 💰 Scoring System

### Betting Tickets
When a leg ends (all dice rolled):
- **1st Place Camel**: Your bet pays ticket value (5, 3, or 2 EP)
- **2nd Place Camel**: Your bet pays +1 EP
- **Other Camels**: Your bet loses -1 EP

### Pyramid Tickets
- Each time you roll dice: +1 EP
- Paid out at end of leg

### Game End
- Game ends when any camel reaches position 16+
- All final scoring calculated
- Player with most coins wins!

---

## 🎨 UI Features

### Visual Feedback
- **Hover Effects**: Buttons grow and glow when you hover
- **Animations**: Smooth transitions for all movements
- **Color Coding**: Each player/camel has distinct color
- **Shadows**: Depth and dimension throughout
- **Gradients**: Beautiful backgrounds on cards

### Status Messages
- **Yellow Banner**: Shows important game events
  - "Player placed bet on RED!"
  - "BLUE camel moved 3 spaces!"
  - "Leg 1 ended! Starting Leg 2"
  - "🏆 Winner announced! 🏆"

### Action Dialogs
Beautiful modal popups showing:
- **Title**: Action type
- **Message**: Details of what happened
- **Camel Visual**: Color representation
- **Continue Button**: Click to proceed

---

## 🏆 Game End Screen

When a camel crosses the finish line:

1. **Winner Announcement**
   - Large animated display of winning camel
   - Pulse animation effect
   - Winning color background

2. **Champion Declaration**
   - Player with most coins wins
   - Their name and coin count displayed
   - Even if they didn't bet on winning camel!

3. **Final Standings**
   - All players ranked by coins
   - Medals for top 3
   - Bot indicators shown
   - Color-coded cards

4. **New Game Button**
   - Click "🔄 New Game" to return to menu
   - Start fresh with same or different settings

---

## 🎯 Strategy Tips

### Betting
- **Early Bets**: Higher values (5 EP) but riskier
- **Late Bets**: Lower values (2 EP) but safer
- **Watch Positions**: Bet on camels ahead in race
- **Stack Order**: Higher in stack = better position

### Rolling Dice
- **Pyramid Tickets**: Guaranteed +1 EP per roll
- **Safe Income**: Less risk than betting
- **Game Control**: You choose which dice get rolled
- **Leg Ending**: Last die ends the leg

### Bot Behavior
- Bots weigh their options
- Prefer higher-value bets
- Balance betting and rolling
- Don't place emotional bets

---

## 🌐 Multiplayer Features

### Current Implementation
- ✅ Room code generation
- ✅ Room code display
- ✅ Player management structure
- ✅ Local/remote player distinction
- ✅ WebRTC dependencies installed

### Ready for Expansion
The game has infrastructure for:
- Joining existing rooms
- Player-to-player communication
- Turn synchronization
- Real-time game state sharing

**Note**: Full multiplayer requires a signaling server. The framework is in place for easy integration.

---

## 🎨 Customization

### Player Colors
Pre-defined beautiful colors:
- Red: #FF6B6B
- Teal: #4ECDC4
- Yellow: #FFE66D
- Mint: #95E1D3
- Coral: #F38181
- Purple: #AA96DA

### Camel Colors
Racing camels:
- Red, Blue, Green, Yellow, Purple

---

## 🔧 Controls

### Mouse
- **Click**: Select actions, place bets, roll dice
- **Hover**: Preview button states
- **Click Dialog**: Dismiss action dialogs

### Keyboard
- Not currently implemented (mouse-only interface)

---

## 📱 Responsive Design

- **Desktop**: Optimized for full screen
- **Centering**: All content centered and aligned
- **Scrolling**: Vertical scroll for smaller screens
- **Readable**: Large, clear text throughout

---

## 🐛 Troubleshooting

### Game won't start
- Ensure npm dependencies installed: `npm install`
- Check console for errors
- Try `npm run build` to verify compilation

### Bots not moving
- Wait 1.5 seconds - bots have intentional delay
- Check if dice are available
- Ensure game hasn't ended

### Dialogs not appearing
- Check if you're playing as a human (not spectating bot)
- Ensure JavaScript enabled
- Try refreshing page

### WebRTC not working
- Multiplayer requires signaling server (future feature)
- Solo play works without server
- Room codes display but joining requires backend

---

## 🎓 Game Rules Summary

1. **Setup**: Players start with 3 Egyptian Pounds (EP)
2. **Turns**: Take one action per turn
3. **Actions**: Bet on a camel OR roll the dice
4. **Legs**: One leg = all 5 dice rolled once
5. **Scoring**: Legs score based on camel positions
6. **Winner**: First camel to position 16+
7. **Champion**: Player with most coins at game end

---

## 🎉 Enjoy Your Game!

Your enhanced Camel Up experience includes:
- 🎲 Centered, beautiful dice roller
- 🎨 Modern, user-friendly interface
- 🤖 Smart AI opponents
- 💬 Informative action dialogs
- 🏆 Comprehensive leaderboards
- 🌐 Multiplayer framework ready

**Start playing now with:** `npm run dev`

Have fun racing! 🐪🏁💰

# 🐪 Camel Up Racing Game 🐪

An enhanced digital version of the popular board game "Camel Up" built with React, TypeScript, and Vite.

## 🎮 Game Features

### Core Mechanics
- **5 Racing Camels**: Red, Blue, Green, Yellow, and Purple camels race around a 16-position track
- **Camel Stacking**: Camels can stack on top of each other and move together as a unit
- **Dice Rolling System**: 5 colored dice that can be rolled once per round
- **Round-based Gameplay**: Each round consists of 5 dice rolls, after which a new round begins

### Key Features Inspired by Camel Up

#### 🎲 Pyramid Dice System
- Visual representation of available dice in the pyramid
- Each die can only be rolled once per round
- Players earn money ($1) for rolling dice

#### 💰 Betting System
- **Leg Bets**: Bet on which camel will be in the lead at the end of the current round
- Decreasing bet values: $5, $3, $2 for each camel
- Correct bets award the bet value, incorrect bets lose $1

#### 🏜️ Desert Tiles
- **Oasis Tiles**: Move camels forward by 1 extra space (🌴)
- **Mirage Tiles**: Move camels backward by 1 space (🌊)
- Players can place one tile per turn
- Tiles earn players $1 when placed
- Only one tile per player on the track at a time

#### 👥 Multiplayer Support
- 3 players by default (easily configurable)
- Each player starts with $3
- Turn-based gameplay with clear current player indication
- Player-specific colors and money tracking

#### 🏁 Winner Determination
- First camel to reach or pass position 16 wins
- If camels are stacked at the finish, the top camel wins
- Real-time leaderboard showing current positions

### 🎨 UI/UX Features
- **Beautiful Desert Theme**: Sand-colored track with wooden borders
- **Smooth Animations**: CSS transitions for all camel movements and UI interactions
- **Interactive Track**: Click on track positions to place desert tiles
- **Responsive Design**: Works on various screen sizes
- **Visual Feedback**: Hover effects, button states, and message notifications
- **Auto-Play Mode**: Watch the game play automatically
- **Manual Control**: Roll dice one at a time or reset the game

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎯 How to Play

1. **Start the Game**: Click "▶ Start Auto Play" to watch automatically, or "🎲 Roll Dice" to play manually

2. **Roll Dice**: 
   - Each dice roll moves a camel 1-3 spaces forward
   - Earn $1 for rolling dice
   - All 5 dice must be rolled before the round ends

3. **Place Leg Bets**:
   - Click on a camel color to bet on the current leader
   - Higher value bets are available first ($5, $3, $2)
   - Win or lose money based on who's leading at round end

4. **Place Desert Tiles**:
   - Click "Place Oasis (+1)" or "Place Mirage (-1)"
   - Then click on an empty track position
   - Earn $1 for placing a tile
   - Your tile moves with you each turn

5. **Win the Game**: First camel to reach position 16 wins!

## 🛠️ Technical Details

### Tech Stack
- **React 18**: Modern React with hooks
- **TypeScript**: Full type safety
- **Vite**: Fast development and optimized builds
- **CSS-in-JS**: Inline styles for component-scoped styling

### Project Structure
```
src/
├── components/
│   └── without-pixi.tsx    # Main game component
├── App.tsx                  # App entry point
├── App.css                  # Global styles and animations
└── main.tsx                # React root

public/
└── path/to/                # Camel and tile images (available for future use)
```

### Key Components
- **CamelRaceGame**: Main game logic and state management
- **Track**: Visual track representation with clickable positions
- **DicePyramid**: Shows available and rolled dice
- **PlayerDashboard**: Player info, betting, and tile placement controls

## 🎲 Game Rules

### Camel Movement
- Camels move 1-3 spaces based on dice roll
- When a camel lands on another camel, it stacks on top
- When a camel moves from a stack, all camels on top move with it
- Desert tiles modify movement (+1 for oasis, -1 for mirage)

### Scoring
- **Rolling Dice**: +$1
- **Placing Desert Tiles**: +$1
- **Correct Leg Bet**: +$5, +$3, or +$2 (decreasing)
- **Incorrect Leg Bet**: -$1

### Rounds
- Each round has 5 dice rolls (one per camel)
- Leg bets reset at the start of each round
- Game continues until a camel wins

## 🔮 Future Enhancements

Potential features to add:
- Race betting (final winner predictions)
- Loser betting (predict last place)
- Spectator tiles with player rewards
- Sound effects and music
- Online multiplayer
- AI opponents
- Game statistics and history
- Customizable player count and starting money
- Tournament mode

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## 🎉 Acknowledgments

Inspired by the board game "Camel Up" by Steffen Bogen.

---

**Enjoy the race! May the best camel win! 🐪🏆**

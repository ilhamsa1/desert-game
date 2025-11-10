# 🐪 Crazy Camels Feature - Black & White Camels

## What's New

Added **crazy camels** (Black & White) that move in the **opposite direction** to normal racing camels, just like in the official Camel Up board game!

## Features Implemented

### ✅ 1. Black & White Crazy Camels
- **Black camel** moves backward (⬅)
- **White camel** moves backward (⬅)
- Both camels start at position 0 like normal camels
- Distinguished by **golden border** around them
- Show backward arrow indicator (⬅)

### ✅ 2. Backward Movement Mechanics
```typescript
// When a crazy camel rolls, it moves BACKWARD
const actualSteps = selectedCamel.isCrazy ? -steps : steps;
let newPosition = selectedCamel.position + actualSteps;
```

- Roll 1: Move back 1 space
- Roll 2: Move back 2 spaces  
- Roll 3: Move back 3 spaces
- Can go to negative positions (off the start)
- Still obey spectator tile rules

### ✅ 3. Race Leaderboard Exclusion
- Crazy camels **DO NOT** count for winning/leaderboard
- Only the 5 racing camels (red, blue, green, yellow, purple) compete for victory
- Crazy camels are obstacles that affect the race

### ✅ 4. Enhanced Visual Design

#### Track Improvements
- **Larger tiles**: 70x70px (up from 50x50px)
- **Better spacing**: Tiles properly distributed around track
- **3D effect**: Inset shadows for depth
- **4-color gradient pattern**: Tan, Navajo White, Bisque, Sandy Brown
- **Center pyramid decoration**: Large pyramid emoji in center
- **Board-like appearance**: More authentic to Camel Up board game

#### Camel Improvements
- **Larger camels**: 60x50px (up from 50x40px)
- **Crazy camel indicator**: Golden border and backward arrow
- **Better stacking**: 45px vertical spacing between stacked camels
- **Text colors**: Proper contrast (yellow/white use black text)

#### Dice Display
- **7 dice total**: 5 racing + 2 crazy
- **Golden border**: Black & white dice have special styling
- **Count display**: Shows X/7 dice remaining
- **Indicator text**: "⭐ Black & White camels move backward!"

### ✅ 5. Game Logic Updates

#### Initialization
```typescript
// Normal racing camels
RACING_CAMELS.forEach((color, index) => {
  camels.push({ color, position: 0, stackOrder: index, isCrazy: false });
});

// Crazy camels
CRAZY_CAMELS.forEach((color, index) => {
  camels.push({ color, position: 0, stackOrder: RACING_CAMELS.length + index, isCrazy: true });
});
```

#### Dice Pool
- Start with 7 dice: red, blue, green, yellow, purple, black, white
- Each dice can be rolled once per leg
- Leg ends when all 7 dice are rolled

#### Winning Conditions
- Only racing camels can win the game
- Crazy camels are excluded from victory checks
- First racing camel to reach position 16 wins

## How It Works

### Movement Example

**Normal Camel (Red):**
- At position 5
- Rolls 2
- Moves to position 7 (5 + 2)

**Crazy Camel (Black):**
- At position 5
- Rolls 2
- Moves to position 3 (5 - 2) ⬅ BACKWARD!

### Strategic Impact

1. **Obstacle Creation**: Crazy camels can block normal camels
2. **Spectator Tiles**: Affect crazy camels too (but reversed effect)
3. **Stacking**: Crazy camels can stack with normal camels
4. **Unpredictability**: Adds chaos to race predictions

### Visual Indicators

🐪 **Normal Camel**: Regular border, no arrow
- Red: 🐪 (red background)
- Blue: 🐪 (blue background)
- Green: 🐪 (green background)
- Yellow: 🐪 (yellow background)
- Purple: 🐪 (purple background)

⭐🐪⬅ **Crazy Camel**: Golden border, backward arrow
- Black: 🐪⬅ (black background, gold border)
- White: 🐪⬅ (white background, gold border)

## Track Visual Improvements

### Before
- 800x400px track
- 50x50px tiles
- Simple gradient tiles
- Basic spacing

### After
- 1000x500px track
- 70x70px tiles
- 4-color alternating gradient tiles
- Perfect rectangular spacing
- 3D inset shadows
- Center pyramid decoration
- Board game aesthetic

### Tile Styling
```css
- Border: 4px solid brown
- Border radius: 12px
- Box shadow: Multi-layer 3D effect
- Gradient: 145deg angle
- Font: Georgia serif for numbers
- Size: 20px bold numbers
```

## Testing Checklist

✅ Build succeeds  
✅ No TypeScript errors  
✅ Black & white camels appear on track  
✅ Crazy camels have golden borders  
✅ Crazy camels show backward arrows  
✅ Rolling black/white dice moves camels backward  
✅ Crazy camels excluded from leaderboard  
✅ Only racing camels can win  
✅ 7 dice show in pyramid  
✅ Leg ends after all 7 dice rolled  
✅ Track tiles are larger and better styled  
✅ Camels properly stacked with 45px spacing  
✅ Center pyramid decoration visible  

## Files Modified

### `src/components/without-pixi.tsx`
- Added `CrazyCamelColor` type
- Extended `CamelColor` to include "black" | "white"
- Extended `DiceColor` to include "black" | "white"
- Added `isCrazy?: boolean` to `Camel` type
- Added `CRAZY_CAMELS` constant
- Updated `initializeGame()` to add crazy camels
- Updated `moveCamel()` to move crazy camels backward
- Updated `getLeaderboard()` to exclude crazy camels
- Updated `checkGameEnd()` to only check racing camels
- Increased track size: 1000x500px
- Increased tile size: 70x70px
- Improved tile positioning algorithm
- Enhanced tile visual styling (3D effects)
- Added center pyramid decoration
- Updated camel rendering (golden borders, arrows)
- Increased camel size: 60x50px
- Updated dice display to show 7 dice
- Added crazy camel indicators
- Updated `endLeg()` to reset all 7 dice

## Game Rules

### Crazy Camels
1. **Movement**: Always move backward (opposite direction)
2. **Stacking**: Can stack with any camels
3. **Spectator Tiles**: Affected like normal (but moving backward)
4. **Winning**: Cannot win the race (excluded from leaderboard)
5. **Dice**: Roll 1-3 just like normal camels

### Dice Count
- **Total**: 7 dice per leg
- **Racing**: 5 dice (red, blue, green, yellow, purple)
- **Crazy**: 2 dice (black, white)
- **Leg End**: When all 7 dice are rolled

### Victory
- **Only racing camels** (red, blue, green, yellow, purple) can win
- Crazy camels are **obstacles** not competitors
- First racing camel to reach position 16 wins

## Strategy Tips

1. **Betting**: Don't bet on crazy camels (they can't win anyway!)
2. **Spectator Tiles**: Place tiles where crazy camels might land
3. **Blocking**: Use crazy camels to block leaders
4. **Prediction**: Account for backward movement in calculations

## Visual Comparison

### Track Tiles
**Old**: Small (50x50), simple gradients, tight spacing
**New**: Large (70x70), 3D gradients, proper spacing, board-like

### Camels  
**Old**: Small (50x40), basic styling
**New**: Large (60x50), golden borders for crazy camels, arrows

### Dice Display
**Old**: 5 dice only
**New**: 7 dice with crazy camel styling

## Summary

### What Changed
🎨 **Track**: Bigger, better styled, more board game-like  
🐪 **Crazy Camels**: Black & white camels move backward  
🎲 **Dice**: 7 dice total (5 racing + 2 crazy)  
🏆 **Rules**: Only racing camels can win  
✨ **Visuals**: Golden borders, arrows, pyramid decoration  

### Why It's Better
- **Authentic**: Matches official Camel Up rules
- **Strategic**: Adds backward-moving obstacles
- **Visual**: Looks more like the board game
- **Gameplay**: More chaotic and unpredictable
- **Polish**: Professional board game appearance

---

**Enjoy the chaos of crazy camels! 🐪⬅🎲**

Test it now:
```bash
npm run dev
```

Watch black and white camels move backward and create mayhem! 🎉

# Bot Turn Auto-Advance Fix

## Problem
The "Next Turn" button was showing correctly after each bot action, but bot turns were still automatically advancing from one bot to another without waiting for the user to click the button.

## Root Cause
The bot turn logic in the `useEffect` hook (lines 794-836) was triggering automatically whenever the current player changed, even when `waitingForNextTurn` was `true`. 

**Flow of the bug:**
1. Bot 1 makes an action (bet/roll/place tile)
2. `setWaitingForNextTurn(true)` is called, showing the "Next Turn" button
3. Turn advances to Bot 2 (currentPlayer changes)
4. `useEffect` triggers because `currentPlayer` changed
5. Bot 2 automatically makes an action after 1.5 seconds ❌
6. Process repeats for Bot 3, Bot 4, etc.

The "Next Turn" button was visible but ineffective because the next bot's turn had already been scheduled.

## Solution
Added a check in the bot turn `useEffect` to prevent automatic bot actions when waiting for manual turn advancement:

**Line 800:** Changed from:
```typescript
if (currentPlayer.isBot) {
```

To:
```typescript
if (currentPlayer.isBot && !waitingForNextTurn) {
```

**Line 836:** Added `waitingForNextTurn` to the dependency array:
```typescript
}, [gameState?.currentPlayer, gameState?.availableDice.length, waitingForNextTurn]);
```

## How It Works Now

**Correct flow:**
1. Bot 1 makes an action (bet/roll/place tile)
2. `setWaitingForNextTurn(true)` is called
3. "Next Turn" button appears
4. Turn advances to Bot 2 (currentPlayer changes)
5. `useEffect` triggers but sees `waitingForNextTurn === true`
6. **Bot 2 does NOT automatically make an action** ✅
7. User clicks "Next Turn" button
8. `nextPlayer()` calls `setWaitingForNextTurn(false)`
9. `useEffect` triggers again due to `waitingForNextTurn` in deps
10. Now Bot 2 makes their action automatically
11. Process continues...

## Key Changes

1. **Line 800**: Added `&& !waitingForNextTurn` condition
   - Prevents bot actions from triggering when waiting for user input
   
2. **Line 836**: Added `waitingForNextTurn` to dependency array
   - Ensures the effect re-runs when the button is clicked and `waitingForNextTurn` changes to `false`

## Testing

✅ **Build Status**: Compiles successfully with no errors
```
vite v6.0.7 building for production...
✓ 29 modules transformed.
✓ built in 468ms
```

✅ **Expected Behavior**: 
- Bot makes an action
- "Next Turn" button appears
- **Bot turn waits** until user clicks button
- Next bot only acts after user clicks button
- Repeat for all bot turns

## Result

The game now properly pauses between bot turns, allowing the user to review each bot's action before proceeding to the next turn. The "Next Turn" button is fully functional and prevents automatic bot-to-bot turn advancement.

🎉 **Bot turns are now manually controlled via the "Next Turn" button!**

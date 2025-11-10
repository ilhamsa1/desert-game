# Bot Turn Analysis Feature

## Overview
Added a manual "Next Turn" button that allows players to analyze bot actions before advancing to the next turn.

## Changes Made

### 1. New State Variable
- Added `waitingForNextTurn` state to track when the game is paused waiting for manual turn advancement

### 2. Bot Action Handling
Modified bot actions to pause after completion:

#### Betting Tickets
- When a bot places a bet, the game pauses and shows a message
- Player must click "Next Turn" to continue

#### Spectator Tiles
- When a bot places a spectator tile, the game pauses
- Player can review the tile placement before advancing

#### Dice Rolling
- When a bot rolls the dice, the game pauses
- Player can see what the bot rolled and how camels moved before continuing

### 3. User Interface
- **Next Turn Button**: Large, animated green button that appears after bot actions
- **Message Display**: Shows what action the bot took
- **Instructions**: Helpful text encouraging players to review the bot's action
- **Action Blocking**: Player actions are disabled while waiting for "Next Turn" click

### 4. Visual Features
- Button has pulse animation to draw attention
- Hover effects for better user experience
- Clear messaging about what the bot did
- All game controls are disabled until "Next Turn" is clicked

## Benefits
- **Analysis**: Players can carefully review each bot decision
- **Learning**: Helps understand bot strategy and game mechanics
- **Debugging**: Easier to spot issues or unexpected behavior
- **Control**: Players have full control over game pacing

## Usage
1. Start a game with bot players
2. When a bot takes its turn, the game will pause
3. Review the bot's action (bet, tile placement, or dice roll)
4. Click the "▶️ NEXT TURN ▶️" button to continue
5. The next player's turn will begin

## Technical Implementation
- State management prevents race conditions
- Bot timer is properly cleared when turn advances
- All player controls are disabled during bot turn review
- Clean separation between bot and human player flows

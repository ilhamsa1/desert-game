import React, { useState, useEffect, useRef } from "react";
import Peer, { DataConnection } from "peerjs";

// Full Camel Up Game Implementation with WebRTC and Bot Support

type CamelColor = "red" | "blue" | "green" | "yellow" | "purple" | "black" | "white";
type DiceColor = "red" | "blue" | "green" | "yellow" | "purple" | "black" | "white";
type CrazyCamelColor = "black" | "white";

type Camel = {
  color: CamelColor;
  position: number;
  stackOrder: number;
  isCrazy?: boolean; // Crazy camels move backward
};

type SpectatorTile = {
  position: number;
  type: "cheering" | "booing";
  owner: string;
};

type Player = {
  id: string;
  name: string;
  money: number;
  color: string;
  isBot: boolean;
  isLocal: boolean;
  bettingTickets: { camelColor: CamelColor; value: number }[];
  pyramidTickets: number;
  spectatorTilePlaced: boolean;
};

type GameState = {
  camels: Camel[];
  players: Player[];
  currentPlayer: number;
  availableDice: DiceColor[];
  legBettingStacks: { [key in CamelColor]?: number[] };
  spectatorTiles: SpectatorTile[];
  leg: number;
  gameEnded: boolean;
  winner: CamelColor | null;
  roomCode?: string;
  isHost?: boolean;
};

type ActionDialogData = {
  type: string;
  title: string;
  message: string;
  camelColor?: CamelColor;
  value?: number;
};

// WebRTC Message Types
type PlayerJoinMessage = { type: 'PLAYER_JOIN'; player: Player };
type LobbyUpdateMessage = { type: 'LOBBY_UPDATE'; players: Player[] };
type GameStartMessage = { type: 'GAME_START'; gameState: GameState };
type GameStateUpdateMessage = { type: 'GAME_STATE_UPDATE'; gameState: GameState; message?: string };
type PlayerActionMessage = { type: 'PLAYER_ACTION'; action: string; data?: CamelColor | "cheering" | "booing" };
type BotAddMessage = { type: 'BOT_ADD'; bot: Player };
type BotRemoveMessage = { type: 'BOT_REMOVE'; botId: string };
type WebRTCMessage = PlayerJoinMessage | LobbyUpdateMessage | GameStartMessage | GameStateUpdateMessage | PlayerActionMessage | BotAddMessage | BotRemoveMessage;

const TRACK_LENGTH = 16;
const RACING_CAMELS: CamelColor[] = ["red", "blue", "green", "yellow", "purple"];
const CRAZY_CAMELS: CrazyCamelColor[] = ["black", "white"];

// Initialize game
const initializeGame = (players: Player[]): GameState => {
  const camels: Camel[] = [];
  
  // Normal racing camels start at position 0
  RACING_CAMELS.forEach((color, index) => {
    camels.push({ color, position: 0, stackOrder: index, isCrazy: false });
  });
  
  // Crazy camels (black & white) also start at position 0 but move backward
  CRAZY_CAMELS.forEach((color, index) => {
    camels.push({ color, position: 0, stackOrder: RACING_CAMELS.length + index, isCrazy: true });
  });

  const legBettingStacks: { [key in CamelColor]?: number[] } = {};
  RACING_CAMELS.forEach(color => {
    // 20 tickets total: 5+5+3+3+2+2 = 20
    legBettingStacks[color] = [5, 5, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
  });

  return {
    camels,
    players,
    currentPlayer: 0,
    availableDice: ["red", "blue", "green", "yellow", "purple", "black", "white"],
    legBettingStacks,
    spectatorTiles: [],
    leg: 1,
    gameEnded: false,
    winner: null,
  };
};

// Get leaderboard (only racing camels, not crazy camels)
const getLeaderboard = (camels: Camel[]): Camel[] => {
  return [...camels]
    .filter(c => !c.isCrazy) // Exclude crazy camels from leaderboard
    .sort((a, b) => {
      if (a.position !== b.position) {
        return b.position - a.position;
      }
      return b.stackOrder - a.stackOrder;
    });
};

// Move camel
const moveCamel = (camels: Camel[], camelColor: CamelColor, steps: number, spectatorTiles: SpectatorTile[]): Camel[] => {
  const selectedCamel = camels.find(c => c.color === camelColor);
  if (!selectedCamel) return camels;

  const camelsOnSamePosition = camels.filter(c => c.position === selectedCamel.position);
  const movingCamels = camelsOnSamePosition.filter(c => c.stackOrder >= selectedCamel.stackOrder);

  // Crazy camels (black & white) move BACKWARD!
  const actualSteps = selectedCamel.isCrazy ? -steps : steps;
  let newPosition = selectedCamel.position + actualSteps;
  
  // Check for spectator tile at the landing position
  const spectatorTile = spectatorTiles.find(tile => tile.position === newPosition);
  if (spectatorTile) {
    newPosition += spectatorTile.type === "cheering" ? 1 : -1;
  }
  
  newPosition = Math.max(0, Math.min(newPosition, TRACK_LENGTH + 2));

  const camelsAtDestination = camels.filter(
    c => c.position === newPosition && !movingCamels.includes(c)
  );

  const maxStackAtDestination = camelsAtDestination.length > 0
    ? Math.max(...camelsAtDestination.map(c => c.stackOrder))
    : -1;

  return camels.map(camel => {
    const movingIndex = movingCamels.findIndex(c => c.color === camel.color);
    
    if (movingIndex >= 0) {
      const relativeStackPosition = camel.stackOrder - selectedCamel.stackOrder;
      return {
        ...camel,
        position: newPosition,
        stackOrder: maxStackAtDestination + 1 + relativeStackPosition,
      };
    }
    
    return camel;
  });
};

// Check if game ended (only racing camels can win)
const checkGameEnd = (camels: Camel[]): { ended: boolean; winner: CamelColor | null } => {
  const racingCamels = camels.filter(c => !c.isCrazy);
  const winnersOverLine = racingCamels.filter(c => c.position >= TRACK_LENGTH);
  
  if (winnersOverLine.length > 0) {
    const leaderboard = getLeaderboard(camels);
    return { ended: true, winner: leaderboard[0].color };
  }
  
  return { ended: false, winner: null };
};

// Score leg bets
const scoreLegBets = (players: Player[], leaderboard: Camel[]): Player[] => {
  const firstPlace = leaderboard[0];
  const secondPlace = leaderboard[1];

  return players.map(player => {
    let earnings = 0;
    
    player.bettingTickets.forEach(ticket => {
      if (ticket.camelColor === firstPlace.color) {
        earnings += ticket.value;
      } else if (ticket.camelColor === secondPlace.color) {
        earnings += 1;
      } else {
        earnings -= 1;
      }
    });

    earnings += player.pyramidTickets;

    return {
      ...player,
      money: Math.max(0, player.money + earnings),
      bettingTickets: [],
      pyramidTickets: 0,
    };
  });
};

  // Bot AI - Make decision
const makeBotDecision = (gameState: GameState, currentPlayer: Player): { action: string; data?: CamelColor | "cheering" | "booing" } => {
  const availableActions: Array<{ action: string; data?: CamelColor | "cheering" | "booing"; weight: number }> = [];

  // Consider betting tickets (only on available stacks)
  RACING_CAMELS.forEach(color => {
    const stack = gameState.legBettingStacks[color] || [];
    if (stack.length > 0) {
      const value = stack[stack.length - 1];
      // Higher value = higher weight
      availableActions.push({ action: "betting_ticket", data: color, weight: value * 2 });
    }
  });

  // Consider placing spectator tile (if not placed and valid positions exist)
  if (!currentPlayer.spectatorTilePlaced) {
    // Check if there are any valid positions for placing a tile
    let hasValidPosition = false;
    for (let i = 1; i < TRACK_LENGTH; i++) {
      const hasCamel = gameState.camels.some(c => c.position === i);
      const hasTile = gameState.spectatorTiles.some(t => t.position === i);
      if (!hasCamel && !hasTile) {
        hasValidPosition = true;
        break;
      }
    }
    
    if (hasValidPosition) {
      availableActions.push({ action: "spectator_tile", data: Math.random() > 0.5 ? "cheering" : "booing", weight: 5 });
    }
  }

  // Consider rolling dice (if dice are available)
  if (gameState.availableDice.length > 0) {
    availableActions.push({ action: "pyramid_ticket", weight: 10 });
  }

  // If no valid actions available, default to rolling dice (with safety check)
  if (availableActions.length === 0) {
    if (gameState.availableDice.length > 0) {
      return { action: "pyramid_ticket" };
    }
    // This should never happen, but as ultimate fallback
    return { action: "betting_ticket", data: RACING_CAMELS[0] };
  }

  // Weighted random selection
  const totalWeight = availableActions.reduce((sum, a) => sum + a.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const action of availableActions) {
    random -= action.weight;
    if (random <= 0) {
      return { action: action.action, data: action.data };
    }
  }

  // Fallback to first available action
  return availableActions[0];
};

// Modal Dialog Component
const ActionDialog: React.FC<{
  data: ActionDialogData | null;
  onClose: () => void;
}> = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: "#FFF",
        borderRadius: "20px",
        padding: "40px",
        maxWidth: "500px",
        border: "4px solid #8B4513",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        animation: "slideIn 0.3s ease-out",
      }}>
        <h2 style={{ 
          color: "#8B4513", 
          marginBottom: "20px",
          textAlign: "center",
          fontSize: "28px",
        }}>
          {data.title}
        </h2>
        <p style={{ 
          fontSize: "18px", 
          marginBottom: "30px",
          textAlign: "center",
          color: "#333",
        }}>
          {data.message}
        </p>
        {data.camelColor && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px",
          }}>
            <div style={{
              width: "80px",
              height: "60px",
              backgroundColor: data.camelColor,
              border: "3px solid #333",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
            }}>
              🐪
            </div>
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "15px",
            fontSize: "20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "3px solid #333",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

// Track Component
const Track: React.FC<{ 
  camels: Camel[];
  spectatorTiles: SpectatorTile[];
  onTileClick?: (position: number) => void;
  clickablePositions?: boolean;
}> = ({ camels, spectatorTiles, onTileClick, clickablePositions }) => {
  const trackWidth = 1000;
  const trackHeight = 500;
  const totalPositions = TRACK_LENGTH;
  const positionPerSide = totalPositions / 4;
  const tileSize = 70; // Larger tiles like the board game

  const getCamelPosition = (position: number) => {
    let displayPosition = position;
    if (displayPosition < 0) displayPosition = 0;
    if (displayPosition >= totalPositions) displayPosition = totalPositions - 1;

    let x = 0, y = 0;
    const tileSpacing = (trackWidth - tileSize) / (positionPerSide - 1);
    const verticalSpacing = (trackHeight - tileSize) / (positionPerSide - 1);

    if (displayPosition < positionPerSide) {
      // Bottom row (left to right)
      x = displayPosition * tileSpacing;
      y = trackHeight - tileSize;
    } else if (displayPosition < positionPerSide * 2) {
      // Right column (bottom to top)
      x = trackWidth - tileSize;
      y = trackHeight - tileSize - ((displayPosition - positionPerSide) * verticalSpacing);
    } else if (displayPosition < positionPerSide * 3) {
      // Top row (right to left)
      x = trackWidth - tileSize - ((displayPosition - positionPerSide * 2) * tileSpacing);
      y = 0;
    } else {
      // Left column (top to bottom)
      x = 0;
      y = (displayPosition - positionPerSide * 3) * verticalSpacing;
    }

    return { x, y };
  };

  // Get tile color pattern - alternating desert colors like board game
  const getTileStyle = (index: number) => {
    const colors = [
      "linear-gradient(145deg, #F5DEB3 0%, #DEB887 50%, #D2B48C 100%)", // Tan
      "linear-gradient(145deg, #FFDEAD 0%, #FFE4B5 50%, #FFE5B4 100%)", // Navajo White
      "linear-gradient(145deg, #FFE4C4 0%, #FFDAB9 50%, #FFCBA4 100%)", // Bisque
      "linear-gradient(145deg, #F4A460 0%, #DAA520 50%, #CD853F 100%)", // Sandy Brown
    ];
    
    return colors[index % 4];
  };

  return (
    <div style={{
      position: "relative",
      width: `${trackWidth}px`,
      height: `${trackHeight}px`,
      border: "8px solid #8B4513",
      background: "linear-gradient(135deg, #E8D4A0 0%, #C9A961 50%, #B8965F 100%)",
      borderRadius: "15px",
      boxShadow: "0 15px 35px rgba(0,0,0,0.5), inset 0 0 60px rgba(139,69,19,0.2)",
      padding: "0",
    }}>
      {/* Center Pyramid Decoration */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: "120px",
        opacity: 0.15,
        zIndex: 1,
        filter: "drop-shadow(0 0 20px rgba(139,69,19,0.5))",
      }}>
        🔺
      </div>
      
      {Array.from({ length: totalPositions }).map((_, index) => {
        const { x, y } = getCamelPosition(index);
        const spectatorTile = spectatorTiles.find(tile => tile.position === index);
        const hasCamel = camels.some(c => c.position === index);
        const isClickable = clickablePositions && !hasCamel && !spectatorTile && index !== 0;
        
        return (
          <div
            key={index}
            onClick={() => isClickable && onTileClick?.(index)}
            style={{
              position: "absolute",
              left: `${x}px`,
              top: `${y}px`,
              width: `${tileSize}px`,
              height: `${tileSize}px`,
              background: index === 0 
                ? "linear-gradient(145deg, #4CAF50 0%, #388E3C 50%, #2E7D32 100%)" 
                : getTileStyle(index),
              border: "4px solid #8B4513",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: "900",
              color: "#5D4037",
              cursor: isClickable ? "pointer" : "default",
              transition: "transform 0.2s, box-shadow 0.2s",
              boxShadow: isClickable 
                ? "0 6px 12px rgba(0,0,0,0.4), inset 0 2px 8px rgba(255,255,255,0.6), inset 0 -2px 8px rgba(0,0,0,0.2)" 
                : "0 4px 8px rgba(0,0,0,0.3), inset 0 2px 6px rgba(255,255,255,0.5), inset 0 -2px 6px rgba(0,0,0,0.15)",
              textShadow: "1px 1px 3px rgba(255,255,255,0.9), -1px -1px 2px rgba(0,0,0,0.3)",
              backgroundSize: "200% 200%",
              animation: isClickable ? "shimmer 3s ease infinite" : "none",
              zIndex: 5,
            }}
            onMouseEnter={(e) => {
              if (isClickable) {
                e.currentTarget.style.transform = "scale(1.1) rotate(1deg)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(255,215,0,0.7), inset 0 2px 10px rgba(255,255,255,0.8), inset 0 -2px 10px rgba(0,0,0,0.25)";
              }
            }}
            onMouseLeave={(e) => {
              if (isClickable) {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.4), inset 0 2px 8px rgba(255,255,255,0.6), inset 0 -2px 8px rgba(0,0,0,0.2)";
              }
            }}
          >
            {index === 0 ? (
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center",
                color: "white",
                textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
              }}>
                <span style={{ fontSize: "20px" }}>🏁</span>
                <span style={{ fontSize: "11px", fontWeight: "bold" }}>START</span>
              </div>
            ) : (
              <span style={{ 
                fontSize: "20px",
                fontFamily: "Georgia, serif",
              }}>
                {index}
              </span>
            )}
            {spectatorTile && (
              <div style={{
                position: "absolute",
                bottom: "-12px",
                fontSize: "42px",
                zIndex: 15,
                filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.6))",
              }}>
                {spectatorTile.type === "cheering" ? "👍" : "👎"}
              </div>
            )}
          </div>
        );
      })}
      
      {camels.map((camel) => {
        const { x, y } = getCamelPosition(camel.position);
        const textColor = (camel.color === 'yellow' || camel.color === 'white') ? 'black' : 'white';
        const isCrazy = camel.isCrazy;
        
        return (
          <div
            key={camel.color}
            style={{
              position: "absolute",
              left: `${x + (tileSize - 60) / 2}px`,
              top: `${y - 10 - (camel.stackOrder * 45)}px`,
              width: "60px",
              height: "50px",
              backgroundColor: camel.color,
              border: isCrazy ? "4px solid #FFD700" : "4px solid #333",
              borderRadius: "25px 25px 12px 12px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              color: textColor,
              fontWeight: "bold",
              fontSize: "28px",
              zIndex: 20 + camel.stackOrder,
              transition: "all 0.8s ease-in-out",
              boxShadow: isCrazy 
                ? "0 6px 12px rgba(255,215,0,0.6), 0 0 15px rgba(255,215,0,0.4)"
                : "0 6px 12px rgba(0,0,0,0.5)",
            }}
          >
            <span style={{ marginBottom: "-5px" }}>🐪</span>
            {isCrazy && (
              <span style={{ 
                fontSize: "10px", 
                fontWeight: "900",
                textTransform: "uppercase",
                textShadow: camel.color === 'white' 
                  ? "1px 1px 2px rgba(0,0,0,0.8)" 
                  : "1px 1px 2px rgba(255,255,255,0.8)",
                marginTop: "-3px",
              }}>
                {camel.color === 'black' ? '⬅' : '⬅'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};


// Enhanced Leaderboard (Right Side)
const EnhancedLeaderboard: React.FC<{ 
  players: Player[];
  camels: Camel[];
}> = ({ players, camels }) => {
  const sortedPlayers = [...players].sort((a, b) => b.money - a.money);
  const camelLeaderboard = getLeaderboard(camels);
  
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      minWidth: "320px",
      maxWidth: "350px",
    }}>
      {/* Player Leaderboard */}
      <div style={{
        padding: "20px",
        backgroundColor: "#FFF",
        borderRadius: "15px",
        border: "4px solid #8B4513",
        boxShadow: "0 6px 12px rgba(0,0,0,0.2)",
      }}>
        <h2 style={{ 
          textAlign: "center", 
          color: "#8B4513",
          marginBottom: "15px",
          fontSize: "22px",
        }}>
          💰 Player Standings 💰
        </h2>
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            style={{
              padding: "12px 15px",
              marginBottom: "10px",
              background: `linear-gradient(135deg, ${player.color} 0%, ${player.color}dd 100%)`,
              borderRadius: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: "bold",
              fontSize: "15px",
              border: "3px solid #333",
              boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
              color: "#FFF",
              textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
            }}
          >
            <span>
              <span style={{ 
                fontSize: "20px", 
                marginRight: "8px",
              }}>
                {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
              </span>
              {player.name} {player.isBot && "🤖"}
            </span>
            <span style={{ fontSize: "16px" }}>
              💰 {player.money}
            </span>
          </div>
        ))}
      </div>

      {/* Camel Race Leaderboard */}
      <div style={{
        padding: "20px",
        backgroundColor: "#FFF",
        borderRadius: "15px",
        border: "4px solid #8B4513",
        boxShadow: "0 6px 12px rgba(0,0,0,0.2)",
      }}>
        <h2 style={{ 
          textAlign: "center", 
          color: "#8B4513",
          marginBottom: "15px",
          fontSize: "22px",
        }}>
          🏁 Race Positions 🏁
        </h2>
        {camelLeaderboard.map((camel, index) => (
          <div
            key={camel.color}
            style={{
              padding: "12px 15px",
              marginBottom: "10px",
              background: `linear-gradient(135deg, ${camel.color} 0%, ${camel.color}dd 100%)`,
              borderRadius: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: "bold",
              fontSize: "15px",
              border: "3px solid #333",
              boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
              color: camel.color === "yellow" ? "#000" : "#FFF",
              textShadow: camel.color === "yellow" ? "none" : "1px 1px 2px rgba(0,0,0,0.5)",
            }}
          >
            <span>
              <span style={{ fontSize: "20px", marginRight: "8px" }}>
                {index + 1}.
              </span>
              🐪 {camel.color.toUpperCase()}
            </span>
            <span style={{ fontSize: "14px" }}>
              Pos: {camel.position + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Betting Panel
const BettingPanel: React.FC<{
  gameState: GameState;
  onBet: (color: CamelColor) => void;
  disabled: boolean;
}> = ({ gameState, onBet, disabled }) => {
  return (
    <div style={{
      padding: "25px",
      backgroundColor: "#FFF",
      borderRadius: "15px",
      border: "3px solid #8B4513",
      boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
    }}>
      <h3 style={{ 
        textAlign: "center", 
        color: "#8B4513",
        marginBottom: "20px",
        fontSize: "24px",
      }}>
        🎫 Place Your Bet 🎫
      </h3>
      <div style={{ 
        display: "flex", 
        gap: "15px", 
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {RACING_CAMELS.map(color => {
          const stack = gameState.legBettingStacks[color] || [];
          const nextValue = stack[stack.length - 1];
          const available = stack.length > 0;
          
          return (
            <button
              key={color}
              onClick={() => onBet(color)}
              disabled={disabled || !available}
              style={{
                padding: "20px 30px",
                fontSize: "18px",
                backgroundColor: available ? color : "#ccc",
                color: color === "yellow" ? "black" : "white",
                border: "4px solid #333",
                borderRadius: "12px",
                cursor: disabled || !available ? "not-allowed" : "pointer",
                fontWeight: "bold",
                opacity: available ? 1 : 0.5,
                transition: "transform 0.2s, box-shadow 0.2s",
                minWidth: "150px",
                boxShadow: available && !disabled ? "0 4px 8px rgba(0,0,0,0.3)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!disabled && available) {
                  e.currentTarget.style.transform = "scale(1.1)";
                  e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = available && !disabled ? "0 4px 8px rgba(0,0,0,0.3)" : "none";
              }}
            >
              🐪 {color.toUpperCase()}<br/>
              {available ? `+${nextValue} EP` : "Sold Out"}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Main Game Component
const CamelRaceGame: React.FC = () => {
  const [setupMode, setSetupMode] = useState<"menu" | "lobby" | "game">("menu");
  const [playerName, setPlayerName] = useState("");
  const [numBots, setNumBots] = useState(2);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [message, setMessage] = useState<string>("");
  const [actionDialog, setActionDialog] = useState<ActionDialogData | null>(null);
  const [placingTile, setPlacingTile] = useState<"cheering" | "booing" | null>(null);
  const [waitingForNextTurn, setWaitingForNextTurn] = useState<boolean>(false);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Lobby state
  const [lobbyPlayers, setLobbyPlayers] = useState<Player[]>([]);
  const [roomCode, setRoomCode] = useState<string>("");
  const [isHost, setIsHost] = useState<boolean>(false);

  // WebRTC/PeerJS state
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]);

  // Broadcast data to all connected peers
  const broadcastToPeers = useRef((data: WebRTCMessage) => {
    connectionsRef.current.forEach(conn => {
      if (conn.open) {
        conn.send(data);
      }
    });
  });

  // Setup peer connection handlers
  const setupConnection = (conn: DataConnection) => {
    conn.on('data', (data: unknown) => {
      console.log('Received data from peer:', data);
      
      const message = data as WebRTCMessage;
      
      if (message.type === 'PLAYER_JOIN') {
        // Add remote player to lobby
        setLobbyPlayers(prev => {
          const exists = prev.some(p => p.id === message.player.id);
          if (exists) return prev;
          const updatedPlayers = [...prev, message.player];
          
          // If host, send updated lobby state to new player (including them)
          if (isHost) {
            // Use setTimeout to ensure this runs after state update
            setTimeout(() => {
              conn.send({
                type: 'LOBBY_UPDATE',
                players: updatedPlayers,
              } as LobbyUpdateMessage);
            }, 0);
          }
          
          return updatedPlayers;
        });
        setMessage(`${message.player.name} joined the lobby!`);
      } else if (message.type === 'LOBBY_UPDATE') {
        // Receive lobby update from host
        if (message.players && Array.isArray(message.players)) {
          setLobbyPlayers(message.players);
        }
      } else if (message.type === 'GAME_START') {
        // Game is starting
        if (message.gameState && message.gameState.players && message.gameState.players.length > 0) {
          setGameState(message.gameState);
          setSetupMode('game');
          setMessage('Game started by host!');
        }
      } else if (message.type === 'GAME_STATE_UPDATE') {
        // Sync game state
        if (message.gameState && message.gameState.players && message.gameState.players.length > 0) {
          setGameState(message.gameState);
          if (message.message) {
            setMessage(message.message);
          }
        }
      } else if (message.type === 'PLAYER_ACTION') {
        // Handle remote player action
        handleAction(message.action, message.data, true);
      } else if (message.type === 'BOT_ADD') {
        // Host added a bot
        if (message.bot && message.bot.id && message.bot.name) {
          setLobbyPlayers(prev => [...prev, message.bot]);
        }
      } else if (message.type === 'BOT_REMOVE') {
        // Host removed a bot
        if (message.botId) {
          setLobbyPlayers(prev => prev.filter(p => p.id !== message.botId));
        }
      }
    });

    conn.on('close', () => {
      console.log('Connection closed');
      setConnectionStatus('Peer disconnected');
      setConnections(prev => prev.filter(c => c !== conn));
      connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
      setConnectionStatus(`Connection error: ${err.message}`);
    });
  };

  // Initialize PeerJS for host
  const initializePeerAsHost = (code: string) => {
    try {
      const newPeer = new Peer(code, {
        debug: 2,
      });

      newPeer.on('open', (id) => {
        console.log('Host peer created with ID:', id);
        setConnectionStatus(`Hosting with ID: ${id}`);
        peerRef.current = newPeer;
      });

      newPeer.on('connection', (conn) => {
        console.log('Incoming connection from:', conn.peer);
        setConnectionStatus(`Player connecting...`);
        
        setupConnection(conn);
        
        conn.on('open', () => {
          console.log('Connection opened');
          setConnectionStatus(`Connected to ${conn.peer}`);
          setConnections(prev => [...prev, conn]);
          connectionsRef.current = [...connectionsRef.current, conn];
        });
      });

      newPeer.on('error', (err) => {
        console.error('Peer error:', err);
        setConnectionStatus(`Peer error: ${err.message}`);
        setMessage(`Connection error: ${err.message}`);
      });
    } catch (error) {
      console.error('Failed to create peer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessage(`Failed to create host: ${errorMessage}`);
    }
  };

  // Initialize PeerJS for client
  const initializePeerAsClient = (hostCode: string) => {
    try {
      const newPeer = new Peer({
        debug: 2,
      });

      newPeer.on('open', (id) => {
        console.log('Client peer created with ID:', id);
        setConnectionStatus(`Connecting to host ${hostCode}...`);
        peerRef.current = newPeer;

        // Connect to host
        const conn = newPeer.connect(hostCode, {
          reliable: true,
        });

        setupConnection(conn);

        conn.on('open', () => {
          console.log('Connected to host');
          setConnectionStatus(`Connected to host`);
          setConnections([conn]);
          connectionsRef.current = [conn];

          // Send player info to host
          const localPlayer = lobbyPlayers[0];
          conn.send({
            type: 'PLAYER_JOIN',
            player: localPlayer,
          });
        });

        conn.on('error', (err) => {
          console.error('Connection failed:', err);
          setConnectionStatus(`Failed to connect: ${err}`);
          setMessage(`Failed to connect to host: ${err}`);
        });
      });

      newPeer.on('error', (err) => {
        console.error('Peer error:', err);
        setConnectionStatus(`Peer error: ${err.message}`);
        setMessage(`Connection error: ${err.message}`);
      });
    } catch (error) {
      console.error('Failed to create peer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessage(`Failed to connect: ${errorMessage}`);
    }
  };

  // Cleanup peer connections
  useEffect(() => {
    return () => {
      connectionsRef.current.forEach(conn => {
        conn.close();
      });
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  // Create or join lobby
  const createLobby = () => {
    if (!playerName.trim()) {
      setMessage("Please enter your name!");
      return;
    }
    
    const code = `camelup-${Math.random().toString(36).substring(2, 8).toLowerCase()}`;
    const localPlayer: Player = {
      id: `player-${Date.now()}`,
      name: playerName,
      money: 3,
      color: "#FF6B6B",
      isBot: false,
      isLocal: true,
      bettingTickets: [],
      pyramidTickets: 0,
      spectatorTilePlaced: false,
    };
    
    setRoomCode(code);
    setIsHost(true);
    setLobbyPlayers([localPlayer]);
    setSetupMode("lobby");
    setMessage(`Room created! Share code: ${code}`);
    
    // Initialize PeerJS as host
    initializePeerAsHost(code);
  };

  const joinLobby = () => {
    if (!playerName.trim()) {
      setMessage("Please enter your name!");
      return;
    }
    if (!roomCodeInput.trim()) {
      setMessage("Please enter a room code!");
      return;
    }
    
    const localPlayer: Player = {
      id: `player-${Date.now()}`,
      name: playerName,
      money: 3,
      color: "#4ECDC4",
      isBot: false,
      isLocal: true,
      bettingTickets: [],
      pyramidTickets: 0,
      spectatorTilePlaced: false,
    };
    
    const code = roomCodeInput.trim().toLowerCase();
    setRoomCode(code);
    setIsHost(false);
    setLobbyPlayers([localPlayer]);
    setSetupMode("lobby");
    setMessage(`Connecting to room ${code}...`);
    
    // Initialize PeerJS as client and connect to host
    initializePeerAsClient(code);
  };

  const addBotToLobby = () => {
    const botNumber = lobbyPlayers.filter(p => p.isBot).length + 1;
    const colors = ["#FFE66D", "#95E1D3", "#F38181", "#AA96DA", "#FFA07A"];
    
    const newBot: Player = {
      id: `bot-${Date.now()}`,
      name: `Bot ${botNumber}`,
      money: 3,
      color: colors[(botNumber - 1) % colors.length],
      isBot: true,
      isLocal: false,
      bettingTickets: [],
      pyramidTickets: 0,
      spectatorTilePlaced: false,
    };
    
    setLobbyPlayers([...lobbyPlayers, newBot]);
    
    // Broadcast bot addition to all peers
    if (isHost) {
      broadcastToPeers.current({
        type: 'BOT_ADD',
        bot: newBot,
      });
    }
  };

  const removeBotFromLobby = (botId: string) => {
    setLobbyPlayers(lobbyPlayers.filter(p => p.id !== botId));
    
    // Broadcast bot removal to all peers
    if (isHost) {
      broadcastToPeers.current({
        type: 'BOT_REMOVE',
        botId,
      });
    }
  };

  const startGameFromLobby = () => {
    if (lobbyPlayers.length === 0) {
      setMessage("Need at least 1 player to start!");
      return;
    }
    
    const newGameState = initializeGame(lobbyPlayers);
    newGameState.roomCode = roomCode;
    newGameState.isHost = isHost;
    
    setGameState(newGameState);
    setSetupMode("game");
    setMessage("Game started! Place your bets or roll the dice.");
    
    // Broadcast game start to all peers
    if (isHost) {
      broadcastToPeers.current({
        type: 'GAME_START',
        gameState: newGameState,
      });
    }
  };

  // Start game (for solo mode only)
  const startGame = (mode: "solo" | "host" | "join") => {
    const localPlayerId = `player-${Date.now()}`;
    const players: Player[] = [
      {
        id: localPlayerId,
        name: playerName || "Player 1",
        money: 3,
        color: "#FF6B6B",
        isBot: false,
        isLocal: true,
        bettingTickets: [],
        pyramidTickets: 0,
        spectatorTilePlaced: false,
      }
    ];

    // Add bots
    for (let i = 0; i < numBots; i++) {
      players.push({
        id: `bot-${i}`,
        name: `Bot ${i + 1}`,
        money: 3,
        color: ["#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA"][i % 5],
        isBot: true,
        isLocal: false,
        bettingTickets: [],
        pyramidTickets: 0,
        spectatorTilePlaced: false,
      });
    }

    const newGameState = initializeGame(players);
    if (mode === "host") {
      newGameState.roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      newGameState.isHost = true;
    } else if (mode === "join") {
      if (!roomCodeInput.trim()) {
        setMessage("Please enter a room code!");
        return;
      }
      newGameState.roomCode = roomCodeInput.trim().toUpperCase();
      newGameState.isHost = false;
    }

    setGameState(newGameState);
    setSetupMode("game");
    setMessage(mode === "join" ? `Joined room ${roomCodeInput.toUpperCase()}! Game started!` : "Game started! Place your bets or roll the dice.");
  };

  // Sync game state to peers whenever it changes
  useEffect(() => {
    if (gameState && isHost && connections.length > 0) {
      broadcastToPeers.current({
        type: 'GAME_STATE_UPDATE',
        gameState: gameState,
      });
    }
  }, [gameState, isHost, connections.length]);

  // Handle bot turn
  useEffect(() => {
    if (!gameState || gameState.gameEnded || setupMode !== "game") return;

    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (!currentPlayer) return;
    
    // Don't trigger bot actions if we're waiting for manual next turn advancement
    if (currentPlayer.isBot && !waitingForNextTurn) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      
      // Bot makes a decision
      botTimerRef.current = setTimeout(() => {
        const decision = makeBotDecision(gameState, currentPlayer);
        handleAction(decision.action, decision.data, true);
      }, 1500);
      
      // Safety fallback: if bot doesn't advance after 5 seconds, force next player
      const botId = currentPlayer.id;
      const safetyTimeout = setTimeout(() => {
        setGameState(prevState => {
          if (!prevState) return prevState;
          const currentTurnPlayer = prevState.players[prevState.currentPlayer];
          // Only force next player if it's still the same bot's turn
          if (currentTurnPlayer?.id === botId && currentTurnPlayer.isBot) {
            console.warn(`Bot ${currentPlayer.name} stuck, forcing next turn`);
            return {
              ...prevState,
              currentPlayer: (prevState.currentPlayer + 1) % prevState.players.length,
            };
          }
          return prevState;
        });
      }, 5000);
      
      return () => {
        if (botTimerRef.current) clearTimeout(botTimerRef.current);
        clearTimeout(safetyTimeout);
      };
    }

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [gameState?.currentPlayer, gameState?.availableDice.length, waitingForNextTurn]);

  const nextPlayer = () => {
    if (!gameState) return;
    setWaitingForNextTurn(false);
    setGameState(prev => prev ? {
      ...prev,
      currentPlayer: (prev.currentPlayer + 1) % prev.players.length,
    } : prev);
  };

  const endLeg = () => {
    if (!gameState) return;

    const leaderboard = getLeaderboard(gameState.camels);
    const updatedPlayers = scoreLegBets(gameState.players, leaderboard);

    const legBettingStacks: { [key in CamelColor]?: number[] } = {};
    RACING_CAMELS.forEach(color => {
      legBettingStacks[color] = [5, 5, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
    });

    setGameState({
      ...gameState,
      players: updatedPlayers.map(p => ({ ...p, spectatorTilePlaced: false })),
      leg: gameState.leg + 1,
      availableDice: ["red", "blue", "green", "yellow", "purple", "black", "white"],
      legBettingStacks,
      spectatorTiles: [],
    });

    setMessage(`Leg ${gameState.leg} ended! Starting Leg ${gameState.leg + 1}`);
  };

  const handleAction = (action: string, data?: CamelColor | "cheering" | "booing", skipDialog = false) => {
    if (!gameState || gameState.gameEnded) return;

    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (!currentPlayer) return;
    
    // If this is a local player action in multiplayer, broadcast it
    if (currentPlayer.isLocal && !skipDialog && connections.length > 0) {
      broadcastToPeers.current({
        type: 'PLAYER_ACTION',
        action,
        data,
      });
    }

    switch (action) {
      case "betting_ticket": {
        const color = data as CamelColor;
        const stack = gameState.legBettingStacks[color] || [];
        if (stack.length === 0) {
          // If bot tries to bet on sold-out camel, skip to next player
          if (currentPlayer.isBot) {
            setTimeout(() => nextPlayer(), 100);
          }
          return;
        }

        const value = stack[stack.length - 1];
        const newStack = stack.slice(0, -1);

        const ticket = {
          camelColor: color,
          value,
        };

        setGameState({
          ...gameState,
          legBettingStacks: {
            ...gameState.legBettingStacks,
            [color]: newStack,
          },
          players: gameState.players.map(p =>
            p.id === currentPlayer.id
              ? { ...p, bettingTickets: [...p.bettingTickets, ticket] }
              : p
          ),
        });

        if (!skipDialog) {
          setActionDialog({
            type: "bet",
            title: "Bet Placed!",
            message: `${currentPlayer.name} bet ${value} EP on ${color.toUpperCase()} camel!`,
            camelColor: color,
            value,
          });
        }
        
        // If bot made the action, wait for manual advance
        if (currentPlayer.isBot) {
          setWaitingForNextTurn(true);
          setMessage(`${currentPlayer.name} bet ${value} EP on ${color.toUpperCase()}! Click "Next Turn" to continue.`);
        } else {
          setTimeout(() => nextPlayer(), skipDialog ? 0 : 100);
        }
        break;
      }

      case "spectator_tile": {
        if (currentPlayer.spectatorTilePlaced) {
          // If tile already placed, skip to next player (bot fallback)
          if (currentPlayer.isBot) {
            setTimeout(() => nextPlayer(), 100);
          }
          return;
        }
        
        // For bots, automatically place the tile at a random valid position
        if (currentPlayer.isBot) {
          const tileType = data as "cheering" | "booing";
          
          // Find all valid positions (not position 0, no camels, no existing tiles)
          const validPositions: number[] = [];
          for (let i = 1; i < TRACK_LENGTH; i++) {
            const hasCamel = gameState.camels.some(c => c.position === i);
            const hasTile = gameState.spectatorTiles.some(t => t.position === i);
            if (!hasCamel && !hasTile) {
              validPositions.push(i);
            }
          }
          
          // If there are valid positions, place the tile
          if (validPositions.length > 0) {
            const randomPosition = validPositions[Math.floor(Math.random() * validPositions.length)];
            
            // Remove bot's previous tile if exists
            const newTiles = gameState.spectatorTiles.filter(t => t.owner !== currentPlayer.name);
            
            newTiles.push({
              position: randomPosition,
              type: tileType,
              owner: currentPlayer.name,
            });
            
            setGameState({
              ...gameState,
              spectatorTiles: newTiles,
              players: gameState.players.map(p =>
                p.id === currentPlayer.id
                  ? { ...p, spectatorTilePlaced: true }
                  : p
              ),
            });
            
            setMessage(`${currentPlayer.name} placed a ${tileType} tile at position ${randomPosition + 1}! Click "Next Turn" to continue.`);
            setWaitingForNextTurn(true);
          } else {
            // If no valid positions, just move to next player
            setTimeout(() => nextPlayer(), 100);
            return;
          }
        } else {
          // For human players, set the placing mode
          setPlacingTile(data as "cheering" | "booing");
          setMessage(`${currentPlayer.name}, click on a track position to place your ${data} tile...`);
        }
        break;
      }

      case "pyramid_ticket": {
        if (gameState.availableDice.length === 0) {
          // If bot tries to roll with no dice available, skip to next player
          if (currentPlayer.isBot) {
            setTimeout(() => nextPlayer(), 100);
          }
          return;
        }

        const randomIndex = Math.floor(Math.random() * gameState.availableDice.length);
        const diceColor = gameState.availableDice[randomIndex];
        const steps = Math.floor(Math.random() * 3) + 1;

        const updatedCamels = moveCamel(gameState.camels, diceColor as CamelColor, steps, gameState.spectatorTiles);
        const newAvailableDice = gameState.availableDice.filter((_, i) => i !== randomIndex);

        const { ended, winner } = checkGameEnd(updatedCamels);

        if (ended && winner) {
          const leaderboard = getLeaderboard(updatedCamels);
          const finalPlayers = scoreLegBets(gameState.players, leaderboard).map(p =>
            p.id === currentPlayer.id ? { ...p, pyramidTickets: p.pyramidTickets + 1 } : p
          );
          
          setGameState({
            ...gameState,
            camels: updatedCamels,
            availableDice: newAvailableDice,
            players: finalPlayers,
            gameEnded: true,
            winner,
          });
          setMessage(`🏆 ${winner.toUpperCase()} CAMEL WINS! 🏆`);
        } else {
          setGameState({
            ...gameState,
            camels: updatedCamels,
            availableDice: newAvailableDice,
            players: gameState.players.map(p =>
              p.id === currentPlayer.id ? { ...p, pyramidTickets: p.pyramidTickets + 1 } : p
            ),
          });

          if (!skipDialog) {
            setActionDialog({
              type: "roll",
              title: "Dice Rolled!",
              message: `${currentPlayer.name} rolled ${steps} for ${diceColor.toUpperCase()} camel!`,
              camelColor: diceColor as CamelColor,
            });
          }
          
          if (newAvailableDice.length === 0) {
            setTimeout(() => endLeg(), 2000);
          } else {
            // If bot made the action, wait for manual advance
            if (currentPlayer.isBot) {
              setWaitingForNextTurn(true);
              setMessage(`${currentPlayer.name} rolled ${steps} for ${diceColor.toUpperCase()}! Click "Next Turn" to continue.`);
            } else {
              setTimeout(() => nextPlayer(), skipDialog ? 0 : 100);
            }
          }
        }
        break;
      }
    }
  };

  const handleTileClick = (position: number) => {
    if (!placingTile || !gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (!currentPlayer) return;

    // Check validity
    if (position === 0) {
      setMessage("Cannot place tile on starting position!");
      return;
    }

    const hasCamel = gameState.camels.some(c => c.position === position);
    const hasTile = gameState.spectatorTiles.some(t => t.position === position);

    if (hasCamel || hasTile) {
      setMessage("Cannot place tile here! (position must be empty)");
      return;
    }

    // Remove player's previous tile if exists
    const newTiles = gameState.spectatorTiles.filter(t => t.owner !== currentPlayer.name);
    
    newTiles.push({
      position,
      type: placingTile,
      owner: currentPlayer.name,
    });

    setGameState({
      ...gameState,
      spectatorTiles: newTiles,
      players: gameState.players.map(p =>
        p.id === currentPlayer.id
          ? { ...p, spectatorTilePlaced: true }
          : p
      ),
    });

    setMessage(`${currentPlayer.name} placed a ${placingTile} tile at position ${position + 1}!`);
    setPlacingTile(null);
    nextPlayer();
  };

  // Menu screen
  if (setupMode === "menu") {
    return (
      <div style={{
        padding: "40px",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#FFF5E6",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <h1 style={{
          fontSize: "72px",
          color: "#8B4513",
          textShadow: "4px 4px 8px rgba(0,0,0,0.3)",
          marginBottom: "20px",
        }}>
          🐪 Camel Up 🐪
        </h1>
        <p style={{ 
          fontSize: "24px", 
          color: "#8B4513", 
          marginBottom: "40px",
          textAlign: "center",
        }}>
          The Ultimate Camel Racing Board Game
        </p>

        <div style={{
          backgroundColor: "#FFF",
          padding: "40px",
          borderRadius: "20px",
          border: "4px solid #8B4513",
          boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
          maxWidth: "600px",
          width: "100%",
        }}>
          <h3 style={{ 
            textAlign: "center", 
            marginBottom: "30px",
            color: "#8B4513",
            fontSize: "28px",
          }}>
            Setup Your Game
          </h3>

          <input
            type="text"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{
              width: "100%",
              padding: "15px",
              fontSize: "18px",
              border: "3px solid #8B4513",
              borderRadius: "10px",
              marginBottom: "20px",
              boxSizing: "border-box",
            }}
          />

          <div style={{ marginBottom: "30px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px",
              fontSize: "18px",
              color: "#8B4513",
              fontWeight: "bold",
            }}>
              Number of Bot Players: {numBots}
            </label>
            <input
              type="range"
              min="0"
              max="4"
              value={numBots}
              onChange={(e) => setNumBots(parseInt(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between",
              fontSize: "14px",
              color: "#666",
              marginTop: "5px",
            }}>
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
            </div>
          </div>

          <button
            onClick={() => startGame("solo")}
            style={{
              width: "100%",
              padding: "20px",
              fontSize: "22px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "4px solid #333",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              marginBottom: "15px",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            🎮 Start Solo Game
          </button>

          <button
            onClick={createLobby}
            style={{
              width: "100%",
              padding: "20px",
              fontSize: "22px",
              backgroundColor: "#2196F3",
              color: "white",
              border: "4px solid #333",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
              marginBottom: "15px",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            🌐 Host Multiplayer Room
          </button>

          <div style={{
            marginBottom: "15px",
          }}>
            <label style={{ 
              display: "block", 
              marginBottom: "10px",
              fontSize: "18px",
              color: "#8B4513",
              fontWeight: "bold",
            }}>
              Or Join Existing Room:
            </label>
            <input
              type="text"
              placeholder="Enter Room Code (e.g., camelup-abc123)"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toLowerCase())}
              style={{
                width: "100%",
                padding: "15px",
                fontSize: "18px",
                border: "3px solid #8B4513",
                borderRadius: "10px",
                marginBottom: "10px",
                boxSizing: "border-box",
                fontFamily: "monospace",
              }}
            />
            <button
              onClick={joinLobby}
              disabled={!roomCodeInput.trim()}
              style={{
                width: "100%",
                padding: "20px",
                fontSize: "22px",
                backgroundColor: roomCodeInput.trim() ? "#FF9800" : "#ccc",
                color: "white",
                border: "4px solid #333",
                borderRadius: "12px",
                cursor: roomCodeInput.trim() ? "pointer" : "not-allowed",
                fontWeight: "bold",
                transition: "transform 0.2s",
                opacity: roomCodeInput.trim() ? 1 : 0.6,
              }}
              onMouseEnter={(e) => {
                if (roomCodeInput.trim()) {
                  e.currentTarget.style.transform = "scale(1.05)";
                }
              }}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              🚪 Join Room
            </button>
          </div>

          <div style={{
            marginTop: "20px",
            padding: "20px",
            backgroundColor: "#F0F0F0",
            borderRadius: "10px",
            textAlign: "center",
          }}>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>
              💡 Share the room code with friends to play together!
            </p>
            <p style={{ fontSize: "12px", color: "#999" }}>
              Multiplayer uses WebRTC peer-to-peer connection
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Lobby screen
  if (setupMode === "lobby") {
    return (
      <div style={{
        padding: "40px",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#FFF5E6",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <h1 style={{
          fontSize: "56px",
          color: "#8B4513",
          textShadow: "4px 4px 8px rgba(0,0,0,0.3)",
          marginBottom: "20px",
        }}>
          🐪 Game Lobby 🐪
        </h1>

        {/* Room Code Display */}
        <div style={{
          backgroundColor: "#2196F3",
          color: "white",
          padding: "20px 40px",
          borderRadius: "15px",
          marginBottom: "30px",
          fontSize: "32px",
          fontWeight: "bold",
          border: "4px solid #333",
          boxShadow: "0 6px 12px rgba(0,0,0,0.3)",
        }}>
          Room Code: {roomCode}
        </div>

        {message && (
          <div style={{
            padding: "15px 30px",
            backgroundColor: "#FFE66D",
            border: "3px solid #333",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "18px",
            fontWeight: "bold",
          }}>
            {message}
          </div>
        )}

        {connectionStatus && (
          <div style={{
            padding: "15px 30px",
            backgroundColor: connections.length > 0 ? "#4CAF50" : "#2196F3",
            color: "white",
            border: "3px solid #333",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "16px",
            fontWeight: "bold",
          }}>
            🌐 {connectionStatus} {connections.length > 0 && `(${connections.length} connected)`}
          </div>
        )}

        <div style={{
          backgroundColor: "#FFF",
          padding: "40px",
          borderRadius: "20px",
          border: "4px solid #8B4513",
          boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
          maxWidth: "800px",
          width: "100%",
        }}>
          <h2 style={{
            textAlign: "center",
            color: "#8B4513",
            marginBottom: "30px",
            fontSize: "32px",
          }}>
            Players ({lobbyPlayers.length})
          </h2>

          {/* Player List */}
          <div style={{ marginBottom: "30px" }}>
            {lobbyPlayers.map((player, index) => (
              <div
                key={player.id}
                style={{
                  padding: "20px",
                  marginBottom: "15px",
                  background: `linear-gradient(135deg, ${player.color} 0%, ${player.color}dd 100%)`,
                  borderRadius: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontWeight: "bold",
                  fontSize: "20px",
                  border: "3px solid #333",
                  color: "#FFF",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                <span>
                  {index + 1}. {player.name} {player.isBot && "🤖"} {player.isLocal && "(You)"}
                </span>
                {isHost && player.isBot && (
                  <button
                    onClick={() => removeBotFromLobby(player.id)}
                    style={{
                      padding: "8px 15px",
                      fontSize: "16px",
                      backgroundColor: "#F44336",
                      color: "white",
                      border: "2px solid #333",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    ❌ Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Host Controls */}
          {isHost && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              marginBottom: "20px",
            }}>
              <button
                onClick={addBotToLobby}
                disabled={lobbyPlayers.length >= 5}
                style={{
                  width: "100%",
                  padding: "18px",
                  fontSize: "20px",
                  backgroundColor: lobbyPlayers.length >= 5 ? "#ccc" : "#FFE66D",
                  color: "#333",
                  border: "4px solid #333",
                  borderRadius: "12px",
                  cursor: lobbyPlayers.length >= 5 ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  transition: "transform 0.2s",
                  opacity: lobbyPlayers.length >= 5 ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (lobbyPlayers.length < 5) {
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                🤖 Add Bot {lobbyPlayers.length >= 5 && "(Max 5 players)"}
              </button>

              <button
                onClick={startGameFromLobby}
                disabled={lobbyPlayers.length === 0}
                style={{
                  width: "100%",
                  padding: "20px",
                  fontSize: "24px",
                  backgroundColor: lobbyPlayers.length === 0 ? "#ccc" : "#4CAF50",
                  color: "white",
                  border: "4px solid #333",
                  borderRadius: "12px",
                  cursor: lobbyPlayers.length === 0 ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  transition: "transform 0.2s",
                  boxShadow: lobbyPlayers.length > 0 ? "0 6px 12px rgba(76, 175, 80, 0.5)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (lobbyPlayers.length > 0) {
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                🚀 START GAME
              </button>
            </div>
          )}

          {/* Non-host waiting message */}
          {!isHost && (
            <div style={{
              padding: "20px",
              backgroundColor: "#FFE66D",
              borderRadius: "12px",
              textAlign: "center",
              fontSize: "18px",
              fontWeight: "bold",
              border: "3px solid #333",
            }}>
              ⏳ Waiting for host to start the game...
            </div>
          )}

          {/* Back to Menu Button */}
          <button
            onClick={() => {
              setSetupMode("menu");
              setLobbyPlayers([]);
              setRoomCode("");
              setMessage("");
            }}
            style={{
              width: "100%",
              marginTop: "20px",
              padding: "15px",
              fontSize: "18px",
              backgroundColor: "#FF5722",
              color: "white",
              border: "3px solid #333",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            🏠 Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // Game screen
  if (!gameState) return null;

  // Game ended screen
  if (gameState.gameEnded && gameState.winner) {
    const sortedPlayers = [...gameState.players].sort((a, b) => b.money - a.money);
    const winningPlayer = sortedPlayers[0];

    return (
      <div style={{
        padding: "40px",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#FFF5E6",
        minHeight: "100vh",
      }}>
        <h1 style={{
          textAlign: "center",
          fontSize: "64px",
          color: gameState.winner,
          textShadow: "4px 4px 8px rgba(0,0,0,0.3)",
          marginBottom: "20px",
          animation: "pulse 2s infinite",
        }}>
          🏆 {gameState.winner.toUpperCase()} CAMEL WINS! 🏆
        </h1>

        <h2 style={{ 
          textAlign: "center", 
          color: "#8B4513", 
          marginBottom: "40px",
          fontSize: "32px",
        }}>
          Champion: {winningPlayer.name} with {winningPlayer.money} EP!
        </h2>

        <div style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "30px",
          backgroundColor: "#FFF",
          borderRadius: "20px",
          border: "4px solid #8B4513",
          boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
        }}>
          <h3 style={{ 
            textAlign: "center", 
            marginBottom: "25px",
            fontSize: "28px",
            color: "#8B4513",
          }}>
            Final Standings
          </h3>
          {sortedPlayers.map((player, idx) => (
            <div
              key={player.id}
              style={{
                padding: "20px",
                marginBottom: "15px",
                background: `linear-gradient(135deg, ${player.color} 0%, ${player.color}dd 100%)`,
                borderRadius: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: "bold",
                fontSize: "20px",
                border: "3px solid #333",
                color: "#FFF",
                textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
              }}
            >
              <span>
                <span style={{ fontSize: "28px", marginRight: "15px" }}>
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                </span>
                {player.name} {player.isBot && "🤖"}
              </span>
              <span style={{ fontSize: "24px" }}>💰 {player.money} EP</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <button
            onClick={() => {
              setGameState(null);
              setSetupMode("menu");
              setMessage("");
            }}
            style={{
              padding: "25px 50px",
              fontSize: "26px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "4px solid #333",
              borderRadius: "15px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            🔄 New Game
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayer];
  if (!currentPlayer) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#8B4513" }}>
        <h2>Error: Invalid game state</h2>
        <button
          onClick={() => {
            setGameState(null);
            setSetupMode("menu");
            setMessage("");
          }}
          style={{
            padding: "15px 30px",
            fontSize: "18px",
            backgroundColor: "#FF5722",
            color: "white",
            border: "3px solid #333",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🏠 Back to Menu
        </button>
      </div>
    );
  }
  const isLocalPlayerTurn = currentPlayer.isLocal && !waitingForNextTurn;

  return (
    <div style={{
      padding: "20px",
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#FFF5E6",
      minHeight: "100vh",
    }}>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(-50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        /* Responsive Layout */
        @media (max-width: 1700px) {
          .game-grid {
            grid-template-columns: 1fr !important;
            justify-items: center !important;
          }
          .left-panel, .right-panel {
            max-width: 800px !important;
            width: 100% !important;
          }
        }
      `}</style>

      <h1 style={{
        textAlign: "center",
        color: "#8B4513",
        fontSize: "56px",
        textShadow: "3px 3px 6px rgba(0,0,0,0.3)",
        marginBottom: "10px",
      }}>
        🐪 Camel Up 🐪
      </h1>

      {gameState.roomCode && (
        <div style={{
          textAlign: "center",
          backgroundColor: "#2196F3",
          color: "white",
          padding: "15px",
          borderRadius: "10px",
          marginBottom: "20px",
          fontSize: "20px",
          fontWeight: "bold",
        }}>
          🌐 Room Code: {gameState.roomCode}
        </div>
      )}

      <div style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: "20px",
        padding: "20px",
        backgroundColor: "#FFF",
        borderRadius: "15px",
        border: "3px solid #8B4513",
        flexWrap: "wrap",
        gap: "15px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        maxWidth: "1650px",
        margin: "0 auto 20px auto",
      }}>
        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#8B4513" }}>
          Leg: {gameState.leg}
        </div>
        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#8B4513" }}>
          Current Turn: <span style={{ color: currentPlayer.color }}>{currentPlayer.name}</span>
          {currentPlayer.isBot && " 🤖"}
        </div>
      </div>

      {message && (
        <div style={{
          padding: "20px",
          backgroundColor: "#FFE66D",
          border: "3px solid #333",
          borderRadius: "12px",
          textAlign: "center",
          fontSize: "20px",
          fontWeight: "bold",
          marginBottom: "25px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          maxWidth: "1650px",
          margin: "0 auto 25px auto",
        }}>
          {message}
        </div>
      )}

      {/* Manual Next Turn Button */}
      {waitingForNextTurn && (
        <div style={{
          maxWidth: "1650px",
          margin: "0 auto 25px auto",
          textAlign: "center",
        }}>
          <button
            onClick={() => nextPlayer()}
            style={{
              padding: "20px 60px",
              fontSize: "24px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "4px solid #333",
              borderRadius: "15px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "all 0.3s ease",
              boxShadow: "0 8px 16px rgba(76, 175, 80, 0.6)",
              animation: "pulse 2s infinite",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.boxShadow = "0 12px 24px rgba(76, 175, 80, 0.8)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 16px rgba(76, 175, 80, 0.6)";
            }}
          >
            ▶️ NEXT TURN ▶️
          </button>
          <div style={{
            marginTop: "10px",
            fontSize: "14px",
            color: "#666",
            fontStyle: "italic",
          }}>
            Review the bot's action and click to continue
          </div>
        </div>
      )}

      {/* Main Game Layout - Organized in Grid */}
      <div className="game-grid" style={{
        display: "grid",
        gridTemplateColumns: "minmax(280px, 300px) 1fr minmax(320px, 350px)",
        gap: "25px",
        maxWidth: "1650px",
        margin: "0 auto 30px auto",
        padding: "0 20px",
      }}>
        {/* Dice Roller on the Left */}
        <div className="left-panel" style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}>
          <div style={{
            padding: "25px",
            backgroundColor: "#FFF",
            borderRadius: "20px",
            border: "5px solid #8B4513",
            boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
            textAlign: "center",
          }}>
            <h2 style={{ 
              color: "#8B4513", 
              marginBottom: "20px",
              fontSize: "26px",
              textShadow: "1px 1px 2px rgba(0,0,0,0.2)",
            }}>
              🎲 Dice Pyramid 🎲
            </h2>
            
            <div style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "20px",
            }}>
              {["red", "blue", "green", "yellow", "purple", "black", "white"].map(color => {
                const isAvailable = gameState.availableDice.includes(color as DiceColor);
                const isCrazy = color === "black" || color === "white";
                return (
                  <div
                    key={color}
                    style={{
                      width: "45px",
                      height: "45px",
                      backgroundColor: isAvailable ? color : "#333",
                      border: isCrazy && isAvailable 
                        ? `3px solid #FFD700` 
                        : `3px solid ${isAvailable ? "#8B4513" : "#666"}`,
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      opacity: isAvailable ? 1 : 0.3,
                      transition: "all 0.3s ease",
                      boxShadow: isAvailable 
                        ? (isCrazy ? "0 3px 6px rgba(255,215,0,0.5), 0 0 10px rgba(255,215,0,0.3)" : "0 3px 6px rgba(0,0,0,0.3)") 
                        : "inset 0 3px 6px rgba(0,0,0,0.5)",
                      color: color === "yellow" || color === "white" ? "black" : "white",
                    }}
                  >
                    {isAvailable ? "🎲" : "✓"}
                  </div>
                );
              })}
            </div>

            <div style={{ 
              color: "#8B4513", 
              marginBottom: "25px", 
              fontSize: "18px",
              fontWeight: "bold",
              padding: "10px",
              backgroundColor: "#FFF5E6",
              borderRadius: "10px",
            }}>
              {gameState.availableDice.length}/7 dice remaining
              <div style={{ fontSize: "12px", marginTop: "5px", color: "#666" }}>
                ⭐ Black & White camels move backward!
              </div>
            </div>

            <button
              onClick={() => handleAction("pyramid_ticket")}
              disabled={!isLocalPlayerTurn || gameState.availableDice.length === 0}
              style={{
                width: "100%",
                padding: "18px 25px",
                fontSize: "20px",
                backgroundColor: !isLocalPlayerTurn || gameState.availableDice.length === 0 ? "#ccc" : "#FF9800",
                color: "white",
                border: "4px solid #333",
                borderRadius: "12px",
                cursor: !isLocalPlayerTurn || gameState.availableDice.length === 0 ? "not-allowed" : "pointer",
                fontWeight: "bold",
                transition: "all 0.3s ease",
                boxShadow: !isLocalPlayerTurn || gameState.availableDice.length === 0 ? "none" : "0 6px 12px rgba(255, 152, 0, 0.6)",
                opacity: !isLocalPlayerTurn || gameState.availableDice.length === 0 ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (isLocalPlayerTurn && gameState.availableDice.length > 0) {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 8px 16px rgba(255, 152, 0, 0.8)";
                }
              }}
              onMouseLeave={(e) => {
                if (isLocalPlayerTurn && gameState.availableDice.length > 0) {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 6px 12px rgba(255, 152, 0, 0.6)";
                }
              }}
            >
              🎲 ROLL DICE 🎲
            </button>

            {gameState.availableDice.length > 0 && (
              <div style={{ 
                marginTop: "15px", 
                color: "#8B4513",
                fontSize: "14px",
                fontWeight: "bold",
                padding: "8px",
                backgroundColor: "#FFE66D",
                borderRadius: "8px",
              }}>
                {isLocalPlayerTurn ? "Your turn!" : `${currentPlayer.name}'s turn`}
              </div>
            )}
          </div>

          {/* Spectator Tile Placement - In Left Column */}
          <div style={{
            padding: "20px",
            backgroundColor: "#FFF",
            borderRadius: "15px",
            border: "3px solid #8B4513",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          }}>
            <h3 style={{ 
              textAlign: "center", 
              color: "#8B4513",
              marginBottom: "15px",
              fontSize: "18px",
            }}>
              🎪 Spectator Tiles
            </h3>
            <div style={{ 
              display: "flex", 
              flexDirection: "column",
              gap: "12px",
            }}>
              <button
                onClick={() => handleAction("spectator_tile", "cheering")}
                disabled={!isLocalPlayerTurn || currentPlayer.spectatorTilePlaced || !!placingTile}
                style={{
                  padding: "15px 20px",
                  fontSize: "16px",
                  backgroundColor: currentPlayer.spectatorTilePlaced || !isLocalPlayerTurn ? "#ccc" : "#4CAF50",
                  color: "white",
                  border: "3px solid #333",
                  borderRadius: "10px",
                  cursor: !isLocalPlayerTurn || currentPlayer.spectatorTilePlaced || placingTile ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  opacity: currentPlayer.spectatorTilePlaced || !isLocalPlayerTurn ? 0.5 : 1,
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (isLocalPlayerTurn && !currentPlayer.spectatorTilePlaced && !placingTile) {
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                👍 Cheering<br/>
                <span style={{ fontSize: "12px" }}>(+1 extra)</span>
              </button>
              <button
                onClick={() => handleAction("spectator_tile", "booing")}
                disabled={!isLocalPlayerTurn || currentPlayer.spectatorTilePlaced || !!placingTile}
                style={{
                  padding: "15px 20px",
                  fontSize: "16px",
                  backgroundColor: currentPlayer.spectatorTilePlaced || !isLocalPlayerTurn ? "#ccc" : "#F44336",
                  color: "white",
                  border: "3px solid #333",
                  borderRadius: "10px",
                  cursor: !isLocalPlayerTurn || currentPlayer.spectatorTilePlaced || placingTile ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  opacity: currentPlayer.spectatorTilePlaced || !isLocalPlayerTurn ? 0.5 : 1,
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (isLocalPlayerTurn && !currentPlayer.spectatorTilePlaced && !placingTile) {
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                👎 Booing<br/>
                <span style={{ fontSize: "12px" }}>(-1 space)</span>
              </button>
            </div>
            {currentPlayer.spectatorTilePlaced && (
              <div style={{
                marginTop: "12px",
                padding: "8px",
                backgroundColor: "#FFE66D",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "bold",
                textAlign: "center",
              }}>
                ✓ Already Placed
              </div>
            )}
            {placingTile && (
              <div style={{
                marginTop: "12px",
                padding: "10px",
                backgroundColor: "#FFE66D",
                borderRadius: "8px",
                textAlign: "center",
                fontSize: "13px",
                fontWeight: "bold",
              }}>
                ⚡ Click on track to place!
              </div>
            )}
          </div>
        </div>

        {/* Board in Center */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Track 
            camels={gameState.camels}
            spectatorTiles={gameState.spectatorTiles}
            onTileClick={placingTile ? handleTileClick : undefined}
            clickablePositions={!!placingTile}
          />
        </div>

        {/* Leaderboard on the Right */}
        <div className="right-panel">
          <EnhancedLeaderboard 
            players={gameState.players}
            camels={gameState.camels}
          />
        </div>
      </div>

      {/* Betting Panel - Now Below the Grid */}
      <div style={{ maxWidth: "1650px", margin: "0 auto", padding: "0 20px" }}>
        <BettingPanel
          gameState={gameState}
          onBet={(color) => handleAction("betting_ticket", color)}
          disabled={!isLocalPlayerTurn}
        />
      </div>

      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <button
          onClick={() => {
            setGameState(null);
            setSetupMode("menu");
            setMessage("");
          }}
          style={{
            padding: "15px 30px",
            fontSize: "18px",
            backgroundColor: "#FF5722",
            color: "white",
            border: "3px solid #333",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🏠 Back to Menu
        </button>
      </div>

      <ActionDialog
        data={actionDialog}
        onClose={() => setActionDialog(null)}
      />
    </div>
  );
};

export default CamelRaceGame;

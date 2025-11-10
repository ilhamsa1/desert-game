import React, { useState } from "react";

// Full Camel Up Game Implementation

type CamelColor = "red" | "blue" | "green" | "yellow" | "purple" | "white" | "black";
type DiceColor = "red" | "blue" | "green" | "yellow" | "purple" | "grey";

type Camel = {
  color: CamelColor;
  position: number;
  stackOrder: number; // Order in stack (0 = bottom, higher = top)
  type: "racing" | "crazy";
};

type SpectatorTile = {
  position: number;
  type: "cheering" | "booing"; // +1 or -1
  owner: string;
};

type BettingTicket = {
  camelColor: CamelColor;
  value: number;
  playerId: number;
};

type FinishCard = {
  camelColor: CamelColor;
  playerId: number;
  type: "winner" | "loser";
};

type Player = {
  id: number;
  name: string;
  money: number;
  color: string;
  spectatorTilePlaced: boolean;
  finishCards: CamelColor[]; // Available finish cards
  bettingTickets: BettingTicket[]; // Tickets held this leg
  pyramidTickets: number; // Count of pyramid tickets earned this leg
  partnershipAvailable: boolean;
  partnerId: number | null;
};

type GameState = {
  camels: Camel[];
  players: Player[];
  currentPlayer: number;
  
  // Dice management
  availableDice: DiceColor[]; // Dice not yet rolled this leg
  
  // Betting
  legBettingStacks: { [key in CamelColor]?: number[] }; // Available tickets per camel
  legBets: BettingTicket[]; // All bets placed this leg
  finishBets: FinishCard[]; // Overall winner/loser bets
  
  // Board state
  spectatorTiles: SpectatorTile[];
  
  // Game progress
  leg: number;
  gameEnded: boolean;
  winner: CamelColor | null;
  lastInRacing: CamelColor | null;
};

const TRACK_LENGTH = 16;
const RACING_CAMELS: CamelColor[] = ["red", "blue", "green", "yellow", "purple"];
const CRAZY_CAMELS: CamelColor[] = ["white", "black"];

// Initialize game with proper setup
const initializeGame = (numPlayers: number): GameState => {
  const players: Player[] = Array.from({ length: numPlayers }, (_, i) => ({
    id: i,
    name: `Player ${i + 1}`,
    money: 3,
    color: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA", "#FCBAD3", "#A8D8EA"][i],
    spectatorTilePlaced: false,
    finishCards: [...RACING_CAMELS],
    bettingTickets: [],
    pyramidTickets: 0,
    partnershipAvailable: numPlayers >= 6,
    partnerId: null,
  }));

  // Setup initial camel positions by rolling each die once
  const camels: Camel[] = [];
  const positionCounts: { [key: number]: number } = {};
  
  RACING_CAMELS.forEach(color => {
    const roll = Math.floor(Math.random() * 3) + 1; // 1-3
    const position = roll - 1; // 0-indexed
    const stackOrder = positionCounts[position] || 0;
    positionCounts[position] = stackOrder + 1;
    
    camels.push({
      color,
      position,
      stackOrder,
      type: "racing"
    });
  });

  // Place crazy camels based on grey die roll
  const greyRoll = Math.floor(Math.random() * 3) + 1;
  const crazyPositions = [1, 15, 16][greyRoll - 1];
  
  CRAZY_CAMELS.forEach((color, idx) => {
    const position = crazyPositions === 16 ? 15 : crazyPositions; // Adjust for 0-indexed
    const stackOrder = positionCounts[position] || 0;
    positionCounts[position] = stackOrder + 1;
    
    camels.push({
      color,
      position,
      stackOrder: stackOrder + idx,
      type: "crazy"
    });
  });

  // Initialize betting stacks
  const legBettingStacks: { [key in CamelColor]?: number[] } = {};
  RACING_CAMELS.forEach(color => {
    legBettingStacks[color] = [5, 3, 2];
  });

  return {
    camels,
    players,
    currentPlayer: 0,
    availableDice: ["red", "blue", "green", "yellow", "purple", "grey"],
    legBettingStacks,
    legBets: [],
    finishBets: [],
    spectatorTiles: [],
    leg: 1,
    gameEnded: false,
    winner: null,
    lastInRacing: null,
  };
};

// Get current race standings
const getLeaderboard = (camels: Camel[]): Camel[] => {
  const racingCamels = camels.filter(c => c.type === "racing");
  return [...racingCamels].sort((a, b) => {
    if (a.position !== b.position) {
      return b.position - a.position; // Higher position is better
    }
    return b.stackOrder - a.stackOrder; // Higher stack is better
  });
};

// Get last place in racing
const getLastPlace = (camels: Camel[]): Camel => {
  const racingCamels = camels.filter(c => c.type === "racing");
  return [...racingCamels].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position; // Lower position is worse
    }
    return a.stackOrder - b.stackOrder; // Lower stack is worse
  })[0];
};

// Move a camel and its stack
const moveCamel = (
  camels: Camel[],
  camelColor: CamelColor,
  steps: number,
  spectatorTiles: SpectatorTile[]
): Camel[] => {
  const selectedCamel = camels.find(c => c.color === camelColor);
  if (!selectedCamel) return camels;

  const isCrazy = selectedCamel.type === "crazy";
  const direction = isCrazy ? -1 : 1; // Crazy camels go counterclockwise (backward)

  // Find all camels on the same position
  const camelsOnSamePosition = camels.filter(c => c.position === selectedCamel.position);
  
  // Find all camels that will move (selected camel and all above it)
  const movingCamels = camelsOnSamePosition.filter(c => c.stackOrder >= selectedCamel.stackOrder);

  // Calculate new position
  let newPosition = selectedCamel.position + (steps * direction);

  // Check for spectator tile at the new position
  const spectatorTile = spectatorTiles.find(tile => tile.position === newPosition);
  if (spectatorTile) {
    newPosition += spectatorTile.type === "cheering" ? 1 : -1;
  }

  // Ensure position stays within bounds
  newPosition = Math.max(0, Math.min(newPosition, TRACK_LENGTH + 2));

  // Find camels already at destination
  const camelsAtDestination = camels.filter(
    c => c.position === newPosition && !movingCamels.includes(c)
  );

  const maxStackAtDestination = camelsAtDestination.length > 0
    ? Math.max(...camelsAtDestination.map(c => c.stackOrder))
    : -1;

  // Move the camels
  return camels.map(camel => {
    const movingIndex = movingCamels.findIndex(c => c.color === camel.color);
    
    if (movingIndex >= 0) {
      // This camel is moving
      const relativeStackPosition = camel.stackOrder - selectedCamel.stackOrder;
      return {
        ...camel,
        position: newPosition,
        stackOrder: maxStackAtDestination + 1 + relativeStackPosition,
      };
    } else if (camel.position === selectedCamel.position && camel.stackOrder < selectedCamel.stackOrder) {
      // Camels below the moved camel stay but their stack order doesn't change
      return camel;
    }
    
    return camel;
  });
};

// Check if game has ended
const checkGameEnd = (camels: Camel[]): { ended: boolean; winner: CamelColor | null; lastPlace: CamelColor | null } => {
  const racingCamels = camels.filter(c => c.type === "racing");
  
  // Check if any racing camel crossed the finish line
  const winnersOverLine = racingCamels.filter(c => c.position >= TRACK_LENGTH);
  
  if (winnersOverLine.length > 0) {
    const leaderboard = getLeaderboard(camels);
    const winner = leaderboard[0].color;
    const lastPlace = getLastPlace(camels).color;
    return { ended: true, winner, lastPlace };
  }
  
  return { ended: false, winner: null, lastPlace: null };
};

// Score leg bets
const scoreLegBets = (
  players: Player[],
  _legBets: BettingTicket[],
  leaderboard: Camel[]
): Player[] => {
  const firstPlace = leaderboard[0];
  const secondPlace = leaderboard[1];

  return players.map(player => {
    let earnings = 0;
    
    // Score betting tickets
    player.bettingTickets.forEach(ticket => {
      if (ticket.camelColor === firstPlace.color) {
        earnings += 5;
      } else if (ticket.camelColor === secondPlace.color) {
        earnings += 1;
      } else {
        earnings -= 1;
      }
    });

    // Score pyramid tickets
    earnings += player.pyramidTickets;

    // Apply partnership bonuses
    if (player.partnerId !== null) {
      const partner = players[player.partnerId];
      partner.bettingTickets.forEach(ticket => {
        if (ticket.camelColor === firstPlace.color) {
          earnings += 5;
        } else if (ticket.camelColor === secondPlace.color) {
          earnings += 1;
        } else {
          earnings -= 1;
        }
      });
    }

    return {
      ...player,
      money: Math.max(0, player.money + earnings),
      bettingTickets: [],
      pyramidTickets: 0,
      spectatorTilePlaced: false,
      partnerId: null,
      partnershipAvailable: player.partnershipAvailable,
    };
  });
};

// Score final bets
const scoreFinalBets = (
  players: Player[],
  finishBets: FinishCard[],
  winner: CamelColor,
  loser: CamelColor
): Player[] => {
  const payouts = [8, 5, 3, 2, 1];
  
  // Process winner bets
  const winnerBets = finishBets.filter(b => b.type === "winner");
  const correctWinnerBets = winnerBets.filter(b => b.camelColor === winner);
  const incorrectWinnerBets = winnerBets.filter(b => b.camelColor !== winner);

  // Process loser bets
  const loserBets = finishBets.filter(b => b.type === "loser");
  const correctLoserBets = loserBets.filter(b => b.camelColor === loser);
  const incorrectLoserBets = loserBets.filter(b => b.camelColor !== loser);

  return players.map(player => {
    let earnings = 0;

    // Score correct winner bets
    const playerCorrectWinnerBets = correctWinnerBets.filter(b => b.playerId === player.id);
    playerCorrectWinnerBets.forEach((_, idx) => {
      earnings += payouts[Math.min(idx, payouts.length - 1)];
    });

    // Score incorrect winner bets
    const playerIncorrectWinnerBets = incorrectWinnerBets.filter(b => b.playerId === player.id);
    earnings -= playerIncorrectWinnerBets.length;

    // Score correct loser bets
    const playerCorrectLoserBets = correctLoserBets.filter(b => b.playerId === player.id);
    playerCorrectLoserBets.forEach((_, idx) => {
      earnings += payouts[Math.min(idx, payouts.length - 1)];
    });

    // Score incorrect loser bets
    const playerIncorrectLoserBets = incorrectLoserBets.filter(b => b.playerId === player.id);
    earnings -= playerIncorrectLoserBets.length;

    return {
      ...player,
      money: Math.max(0, player.money + earnings),
    };
  });
};

// Components

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

  const getCamelPosition = (position: number) => {
    let displayPosition = position;
    
    if (displayPosition < 0) displayPosition = 0;
    if (displayPosition >= totalPositions) displayPosition = totalPositions - 1;

    let x = 0, y = 0;

    if (displayPosition < positionPerSide) {
      x = (trackWidth / positionPerSide) * displayPosition;
      y = 0;
    } else if (displayPosition < positionPerSide * 2) {
      x = trackWidth;
      y = (trackHeight / positionPerSide) * (displayPosition - positionPerSide);
    } else if (displayPosition < positionPerSide * 3) {
      x = trackWidth - (trackWidth / positionPerSide) * (displayPosition - positionPerSide * 2);
      y = trackHeight;
    } else {
      x = 0;
      y = trackHeight - (trackHeight / positionPerSide) * (displayPosition - positionPerSide * 3);
    }

    return { x: x - 25, y: y - 25 };
  };

  return (
    <div
      style={{
        position: "relative",
        width: `${trackWidth}px`,
        height: `${trackHeight}px`,
        margin: "20px auto",
        border: "4px solid #8B4513",
        backgroundColor: "#F4A460",
        borderRadius: "10px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
      }}
    >
      {/* Track positions */}
      {Array.from({ length: totalPositions }).map((_, index) => {
        const { x, y } = getCamelPosition(index);
        const spectatorTile = spectatorTiles.find(tile => tile.position === index);
        const hasCamel = camels.some(c => c.position === index);

        return (
          <div
            key={index}
            onClick={() => clickablePositions && onTileClick?.(index)}
            style={{
              position: "absolute",
              left: `${x + 15}px`,
              top: `${y + 15}px`,
              width: "60px",
              height: "60px",
              backgroundColor: index === 0 ? "#4CAF50" : "#FFF8DC",
              border: "2px solid #8B4513",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "bold",
              color: "#333",
              cursor: clickablePositions && !hasCamel && !spectatorTile ? "pointer" : "default",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => {
              if (clickablePositions && !hasCamel && !spectatorTile) {
                e.currentTarget.style.transform = "scale(1.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {index + 1}
            {spectatorTile && (
              <div style={{
                position: "absolute",
                bottom: "2px",
                fontSize: "20px"
              }}>
                {spectatorTile.type === "cheering" ? "👍" : "👎"}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Camels */}
      {camels.map((camel) => {
        const { x, y } = getCamelPosition(camel.position);
        return (
          <div
            key={camel.color}
            style={{
              position: "absolute",
              left: `${x + 15}px`,
              top: `${y - 5 - (camel.stackOrder * 35)}px`,
              width: "60px",
              height: "40px",
              backgroundColor: camel.color,
              border: "3px solid #333",
              borderRadius: "20px 20px 10px 10px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: camel.color === 'white' || camel.color === 'yellow' ? 'black' : 'white',
              fontWeight: "bold",
              fontSize: "10px",
              zIndex: 10 + camel.stackOrder,
              transition: "all 0.6s ease-in-out",
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            {camel.type === "crazy" ? "🔙" : "🐪"}
          </div>
        );
      })}
    </div>
  );
};

const DicePyramid: React.FC<{
  availableDice: DiceColor[];
}> = ({ availableDice }) => {
  const allDice: DiceColor[] = ["red", "blue", "green", "yellow", "purple", "grey"];
  
  return (
    <div style={{
      padding: "20px",
      backgroundColor: "#8B4513",
      borderRadius: "15px",
      border: "4px solid #654321",
      boxShadow: "0 6px 12px rgba(0,0,0,0.4)",
      textAlign: "center",
      margin: "20px auto",
      maxWidth: "450px"
    }}>
      <h3 style={{ color: "#FFE66D", marginBottom: "15px" }}>🎲 Dice Pyramid 🎲</h3>
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "10px",
        flexWrap: "wrap"
      }}>
        {allDice.map(color => {
          const isAvailable = availableDice.includes(color);
          const displayColor = color === "grey" ? "#808080" : color;
          return (
            <div
              key={color}
              style={{
                width: "50px",
                height: "50px",
                backgroundColor: isAvailable ? displayColor : "#333",
                border: `3px solid ${isAvailable ? "#FFF" : "#666"}`,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                color: (color === "yellow" || color === "grey") ? "black" : "white",
                opacity: isAvailable ? 1 : 0.3,
                transition: "all 0.3s ease",
                boxShadow: isAvailable ? "0 2px 4px rgba(255,255,255,0.3)" : "inset 0 2px 4px rgba(0,0,0,0.5)"
              }}
            >
              {isAvailable ? "🎲" : "✓"}
            </div>
          );
        })}
      </div>
      <div style={{ color: "#FFE66D", marginTop: "10px", fontSize: "14px" }}>
        Remaining: {availableDice.length}/6
      </div>
    </div>
  );
};

const PlayerPanel: React.FC<{ 
  players: Player[];
  currentPlayer: number;
}> = ({ players, currentPlayer }) => {
  return (
    <div style={{ 
      marginTop: "20px",
      padding: "15px",
      backgroundColor: "#f9f9f9",
      borderRadius: "10px",
      border: "2px solid #ddd"
    }}>
      <h3>Players</h3>
      <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
        {players.map((player, idx) => (
          <div
            key={player.id}
            style={{
              padding: "15px",
              backgroundColor: idx === currentPlayer ? player.color : "#fff",
              border: `3px solid ${player.color}`,
              borderRadius: "8px",
              fontWeight: idx === currentPlayer ? "bold" : "normal",
              minWidth: "150px",
            }}
          >
            <div style={{ fontSize: "16px" }}>{player.name}</div>
            <div style={{ fontSize: "18px", marginTop: "5px" }}>💰 {player.money} EP</div>
            <div style={{ fontSize: "12px", marginTop: "5px" }}>
              Tickets: {player.bettingTickets.length} | Pyramid: {player.pyramidTickets}
            </div>
            {player.partnerId !== null && (
              <div style={{ fontSize: "12px", color: "#FF1493", marginTop: "3px" }}>
                🤝 Partner: {players[player.partnerId].name}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ActionPanel: React.FC<{
  gameState: GameState;
  onAction: (action: string, data?: any) => void;
}> = ({ gameState, onAction }) => {
  const currentPlayer = gameState.players[gameState.currentPlayer];
  
  return (
    <div style={{
      marginTop: "20px",
      padding: "20px",
      backgroundColor: "#FFF",
      borderRadius: "10px",
      border: "3px solid #8B4513",
    }}>
      <h2 style={{ textAlign: "center", color: "#8B4513" }}>
        Current Turn: {currentPlayer.name}
      </h2>
      
      <div style={{ marginTop: "20px" }}>
        <h3>Action 1: Take Betting Ticket</h3>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {RACING_CAMELS.map(color => {
            const stack = gameState.legBettingStacks[color] || [];
            const nextValue = stack[stack.length - 1];
            
            return (
              <button
                key={color}
                onClick={() => onAction("betting_ticket", color)}
                disabled={stack.length === 0}
                style={{
                  padding: "12px 20px",
                  fontSize: "14px",
                  backgroundColor: color,
                  color: color === "yellow" ? "black" : "white",
                  border: "3px solid #333",
                  borderRadius: "8px",
                  cursor: stack.length > 0 ? "pointer" : "not-allowed",
                  fontWeight: "bold",
                  opacity: stack.length > 0 ? 1 : 0.4,
                }}
              >
                {color.toUpperCase()}<br/>
                {stack.length > 0 ? `+${nextValue} EP` : "None"}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Action 2: Place Spectator Tile</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => onAction("spectator_tile", "cheering")}
            disabled={currentPlayer.spectatorTilePlaced}
            style={{
              padding: "12px 20px",
              fontSize: "16px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "3px solid #333",
              borderRadius: "8px",
              cursor: currentPlayer.spectatorTilePlaced ? "not-allowed" : "pointer",
              opacity: currentPlayer.spectatorTilePlaced ? 0.4 : 1,
            }}
          >
            👍 Cheering (+1)
          </button>
          <button
            onClick={() => onAction("spectator_tile", "booing")}
            disabled={currentPlayer.spectatorTilePlaced}
            style={{
              padding: "12px 20px",
              fontSize: "16px",
              backgroundColor: "#F44336",
              color: "white",
              border: "3px solid #333",
              borderRadius: "8px",
              cursor: currentPlayer.spectatorTilePlaced ? "not-allowed" : "pointer",
              opacity: currentPlayer.spectatorTilePlaced ? 0.4 : 1,
            }}
          >
            👎 Booing (-1)
          </button>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Action 3: Take Pyramid Ticket & Roll Die</h3>
        <button
          onClick={() => onAction("pyramid_ticket")}
          disabled={gameState.availableDice.length === 0}
          style={{
            padding: "15px 30px",
            fontSize: "18px",
            backgroundColor: "#FF9800",
            color: "white",
            border: "3px solid #333",
            borderRadius: "8px",
            cursor: gameState.availableDice.length > 0 ? "pointer" : "not-allowed",
            fontWeight: "bold",
            opacity: gameState.availableDice.length > 0 ? 1 : 0.4,
          }}
        >
          🎲 Roll Die (+1 EP)
        </button>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Action 4: Bet on Overall Winner/Loser</h3>
        <div>
          <h4>Overall Winner:</h4>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
            {RACING_CAMELS.filter(c => currentPlayer.finishCards.includes(c)).map(color => (
              <button
                key={`winner-${color}`}
                onClick={() => onAction("finish_bet", { color, type: "winner" })}
                style={{
                  padding: "10px 15px",
                  backgroundColor: color,
                  color: color === "yellow" ? "black" : "white",
                  border: "2px solid #333",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {color.toUpperCase()}
              </button>
            ))}
          </div>
          
          <h4>Overall Loser:</h4>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {RACING_CAMELS.filter(c => currentPlayer.finishCards.includes(c)).map(color => (
              <button
                key={`loser-${color}`}
                onClick={() => onAction("finish_bet", { color, type: "loser" })}
                style={{
                  padding: "10px 15px",
                  backgroundColor: color,
                  color: color === "yellow" ? "black" : "white",
                  border: "2px solid #333",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {color.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {gameState.players.length >= 6 && currentPlayer.partnershipAvailable && (
        <div style={{ marginTop: "20px" }}>
          <h3>Action 5: Enter Partnership (6+ players)</h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {gameState.players
              .filter(p => p.id !== currentPlayer.id && p.partnershipAvailable && p.partnerId === null)
              .map(partner => (
                <button
                  key={partner.id}
                  onClick={() => onAction("partnership", partner.id)}
                  style={{
                    padding: "10px 15px",
                    backgroundColor: partner.color,
                    color: "white",
                    border: "2px solid #333",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  🤝 Partner with {partner.name}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Leaderboard: React.FC<{ camels: Camel[] }> = ({ camels }) => {
  const leaderboard = getLeaderboard(camels);
  
  return (
    <div style={{ margin: "20px 0", textAlign: "center" }}>
      <h2 style={{ color: "#8B4513" }}>Race Leaderboard</h2>
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
        {leaderboard.map((camel, index) => (
          <div
            key={camel.color}
            style={{
              padding: "12px 20px",
              backgroundColor: camel.color,
              color: camel.color === "yellow" || camel.color === "white" ? "black" : "white",
              borderRadius: "8px",
              fontWeight: "bold",
              border: "3px solid #333",
              fontSize: "16px",
            }}
          >
            {index + 1}. {camel.color.toUpperCase()}<br/>
            <span style={{ fontSize: "12px" }}>Pos: {camel.position + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Game Component
const CamelRaceGame: React.FC = () => {
  const [numPlayers, setNumPlayers] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [message, setMessage] = useState<string>("");
  const [placingTile, setPlacingTile] = useState<"cheering" | "booing" | null>(null);

  const startNewGame = (players: number) => {
    setNumPlayers(players);
    setGameState(initializeGame(players));
    setMessage("Game started! Choose an action.");
  };

  const nextPlayer = () => {
    if (!gameState) return;
    setGameState(prev => prev ? {
      ...prev,
      currentPlayer: (prev.currentPlayer + 1) % prev.players.length,
    } : prev);
  };

  const endLeg = () => {
    if (!gameState) return;

    const leaderboard = getLeaderboard(gameState.camels);
    const updatedPlayers = scoreLegBets(gameState.players, gameState.legBets, leaderboard);

    // Reset for next leg
    const legBettingStacks: { [key in CamelColor]?: number[] } = {};
    RACING_CAMELS.forEach(color => {
      legBettingStacks[color] = [5, 3, 2];
    });

    setGameState({
      ...gameState,
      players: updatedPlayers.map(p => ({
        ...p,
        spectatorTilePlaced: false,
        partnershipAvailable: gameState.players.length >= 6,
      })),
      leg: gameState.leg + 1,
      availableDice: ["red", "blue", "green", "yellow", "purple", "grey"],
      legBettingStacks,
      legBets: [],
      spectatorTiles: [],
    });

    setMessage(`Leg ${gameState.leg} ended! Starting Leg ${gameState.leg + 1}`);
  };

  const handleAction = (action: string, data?: any) => {
    if (!gameState || gameState.gameEnded) return;

    const currentPlayer = gameState.players[gameState.currentPlayer];

    switch (action) {
      case "betting_ticket": {
        const color = data as CamelColor;
        const stack = gameState.legBettingStacks[color] || [];
        if (stack.length === 0) return;

        const value = stack[stack.length - 1];
        const newStack = stack.slice(0, -1);

        const ticket: BettingTicket = {
          camelColor: color,
          value,
          playerId: currentPlayer.id,
        };

        setGameState({
          ...gameState,
          legBettingStacks: {
            ...gameState.legBettingStacks,
            [color]: newStack,
          },
          legBets: [...gameState.legBets, ticket],
          players: gameState.players.map(p =>
            p.id === currentPlayer.id
              ? { ...p, bettingTickets: [...p.bettingTickets, ticket] }
              : p
          ),
        });

        setMessage(`${currentPlayer.name} took a ${value} EP betting ticket for ${color.toUpperCase()}!`);
        nextPlayer();
        break;
      }

      case "spectator_tile": {
        setPlacingTile(data as "cheering" | "booing");
        setMessage(`${currentPlayer.name}, click on a track position to place your ${data} tile...`);
        break;
      }

      case "pyramid_ticket": {
        if (gameState.availableDice.length === 0) return;

        // Roll a random die
        const randomIndex = Math.floor(Math.random() * gameState.availableDice.length);
        const diceColor = gameState.availableDice[randomIndex];
        const steps = Math.floor(Math.random() * 3) + 1;

        let updatedCamels = gameState.camels;
        let movedCamelColor: CamelColor;

        if (diceColor === "grey") {
          // Roll for crazy camel (randomly pick white or black)
          movedCamelColor = Math.random() < 0.5 ? "white" : "black";
          updatedCamels = moveCamel(updatedCamels, movedCamelColor, steps, gameState.spectatorTiles);
        } else {
          movedCamelColor = diceColor as CamelColor;
          updatedCamels = moveCamel(updatedCamels, movedCamelColor, steps, gameState.spectatorTiles);
        }

        const newAvailableDice = gameState.availableDice.filter((_, i) => i !== randomIndex);

        // Check if game ended
        const { ended, winner, lastPlace } = checkGameEnd(updatedCamels);

        if (ended && winner && lastPlace) {
          const finalPlayers = scoreFinalBets(gameState.players, gameState.finishBets, winner, lastPlace);
          setGameState({
            ...gameState,
            camels: updatedCamels,
            availableDice: newAvailableDice,
            players: finalPlayers.map(p =>
              p.id === currentPlayer.id
                ? { ...p, pyramidTickets: p.pyramidTickets + 1 }
                : p
            ),
            gameEnded: true,
            winner,
            lastInRacing: lastPlace,
          });
          setMessage(`🏆 ${winner.toUpperCase()} WINS! 🏆`);
        } else {
          setGameState({
            ...gameState,
            camels: updatedCamels,
            availableDice: newAvailableDice,
            players: gameState.players.map(p =>
              p.id === currentPlayer.id
                ? { ...p, pyramidTickets: p.pyramidTickets + 1 }
                : p
            ),
          });

          setMessage(`${movedCamelColor.toUpperCase()} moved ${steps} spaces!`);
          
          // Check if leg ended
          if (newAvailableDice.length === 0) {
            setTimeout(() => endLeg(), 1500);
          } else {
            nextPlayer();
          }
        }
        break;
      }

      case "finish_bet": {
        const { color, type } = data as { color: CamelColor; type: "winner" | "loser" };
        if (!currentPlayer.finishCards.includes(color)) return;

        const bet: FinishCard = {
          camelColor: color,
          playerId: currentPlayer.id,
          type,
        };

        setGameState({
          ...gameState,
          finishBets: [...gameState.finishBets, bet],
          players: gameState.players.map(p =>
            p.id === currentPlayer.id
              ? { ...p, finishCards: p.finishCards.filter(c => c !== color) }
              : p
          ),
        });

        setMessage(`${currentPlayer.name} bet on ${color.toUpperCase()} for overall ${type}!`);
        nextPlayer();
        break;
      }

      case "partnership": {
        const partnerId = data as number;
        setGameState({
          ...gameState,
          players: gameState.players.map(p =>
            p.id === currentPlayer.id || p.id === partnerId
              ? { ...p, partnerId: p.id === currentPlayer.id ? partnerId : currentPlayer.id, partnershipAvailable: false }
              : p
          ),
        });

        const partner = gameState.players[partnerId];
        setMessage(`${currentPlayer.name} and ${partner.name} formed a partnership!`);
        nextPlayer();
        break;
      }
    }
  };

  const handleTileClick = (position: number) => {
    if (!placingTile || !gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayer];

    // Check validity
    if (position === 0) {
      setMessage("Cannot place tile on starting position!");
      return;
    }

    const hasCamel = gameState.camels.some(c => c.position === position);
    const hasTile = gameState.spectatorTiles.some(t => t.position === position);
    const hasAdjacentTile = gameState.spectatorTiles.some(t => 
      Math.abs(t.position - position) === 1
    );

    if (hasCamel || hasTile || hasAdjacentTile) {
      setMessage("Cannot place tile here! (must be empty and not adjacent to other tiles)");
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

  const handleReset = () => {
    if (numPlayers) {
      startNewGame(numPlayers);
    } else {
      setGameState(null);
      setNumPlayers(null);
    }
    setMessage("");
    setPlacingTile(null);
  };

  // Setup screen
  if (!gameState) {
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
          fontSize: "60px",
          color: "#8B4513",
          textShadow: "3px 3px 6px rgba(0,0,0,0.3)",
          marginBottom: "40px",
        }}>
          🐪 Camel Up 🐪
        </h1>
        <h2 style={{ marginBottom: "30px", color: "#8B4513" }}>Select Number of Players</h2>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
          {[2, 3, 4, 5, 6, 7, 8].map(num => (
            <button
              key={num}
              onClick={() => startNewGame(num)}
              style={{
                padding: "20px 40px",
                fontSize: "24px",
                backgroundColor: "#FF9800",
                color: "white",
                border: "4px solid #333",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              {num} Players
            </button>
          ))}
        </div>
      </div>
    );
  }

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
          fontSize: "60px",
          color: gameState.winner,
          textShadow: "3px 3px 6px rgba(0,0,0,0.3)",
          marginBottom: "20px",
        }}>
          🏆 {gameState.winner.toUpperCase()} CAMEL WINS! 🏆
        </h1>

        <h2 style={{ textAlign: "center", color: "#8B4513", marginBottom: "30px" }}>
          Winner: {winningPlayer.name} with {winningPlayer.money} EP!
        </h2>

        <div style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "20px",
          backgroundColor: "#FFF",
          borderRadius: "10px",
          border: "3px solid #8B4513",
        }}>
          <h3 style={{ textAlign: "center", marginBottom: "20px" }}>Final Standings</h3>
          {sortedPlayers.map((player, idx) => (
            <div
              key={player.id}
              style={{
                padding: "15px",
                marginBottom: "10px",
                backgroundColor: player.color,
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: "bold",
                fontSize: "18px",
              }}
            >
              <span>{idx + 1}. {player.name}</span>
              <span>💰 {player.money} EP</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <button
            onClick={handleReset}
            style={{
              padding: "20px 40px",
              fontSize: "24px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "4px solid #333",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔄 New Game
          </button>
        </div>
      </div>
    );
  }

  // Main game screen
  return (
    <div style={{
      padding: "20px",
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#FFF5E6",
      minHeight: "100vh",
    }}>
      <h1 style={{
        textAlign: "center",
        color: "#8B4513",
        fontSize: "48px",
        textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
      }}>
        🐪 Camel Up 🐪
      </h1>

      <div style={{
        display: "flex",
        justifyContent: "space-around",
        marginBottom: "20px",
        padding: "15px",
        backgroundColor: "#FFF",
        borderRadius: "10px",
        border: "2px solid #8B4513",
        flexWrap: "wrap",
        gap: "10px",
      }}>
        <div style={{ fontSize: "20px", fontWeight: "bold" }}>
          Leg: {gameState.leg}
        </div>
        <div style={{ fontSize: "20px" }}>
          Dice Rolled: {6 - gameState.availableDice.length}/6
        </div>
      </div>

      {message && (
        <div style={{
          padding: "15px",
          backgroundColor: "#FFE66D",
          border: "2px solid #333",
          borderRadius: "8px",
          textAlign: "center",
          fontSize: "18px",
          fontWeight: "bold",
          marginBottom: "20px",
        }}>
          {message}
        </div>
      )}

      <DicePyramid availableDice={gameState.availableDice} />

      <Track
        camels={gameState.camels}
        spectatorTiles={gameState.spectatorTiles}
        onTileClick={placingTile ? handleTileClick : undefined}
        clickablePositions={!!placingTile}
      />

      <Leaderboard camels={gameState.camels} />

      <PlayerPanel
        players={gameState.players}
        currentPlayer={gameState.currentPlayer}
      />

      <ActionPanel
        gameState={gameState}
        onAction={handleAction}
      />

      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <button
          onClick={handleReset}
          style={{
            padding: "15px 30px",
            fontSize: "18px",
            backgroundColor: "#FF5722",
            color: "white",
            border: "3px solid #333",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🔄 Reset Game
        </button>
      </div>
    </div>
  );
};

export default CamelRaceGame;

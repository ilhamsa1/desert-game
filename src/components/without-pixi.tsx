import React, { useState, useEffect, useRef } from "react";

// Full Camel Up Game Implementation with WebRTC and Bot Support

type CamelColor = "red" | "blue" | "green" | "yellow" | "purple";
type DiceColor = "red" | "blue" | "green" | "yellow" | "purple";

type Camel = {
  color: CamelColor;
  position: number;
  stackOrder: number;
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

const TRACK_LENGTH = 16;
const RACING_CAMELS: CamelColor[] = ["red", "blue", "green", "yellow", "purple"];

// Initialize game
const initializeGame = (players: Player[]): GameState => {
  const camels: Camel[] = [];
  const positionCounts: { [key: number]: number } = {};
  
  RACING_CAMELS.forEach(color => {
    const roll = Math.floor(Math.random() * 3) + 1;
    const position = roll - 1;
    const stackOrder = positionCounts[position] || 0;
    positionCounts[position] = stackOrder + 1;
    
    camels.push({ color, position, stackOrder });
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
    availableDice: ["red", "blue", "green", "yellow", "purple"],
    legBettingStacks,
    spectatorTiles: [],
    leg: 1,
    gameEnded: false,
    winner: null,
  };
};

// Get leaderboard
const getLeaderboard = (camels: Camel[]): Camel[] => {
  return [...camels].sort((a, b) => {
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

  let newPosition = selectedCamel.position + steps;
  
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

// Check if game ended
const checkGameEnd = (camels: Camel[]): { ended: boolean; winner: CamelColor | null } => {
  const winnersOverLine = camels.filter(c => c.position >= TRACK_LENGTH);
  
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
const makeBotDecision = (gameState: GameState, currentPlayer: Player): { action: string; data?: any } => {
  const availableActions: Array<{ action: string; data?: any; weight: number }> = [];

  // Consider betting tickets
  RACING_CAMELS.forEach(color => {
    const stack = gameState.legBettingStacks[color] || [];
    if (stack.length > 0) {
      const value = stack[stack.length - 1];
      // Higher value = higher weight
      availableActions.push({ action: "betting_ticket", data: color, weight: value * 2 });
    }
  });

  // Consider placing spectator tile (if not placed)
  if (!currentPlayer.spectatorTilePlaced) {
    availableActions.push({ action: "spectator_tile", data: Math.random() > 0.5 ? "cheering" : "booing", weight: 5 });
  }

  // Consider rolling dice (always attractive)
  if (gameState.availableDice.length > 0) {
    availableActions.push({ action: "pyramid_ticket", weight: 10 });
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

  // Fallback to rolling dice
  return { action: "pyramid_ticket" };
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
  const trackWidth = 900;
  const trackHeight = 450;
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
    <div style={{
      position: "relative",
      width: `${trackWidth}px`,
      height: `${trackHeight}px`,
      margin: "0 auto",
      border: "5px solid #8B4513",
      backgroundColor: "#F4A460",
      borderRadius: "15px",
      boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
    }}>
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
              cursor: isClickable ? "pointer" : "default",
              transition: "transform 0.2s, box-shadow 0.2s",
              boxShadow: isClickable ? "0 2px 4px rgba(0,0,0,0.2)" : "none",
            }}
            onMouseEnter={(e) => {
              if (isClickable) {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
              }
            }}
            onMouseLeave={(e) => {
              if (isClickable) {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
              }
            }}
          >
            {index === 0 ? "START" : index + 1}
            {spectatorTile && (
              <div style={{
                position: "absolute",
                bottom: "0px",
                fontSize: "32px",
                zIndex: 5,
                filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))",
              }}>
                {spectatorTile.type === "cheering" ? "👍" : "👎"}
              </div>
            )}
          </div>
        );
      })}
      
      {camels.map((camel) => {
        const { x, y } = getCamelPosition(camel.position);
        return (
          <div
            key={camel.color}
            style={{
              position: "absolute",
              left: `${x + 15}px`,
              top: `${y - 5 - (camel.stackOrder * 40)}px`,
              width: "60px",
              height: "45px",
              backgroundColor: camel.color,
              border: "3px solid #333",
              borderRadius: "20px 20px 10px 10px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: camel.color === 'yellow' ? 'black' : 'white',
              fontWeight: "bold",
              fontSize: "24px",
              zIndex: 10 + camel.stackOrder,
              transition: "all 0.8s ease-in-out",
              boxShadow: "0 4px 8px rgba(0,0,0,0.4)",
            }}
          >
            🐪
          </div>
        );
      })}
    </div>
  );
};

// Centered Dice Roller
const CenteredDiceRoller: React.FC<{
  availableDice: DiceColor[];
  onRoll: () => void;
  disabled: boolean;
  currentPlayerName: string;
}> = ({ availableDice, onRoll, disabled, currentPlayerName }) => {
  const allDice: DiceColor[] = ["red", "blue", "green", "yellow", "purple"];
  
  return (
    <div style={{
      position: "relative",
      margin: "30px auto",
      padding: "40px",
      backgroundColor: "#8B4513",
      borderRadius: "20px",
      border: "5px solid #654321",
      boxShadow: "0 10px 20px rgba(0,0,0,0.5)",
      textAlign: "center",
      maxWidth: "700px",
    }}>
      <h2 style={{ 
        color: "#FFE66D", 
        marginBottom: "20px",
        fontSize: "32px",
        textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
      }}>
        🎲 Dice Pyramid 🎲
      </h2>
      
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "15px",
        flexWrap: "wrap",
        marginBottom: "30px",
      }}>
        {allDice.map(color => {
          const isAvailable = availableDice.includes(color);
          return (
            <div
              key={color}
              style={{
                width: "70px",
                height: "70px",
                backgroundColor: isAvailable ? color : "#333",
                border: `4px solid ${isAvailable ? "#FFF" : "#666"}`,
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                color: color === "yellow" ? "black" : "white",
                opacity: isAvailable ? 1 : 0.3,
                transition: "all 0.3s ease",
                boxShadow: isAvailable ? "0 4px 8px rgba(255,255,255,0.3)" : "inset 0 4px 8px rgba(0,0,0,0.5)",
                transform: isAvailable ? "scale(1)" : "scale(0.9)",
              }}
            >
              {isAvailable ? "🎲" : "✓"}
            </div>
          );
        })}
      </div>

      <div style={{ 
        color: "#FFE66D", 
        marginBottom: "25px", 
        fontSize: "18px",
        fontWeight: "bold",
      }}>
        Remaining: {availableDice.length}/5 dice
      </div>

      <button
        onClick={onRoll}
        disabled={disabled || availableDice.length === 0}
        style={{
          padding: "20px 50px",
          fontSize: "24px",
          backgroundColor: disabled || availableDice.length === 0 ? "#666" : "#FF9800",
          color: "white",
          border: "4px solid #333",
          borderRadius: "15px",
          cursor: disabled || availableDice.length === 0 ? "not-allowed" : "pointer",
          fontWeight: "bold",
          transition: "all 0.3s ease",
          boxShadow: disabled || availableDice.length === 0 ? "none" : "0 6px 12px rgba(0,0,0,0.3)",
          transform: disabled || availableDice.length === 0 ? "scale(1)" : "scale(1.05)",
        }}
        onMouseEnter={(e) => {
          if (!disabled && availableDice.length > 0) {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = "0 8px 16px rgba(255, 152, 0, 0.6)";
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && availableDice.length > 0) {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.3)";
          }
        }}
      >
        🎲 ROLL DICE 🎲
      </button>

      {availableDice.length > 0 && (
        <div style={{ 
          marginTop: "20px", 
          color: "#FFE66D",
          fontSize: "16px",
        }}>
          {currentPlayerName}'s turn
        </div>
      )}
    </div>
  );
};

// Enhanced Leaderboard
const EnhancedLeaderboard: React.FC<{ 
  players: Player[];
  camels: Camel[];
}> = ({ players, camels }) => {
  const sortedPlayers = [...players].sort((a, b) => b.money - a.money);
  const camelLeaderboard = getLeaderboard(camels);
  
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "30px",
      margin: "30px auto",
      maxWidth: "1200px",
    }}>
      {/* Player Leaderboard */}
      <div style={{
        padding: "25px",
        backgroundColor: "#FFF",
        borderRadius: "15px",
        border: "4px solid #8B4513",
        boxShadow: "0 6px 12px rgba(0,0,0,0.2)",
      }}>
        <h2 style={{ 
          textAlign: "center", 
          color: "#8B4513",
          marginBottom: "20px",
          fontSize: "28px",
        }}>
          💰 Player Standings 💰
        </h2>
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            style={{
              padding: "15px 20px",
              marginBottom: "12px",
              background: `linear-gradient(135deg, ${player.color} 0%, ${player.color}dd 100%)`,
              borderRadius: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: "bold",
              fontSize: "18px",
              border: "3px solid #333",
              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
              color: "#FFF",
              textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
            }}
          >
            <span>
              <span style={{ 
                fontSize: "24px", 
                marginRight: "10px",
              }}>
                {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
              </span>
              {player.name} {player.isBot && "🤖"}
            </span>
            <span style={{ fontSize: "22px" }}>
              💰 {player.money} EP
            </span>
          </div>
        ))}
      </div>

      {/* Camel Race Leaderboard */}
      <div style={{
        padding: "25px",
        backgroundColor: "#FFF",
        borderRadius: "15px",
        border: "4px solid #8B4513",
        boxShadow: "0 6px 12px rgba(0,0,0,0.2)",
      }}>
        <h2 style={{ 
          textAlign: "center", 
          color: "#8B4513",
          marginBottom: "20px",
          fontSize: "28px",
        }}>
          🏁 Race Positions 🏁
        </h2>
        {camelLeaderboard.map((camel, index) => (
          <div
            key={camel.color}
            style={{
              padding: "15px 20px",
              marginBottom: "12px",
              background: `linear-gradient(135deg, ${camel.color} 0%, ${camel.color}dd 100%)`,
              borderRadius: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: "bold",
              fontSize: "18px",
              border: "3px solid #333",
              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
              color: camel.color === "yellow" ? "#000" : "#FFF",
              textShadow: camel.color === "yellow" ? "none" : "1px 1px 2px rgba(0,0,0,0.5)",
            }}
          >
            <span>
              <span style={{ fontSize: "24px", marginRight: "10px" }}>
                {index + 1}.
              </span>
              🐪 {camel.color.toUpperCase()}
            </span>
            <span style={{ fontSize: "18px" }}>
              Position: {camel.position + 1}
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
      margin: "20px auto",
      padding: "25px",
      backgroundColor: "#FFF",
      borderRadius: "15px",
      border: "3px solid #8B4513",
      maxWidth: "900px",
    }}>
      <h3 style={{ 
        textAlign: "center", 
        color: "#8B4513",
        marginBottom: "20px",
        fontSize: "24px",
      }}>
        Place Your Bet
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
                transition: "transform 0.2s",
                minWidth: "150px",
              }}
              onMouseEnter={(e) => {
                if (!disabled && available) {
                  e.currentTarget.style.transform = "scale(1.1)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
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
  const [setupMode, setSetupMode] = useState<"menu" | "room" | "game">("menu");
  const [playerName, setPlayerName] = useState("");
  const [numBots, setNumBots] = useState(2);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [message, setMessage] = useState<string>("");
  const [actionDialog, setActionDialog] = useState<ActionDialogData | null>(null);
  const [placingTile, setPlacingTile] = useState<"cheering" | "booing" | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start game
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
    }

    setGameState(newGameState);
    setSetupMode("game");
    setMessage("Game started! Place your bets or roll the dice.");
  };

  // Handle bot turn
  useEffect(() => {
    if (!gameState || gameState.gameEnded || setupMode !== "game") return;

    const currentPlayer = gameState.players[gameState.currentPlayer];
    
    if (currentPlayer.isBot) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      
      botTimerRef.current = setTimeout(() => {
        const decision = makeBotDecision(gameState, currentPlayer);
        handleAction(decision.action, decision.data, true);
      }, 1500);
    }

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [gameState?.currentPlayer, gameState?.availableDice.length]);

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
    const updatedPlayers = scoreLegBets(gameState.players, leaderboard);

    const legBettingStacks: { [key in CamelColor]?: number[] } = {};
    RACING_CAMELS.forEach(color => {
      legBettingStacks[color] = [5, 5, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
    });

    setGameState({
      ...gameState,
      players: updatedPlayers.map(p => ({ ...p, spectatorTilePlaced: false })),
      leg: gameState.leg + 1,
      availableDice: ["red", "blue", "green", "yellow", "purple"],
      legBettingStacks,
      spectatorTiles: [],
    });

    setMessage(`Leg ${gameState.leg} ended! Starting Leg ${gameState.leg + 1}`);
  };

  const handleAction = (action: string, data?: any, skipDialog = false) => {
    if (!gameState || gameState.gameEnded) return;

    const currentPlayer = gameState.players[gameState.currentPlayer];

    switch (action) {
      case "betting_ticket": {
        const color = data as CamelColor;
        const stack = gameState.legBettingStacks[color] || [];
        if (stack.length === 0) return;

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
        
        setTimeout(() => nextPlayer(), skipDialog ? 0 : 100);
        break;
      }

      case "spectator_tile": {
        if (currentPlayer.spectatorTilePlaced) return;
        setPlacingTile(data as "cheering" | "booing");
        setMessage(`${currentPlayer.name}, click on a track position to place your ${data} tile...`);
        break;
      }

      case "pyramid_ticket": {
        if (gameState.availableDice.length === 0) return;

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
            setTimeout(() => nextPlayer(), skipDialog ? 0 : 100);
          }
        }
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
            onClick={() => startGame("host")}
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
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            🌐 Host Multiplayer Room
          </button>

          <div style={{
            marginTop: "30px",
            padding: "20px",
            backgroundColor: "#F0F0F0",
            borderRadius: "10px",
            textAlign: "center",
          }}>
            <p style={{ fontSize: "14px", color: "#666" }}>
              💡 WebRTC multiplayer coming soon! For now, enjoy the game with bots.
            </p>
          </div>
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
  const isLocalPlayerTurn = currentPlayer.isLocal;

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
        justifyContent: "space-around",
        marginBottom: "20px",
        padding: "20px",
        backgroundColor: "#FFF",
        borderRadius: "15px",
        border: "3px solid #8B4513",
        flexWrap: "wrap",
        gap: "15px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
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
        }}>
          {message}
        </div>
      )}

      <Track 
        camels={gameState.camels}
        spectatorTiles={gameState.spectatorTiles}
        onTileClick={placingTile ? handleTileClick : undefined}
        clickablePositions={!!placingTile}
      />

      <CenteredDiceRoller
        availableDice={gameState.availableDice}
        onRoll={() => handleAction("pyramid_ticket")}
        disabled={!isLocalPlayerTurn}
        currentPlayerName={currentPlayer.name}
      />

      <EnhancedLeaderboard 
        players={gameState.players}
        camels={gameState.camels}
      />

      {/* Spectator Tile Placement */}
      <div style={{
        margin: "20px auto",
        padding: "25px",
        backgroundColor: "#FFF",
        borderRadius: "15px",
        border: "3px solid #8B4513",
        maxWidth: "900px",
      }}>
        <h3 style={{ 
          textAlign: "center", 
          color: "#8B4513",
          marginBottom: "20px",
          fontSize: "24px",
        }}>
          Place Spectator Tile {currentPlayer.spectatorTilePlaced && "(Already Placed)"}
        </h3>
        <div style={{ 
          display: "flex", 
          gap: "20px", 
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          <button
            onClick={() => handleAction("spectator_tile", "cheering")}
            disabled={!isLocalPlayerTurn || currentPlayer.spectatorTilePlaced || !!placingTile}
            style={{
              padding: "20px 40px",
              fontSize: "20px",
              backgroundColor: currentPlayer.spectatorTilePlaced || !isLocalPlayerTurn ? "#ccc" : "#4CAF50",
              color: "white",
              border: "4px solid #333",
              borderRadius: "12px",
              cursor: !isLocalPlayerTurn || currentPlayer.spectatorTilePlaced || placingTile ? "not-allowed" : "pointer",
              fontWeight: "bold",
              opacity: currentPlayer.spectatorTilePlaced || !isLocalPlayerTurn ? 0.5 : 1,
              transition: "transform 0.2s",
              minWidth: "200px",
            }}
            onMouseEnter={(e) => {
              if (isLocalPlayerTurn && !currentPlayer.spectatorTilePlaced && !placingTile) {
                e.currentTarget.style.transform = "scale(1.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            👍 Cheering Tile<br/>
            <span style={{ fontSize: "14px" }}>(Camel moves +1 extra)</span>
          </button>
          <button
            onClick={() => handleAction("spectator_tile", "booing")}
            disabled={!isLocalPlayerTurn || currentPlayer.spectatorTilePlaced || !!placingTile}
            style={{
              padding: "20px 40px",
              fontSize: "20px",
              backgroundColor: currentPlayer.spectatorTilePlaced || !isLocalPlayerTurn ? "#ccc" : "#F44336",
              color: "white",
              border: "4px solid #333",
              borderRadius: "12px",
              cursor: !isLocalPlayerTurn || currentPlayer.spectatorTilePlaced || placingTile ? "not-allowed" : "pointer",
              fontWeight: "bold",
              opacity: currentPlayer.spectatorTilePlaced || !isLocalPlayerTurn ? 0.5 : 1,
              transition: "transform 0.2s",
              minWidth: "200px",
            }}
            onMouseEnter={(e) => {
              if (isLocalPlayerTurn && !currentPlayer.spectatorTilePlaced && !placingTile) {
                e.currentTarget.style.transform = "scale(1.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            👎 Booing Tile<br/>
            <span style={{ fontSize: "14px" }}>(Camel moves -1 space)</span>
          </button>
        </div>
        {placingTile && (
          <div style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#FFE66D",
            borderRadius: "10px",
            textAlign: "center",
            fontSize: "18px",
            fontWeight: "bold",
          }}>
            ⚡ Click on any empty track position to place your {placingTile} tile!
          </div>
        )}
      </div>

      <BettingPanel
        gameState={gameState}
        onBet={(color) => handleAction("betting_ticket", color)}
        disabled={!isLocalPlayerTurn}
      />

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

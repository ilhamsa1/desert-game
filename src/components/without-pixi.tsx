import React, { useCallback, useEffect, useState } from "react";

// Enhanced Camel Up Game

type Camel = {
  color: string;
  position: number;
  stackOrder: number; // Order in stack (0 = bottom, higher = top)
  direction: "forward" | "backward";
};

type DesertTile = {
  position: number;
  type: "oasis" | "mirage";
  owner: string;
};

// Future enhancement: Race betting
// type Bet = {
//   player: string;
//   camel: string;
//   type: "leg" | "winner" | "loser";
//   value: number;
// };

type Player = {
  name: string;
  money: number;
  color: string;
};

type GameState = {
  camels: Camel[];
  track: number[];
  dice: string[];
  winner: string | null;
  desertTiles: DesertTile[];
  players: Player[];
  currentPlayer: number;
  round: number;
  diceRolledThisRound: string[];
  legBets: { [key: string]: number[] }; // camel color -> array of bet values [5,3,2...]
};

// Legacy code - no longer used
// const DEFAULT_ROUND_STATE = { ... };

const rollDice = (dice: string[]): { color: string; steps: number } => {
  const randomIndex = Math.floor(Math.random() * dice.length);
  const selectedDice = dice[randomIndex];
  const steps = Math.floor(Math.random() * 3) + 1;
  return { color: selectedDice, steps };
};

// const rollDiceOnly = (): { steps: number } => {
//   const steps = Math.floor(Math.random() * 3) + 1;
//   return { steps };
// };

const moveCamel = (
  camels: Camel[],
  rollResult: { color: string; steps: number },
  desertTiles: DesertTile[]
): Camel[] => {
  const selectedCamel = camels.find(
    (camel) => camel.color === rollResult.color
  );
  if (!selectedCamel) return camels;

  // Find all camels on top of the selected camel (they move together)
  const camelsOnSamePosition = camels.filter(
    (camel) => camel.position === selectedCamel.position
  );
  const movingCamels = camelsOnSamePosition.filter(
    (camel) => camel.stackOrder >= selectedCamel.stackOrder
  );

  // Calculate new position
  const direction = selectedCamel.direction === "forward" ? 1 : -1;
  let newPosition = selectedCamel.position + (rollResult.steps * direction);

  // Check for desert tiles at the new position
  const desertTile = desertTiles.find(tile => tile.position === newPosition);
  if (desertTile) {
    // Oasis moves forward, Mirage moves backward
    newPosition += desertTile.type === "oasis" ? 1 : -1;
  }

  // Find camels already at the destination
  const camelsAtDestination = camels.filter(
    (camel) => camel.position === newPosition && !movingCamels.includes(camel)
  );
  
  const maxStackAtDestination = camelsAtDestination.length > 0
    ? Math.max(...camelsAtDestination.map(c => c.stackOrder))
    : -1;

  // Move the camels
  return camels.map((camel) => {
    const movingCamelIndex = movingCamels.findIndex(c => c.color === camel.color);
    
    if (movingCamelIndex >= 0) {
      // This camel is moving
      const relativeStackPosition = camel.stackOrder - selectedCamel.stackOrder;
      return {
        ...camel,
        position: newPosition,
        stackOrder: maxStackAtDestination + 1 + relativeStackPosition,
      };
    } else if (camel.position === selectedCamel.position && camel.stackOrder < selectedCamel.stackOrder) {
      // Camels below the moved camel need to adjust their stack order
      return camel;
    }
    
    return camel;
  });
};

// const moveCamelStack = (
//   camels: Camel[],
//   rollResult: { color: string; steps: number }
// ): Camel[] => {
//   const camelsHaveSamePosition = camels.filter(
//     (camel) => camel.position === camel.position + rollResult.steps
//   );

//   let newStack = 0;
//   if (camelsHaveSamePosition.length > 0) {
//     newStack = camelsHaveSamePosition.length + 1;
//   }

//   return camels.map((camel) =>
//     camel.color === rollResult.color ? { ...camel, stack: newStack } : camel
//   );
// };

const checkWinner = (camels: Camel[], trackLength: number): string | null => {
  // Forward camels win if they reach or exceed the track length
  const forwardWinners = camels.filter(
    (camel) => camel.position >= trackLength && camel.direction === "forward"
  );

  if (forwardWinners.length > 0) {
    // Find the camel with highest position, then highest stack
    const sorted = forwardWinners.sort((a, b) => {
      if (a.position !== b.position) return b.position - a.position;
      return b.stackOrder - a.stackOrder;
    });
    return sorted[0].color;
  }

  // Backward camels win if they reach position 0 or below
  const backwardWinners = camels.filter(
    (camel) => camel.position <= 0 && camel.direction === "backward"
  );

  if (backwardWinners.length > 0) {
    const sorted = backwardWinners.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return b.stackOrder - a.stackOrder;
    });
    return sorted[0].color;
  }

  return null;
};

const getLeaderboard = (camels: Camel[]): Camel[] => {
  // Sort camels by position and stack order
  return [...camels].sort((a, b) => {
    if (a.position !== b.position) {
      // Forward camels: higher position is better
      // Backward camels: lower position is better
      if (a.direction === "forward") return b.position - a.position;
      return a.position - b.position;
    }
    // Same position: higher stack is better
    return b.stackOrder - a.stackOrder;
  });
};

const Track: React.FC<{ 
  camels: Camel[];
  desertTiles: DesertTile[];
  onPlaceDesertTile?: (position: number) => void;
}> = ({ camels, desertTiles, onPlaceDesertTile }) => {
  const trackWidth = 1000;
  const trackHeight = 500;
  const totalPositions = 16;
  const positionPerSide = totalPositions / 4;

  const getCamelPosition = (position: number) => {
    let displayPosition = position;
    
    // Keep position within track bounds for display
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
        margin: "0 auto",
        border: "4px solid #8B4513",
        backgroundColor: "#F4A460",
        borderRadius: "10px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
      }}
    >
      {/* Track positions */}
      {Array.from({ length: totalPositions }).map((_, index) => {
        const { x, y } = getCamelPosition(index);
        const desertTile = desertTiles.find(tile => tile.position === index);

        return (
          <div
            key={index}
            onClick={() => onPlaceDesertTile?.(index)}
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
              cursor: onPlaceDesertTile ? "pointer" : "default",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => {
              if (onPlaceDesertTile) {
                e.currentTarget.style.transform = "scale(1.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {index + 1}
            {desertTile && (
              <div style={{
                position: "absolute",
                bottom: "2px",
                fontSize: "20px"
              }}>
                {desertTile.type === "oasis" ? "🌴" : "🌊"}
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
            {camel.direction === "backward" ? "←" : "→"}
          </div>
        );
      })}
    </div>
  );
};

const DicePyramid: React.FC<{
  diceRolledThisRound: string[];
  availableDice: string[];
}> = ({ diceRolledThisRound, availableDice }) => {
  const allDice = ["red", "blue", "green", "yellow", "purple"];
  
  return (
    <div style={{
      padding: "20px",
      backgroundColor: "#8B4513",
      borderRadius: "15px",
      border: "4px solid #654321",
      boxShadow: "0 6px 12px rgba(0,0,0,0.4)",
      textAlign: "center",
      margin: "20px auto",
      maxWidth: "400px"
    }}>
      <h3 style={{ color: "#FFE66D", marginBottom: "15px" }}>🎲 Dice Pyramid 🎲</h3>
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "10px",
        flexWrap: "wrap"
      }}>
        {allDice.map(color => {
          const isRolled = diceRolledThisRound.includes(color);
          return (
            <div
              key={color}
              style={{
                width: "50px",
                height: "50px",
                backgroundColor: isRolled ? "#333" : color,
                border: `3px solid ${isRolled ? "#666" : "#FFF"}`,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                color: color === "yellow" ? "black" : "white",
                opacity: isRolled ? 0.3 : 1,
                transition: "all 0.3s ease",
                boxShadow: isRolled ? "inset 0 2px 4px rgba(0,0,0,0.5)" : "0 2px 4px rgba(255,255,255,0.3)"
              }}
            >
              {isRolled ? "✓" : "🎲"}
            </div>
          );
        })}
      </div>
      <div style={{ color: "#FFE66D", marginTop: "10px", fontSize: "14px" }}>
        Remaining: {availableDice.length}/5
      </div>
    </div>
  );
};

const PlayerDashboard: React.FC<{ 
  players: Player[];
  currentPlayer: number;
  legBets: { [key: string]: number[] };
  onPlaceLegBet: (camelColor: string) => void;
  onPlaceDesertTile: (type: "oasis" | "mirage") => void;
}> = ({ players, currentPlayer, legBets, onPlaceLegBet, onPlaceDesertTile }) => {
  const camelColors = ["red", "blue", "green", "yellow", "purple"];
  
  return (
    <div style={{ 
      marginTop: "20px",
      padding: "20px",
      backgroundColor: "#f9f9f9",
      borderRadius: "10px",
      border: "2px solid #ddd"
    }}>
      <h3>Players</h3>
      <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
        {players.map((player, idx) => (
          <div
            key={player.name}
            style={{
              padding: "10px",
              backgroundColor: idx === currentPlayer ? player.color : "#fff",
              border: `3px solid ${player.color}`,
              borderRadius: "8px",
              fontWeight: idx === currentPlayer ? "bold" : "normal",
            }}
          >
            <div>{player.name}</div>
            <div>💰 ${player.money}</div>
          </div>
        ))}
      </div>

      <h3>Leg Bets Available</h3>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {camelColors.map((color) => (
          <div key={color} style={{ textAlign: "center" }}>
            <button
              onClick={() => onPlaceLegBet(color)}
              style={{
                padding: "15px 20px",
                fontSize: "16px",
                backgroundColor: color,
                color: color === "yellow" ? "black" : "white",
                border: "3px solid #333",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {color.toUpperCase()}
            </button>
            <div style={{ marginTop: "5px", fontSize: "12px" }}>
              Bets: {legBets[color]?.length || 0}
              {legBets[color]?.length > 0 && (
                <div>Next: ${legBets[color][legBets[color].length - 1]}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: "20px" }}>Desert Tiles</h3>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => onPlaceDesertTile("oasis")}
          style={{
            padding: "10px 20px",
            fontSize: "18px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "2px solid #333",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          🌴 Place Oasis (+1)
        </button>
        <button
          onClick={() => onPlaceDesertTile("mirage")}
          style={{
            padding: "10px 20px",
            fontSize: "18px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "2px solid #333",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          🌊 Place Mirage (-1)
        </button>
      </div>
    </div>
  );
};

const CamelRaceGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    camels: [
      { color: "red", position: 0, stackOrder: 0, direction: "forward" },
      { color: "blue", position: 0, stackOrder: 1, direction: "forward" },
      { color: "green", position: 0, stackOrder: 2, direction: "forward" },
      { color: "yellow", position: 0, stackOrder: 3, direction: "forward" },
      { color: "purple", position: 0, stackOrder: 4, direction: "forward" },
    ],
    track: Array.from({ length: 16 }, (_, i) => i),
    dice: ["red", "blue", "green", "yellow", "purple"],
    winner: null,
    desertTiles: [],
    players: [
      { name: "Player 1", money: 3, color: "#FF6B6B" },
      { name: "Player 2", money: 3, color: "#4ECDC4" },
      { name: "Player 3", money: 3, color: "#FFE66D" },
    ],
    currentPlayer: 0,
    round: 1,
    diceRolledThisRound: [],
    legBets: {
      red: [5, 3, 2],
      blue: [5, 3, 2],
      green: [5, 3, 2],
      yellow: [5, 3, 2],
      purple: [5, 3, 2],
    },
  });

  const [isGameRunning, setIsGameRunning] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [placingDesertTile, setPlacingDesertTile] = useState<"oasis" | "mirage" | null>(null);

  // const [isGameRunning, setIsGameRunning] = useState(false);

  // const rollAndUpdate = useCallback(() => {
  //   const rollResult = rollDice(gameState.dice);
  //   const updatedCamels = moveCamel(gameState.camels, rollResult);
  //   const winner = checkWinner(updatedCamels, gameState.track.length - 1);

  //   setGameState((prevState) => ({
  //     ...prevState,
  //     camels: updatedCamels,
  //     winner: winner,
  //   }));

  //   return winner;
  // }, [gameState.camels, gameState.dice, gameState.track]);

  // const startGame = () => {
  //   setIsGameRunning(true);
  // };

  // useEffect(() => {
  //   if (gameState.winner) return;
  //   setIsGameRunning(false)
  // }, [gameState.winner]);

  // useEffect(() => {
  //     const rollLoop = () => {
  //       if (!isGameRunning || gameState.winner) return;
  //       const winner = rollAndUpdate()
  //       if (!winner) {
  //         setTimeout(rollLoop, 1000)
  //       } else {
  //         setIsGameRunning(false)
  //       }
  //     };

  //     rollLoop();
  // },  [isGameRunning, gameState.winner, rollAndUpdate]);

  // const startGameDice = useCallback(() => {
  //   const startDice = roundState.mainDice.map((dice) => {
  //     const roll = rollDice(gameState.dice);
  //     console.log(roll.steps, "roll", dice);
  //     return { ...dice, steps: roll.steps - 1 };
  //   });
  //   setRoundState((prevState) => ({
  //     ...prevState,
  //     round: prevState.round + 1,
  //     startDice,
  //   }));

  //   let camels = gameState.camels;

  //   startDice.forEach((rollResult) => {
  //     camels = moveCamel(camels, rollResult);
  //   });
  //   const movedCamel = camels;
  //   console.log(movedCamel, "movedCamel");
  //   setGameState((prevState) => ({
  //     ...prevState,
  //     camels: movedCamel,
  //   }));
  // }, [gameState.camels, gameState.dice, roundState.mainDice]);

  const nextPlayer = () => {
    setGameState((prev) => ({
      ...prev,
      currentPlayer: (prev.currentPlayer + 1) % prev.players.length,
    }));
  };

  const handleRollDice = useCallback(() => {
    if (gameState.winner) return;

    const availableDice = gameState.dice.filter(
      (color) => !gameState.diceRolledThisRound.includes(color)
    );

    if (availableDice.length === 0) {
      // Start new round
      setGameState((prev) => ({
        ...prev,
        round: prev.round + 1,
        diceRolledThisRound: [],
        legBets: {
          red: [5, 3, 2],
          blue: [5, 3, 2],
          green: [5, 3, 2],
          yellow: [5, 3, 2],
          purple: [5, 3, 2],
        },
      }));
      setMessage("New round started!");
      return;
    }

    const rollResult = rollDice(availableDice);
    const updatedCamels = moveCamel(gameState.camels, rollResult, gameState.desertTiles);
    const winner = checkWinner(updatedCamels, gameState.track.length);

    setGameState((prev) => ({
      ...prev,
      camels: updatedCamels,
      diceRolledThisRound: [...prev.diceRolledThisRound, rollResult.color],
      winner,
    }));

    // Award money for rolling dice
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p, idx) =>
        idx === prev.currentPlayer ? { ...p, money: p.money + 1 } : p
      ),
    }));

    setMessage(`${rollResult.color.toUpperCase()} camel moved ${rollResult.steps} steps!`);
    nextPlayer();
  }, [gameState]);

  const handlePlaceLegBet = (camelColor: string) => {
    if (gameState.winner || gameState.legBets[camelColor].length === 0) return;

    const betValue = gameState.legBets[camelColor].pop()!;
    
    setGameState((prev) => ({
      ...prev,
      legBets: {
        ...prev.legBets,
        [camelColor]: prev.legBets[camelColor].slice(0, -1),
      },
    }));

    // Store bet for payout at end of round (simplified - just award money now)
    const currentLeader = getLeaderboard(gameState.camels)[0];
    if (currentLeader.color === camelColor) {
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((p, idx) =>
          idx === prev.currentPlayer ? { ...p, money: p.money + betValue } : p
        ),
      }));
      setMessage(`Good bet! Won $${betValue}!`);
    } else {
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((p, idx) =>
          idx === prev.currentPlayer ? { ...p, money: p.money - 1 } : p
        ),
      }));
      setMessage(`Bet didn't pay off. Lost $1`);
    }
    
    nextPlayer();
  };

  const handlePlaceDesertTile = (type: "oasis" | "mirage") => {
    setPlacingDesertTile(type);
    setMessage(`Click on a track position to place your ${type}...`);
  };

  const handleTrackClick = (position: number) => {
    if (!placingDesertTile || position === 0) return;

    // Check if position is valid (no camels, no other tiles)
    const hasCamel = gameState.camels.some(c => c.position === position);
    const hasTile = gameState.desertTiles.some(t => t.position === position);

    if (hasCamel || hasTile) {
      setMessage("Cannot place tile here!");
      return;
    }

    setGameState((prev) => ({
      ...prev,
      desertTiles: [
        ...prev.desertTiles.filter(t => t.owner !== prev.players[prev.currentPlayer].name),
        {
          position,
          type: placingDesertTile,
          owner: prev.players[prev.currentPlayer].name,
        },
      ],
      players: prev.players.map((p, idx) =>
        idx === prev.currentPlayer ? { ...p, money: p.money + 1 } : p
      ),
    }));

    setMessage(`${placingDesertTile} placed at position ${position + 1}!`);
    setPlacingDesertTile(null);
    nextPlayer();
  };

  const handleReset = () => {
    setGameState({
      camels: [
        { color: "red", position: 0, stackOrder: 0, direction: "forward" },
        { color: "blue", position: 0, stackOrder: 1, direction: "forward" },
        { color: "green", position: 0, stackOrder: 2, direction: "forward" },
        { color: "yellow", position: 0, stackOrder: 3, direction: "forward" },
        { color: "purple", position: 0, stackOrder: 4, direction: "forward" },
      ],
      track: Array.from({ length: 16 }, (_, i) => i),
      dice: ["red", "blue", "green", "yellow", "purple"],
      winner: null,
      desertTiles: [],
      players: gameState.players.map(p => ({ ...p, money: 3 })),
      currentPlayer: 0,
      round: 1,
      diceRolledThisRound: [],
      legBets: {
        red: [5, 3, 2],
        blue: [5, 3, 2],
        green: [5, 3, 2],
        yellow: [5, 3, 2],
        purple: [5, 3, 2],
      },
    });
    setMessage("");
    setIsGameRunning(false);
  };

  useEffect(() => {
    if (!isGameRunning || gameState.winner) {
      setIsGameRunning(false);
      return;
    }
  
    const interval = setInterval(() => {
      handleRollDice();
    }, 1000);
  
    return () => clearInterval(interval);
  }, [isGameRunning, gameState.winner, handleRollDice]);
  
  // const roleCrazyDice = () => {
  //   const crazyDice = roundState.crazyDice.map((dice) => {
  //     const roll = rollDiceOnly();
  //     return { ...dice, steps: -roll.steps - 1 };
  //   });
  //   setRoundState((prevState) => ({
  //     ...prevState,
  //     crazyDice,
  //   }));

  //   let camels = gameState.camels;

  //   crazyDice.forEach((rollResult) => {
  //     camels = moveCamel(camels, rollResult);
  //   });

  //   const movedCamel = camels;

  //   setGameState((prevState) => ({
  //     ...prevState,
  //     camels: movedCamel,
  //   }));
  // };



  const leaderboard = getLeaderboard(gameState.camels);

  return (
    <div style={{ 
      padding: "20px", 
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#FFF5E6",
      minHeight: "100vh" 
    }}>
      <h1 style={{ 
        textAlign: "center",
        color: "#8B4513",
        fontSize: "48px",
        textShadow: "2px 2px 4px rgba(0,0,0,0.3)"
      }}>
        🐪 Camel Up Racing Game 🐪
      </h1>

      <div style={{ 
        display: "flex", 
        justifyContent: "space-around",
        marginBottom: "20px",
        padding: "15px",
        backgroundColor: "#FFF",
        borderRadius: "10px",
        border: "2px solid #8B4513"
      }}>
        <div style={{ fontSize: "20px", fontWeight: "bold" }}>
          Round: {gameState.round}
        </div>
        <div style={{ fontSize: "20px" }}>
          Dice Rolled: {gameState.diceRolledThisRound.length}/5
        </div>
        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#FF6B6B" }}>
          Current Turn: {gameState.players[gameState.currentPlayer].name}
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
          animation: "fadeIn 0.5s ease-in"
        }}>
          {message}
        </div>
      )}

      <DicePyramid 
        diceRolledThisRound={gameState.diceRolledThisRound}
        availableDice={gameState.dice.filter(d => !gameState.diceRolledThisRound.includes(d))}
      />

      <div onClick={(e) => {
        const target = e.target as HTMLElement;
        if (placingDesertTile && target.style.position === 'absolute') {
          // This is a track tile click - handled by track positions
        }
      }}>
        <Track 
          camels={gameState.camels} 
          desertTiles={gameState.desertTiles}
          onPlaceDesertTile={placingDesertTile ? handleTrackClick : undefined}
        />
      </div>

      <div style={{ margin: "30px 0", textAlign: "center" }}>
        <h2>Leaderboard</h2>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
          {leaderboard.map((camel, index) => (
            <div
              key={camel.color}
              style={{
                padding: "10px 20px",
                backgroundColor: camel.color,
                color: camel.color === "yellow" || camel.color === "white" ? "black" : "white",
                borderRadius: "8px",
                fontWeight: "bold",
                border: "3px solid #333"
              }}
            >
              {index + 1}. {camel.color.toUpperCase()} (Pos: {camel.position})
            </div>
          ))}
        </div>
      </div>

      <div style={{ margin: "40px 0" }}>
        {gameState.winner ? (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ 
              color: gameState.winner,
              fontSize: "48px",
              textShadow: "3px 3px 6px rgba(0,0,0,0.3)"
            }}>
              🏆 {gameState.winner.toUpperCase()} CAMEL WINS! 🏆
            </h2>
            <button
              onClick={handleReset}
              style={{
                margin: "20px",
                padding: "15px 30px",
                fontSize: "20px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              🔄 New Game
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={() => setIsGameRunning(!isGameRunning)}
              style={{
                padding: "15px 30px",
                fontSize: "18px",
                backgroundColor: isGameRunning ? "#FF5722" : "#4CAF50",
                color: "white",
                border: "3px solid #333",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              {isGameRunning ? "⏸ Pause Auto Play" : "▶ Start Auto Play"}
            </button>
            
            <button
              onClick={handleRollDice}
              disabled={isGameRunning}
              style={{
                padding: "15px 30px",
                fontSize: "18px",
                backgroundColor: "#2196F3",
                color: "white",
                border: "3px solid #333",
                borderRadius: "8px",
                cursor: isGameRunning ? "not-allowed" : "pointer",
                fontWeight: "bold",
                opacity: isGameRunning ? 0.5 : 1
              }}
            >
              🎲 Roll Dice
            </button>

            <button
              onClick={handleReset}
              style={{
                padding: "15px 30px",
                fontSize: "18px",
                backgroundColor: "#FF9800",
                color: "white",
                border: "3px solid #333",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              🔄 Reset Game
            </button>
          </div>
        )}
      </div>

      <PlayerDashboard 
        players={gameState.players}
        currentPlayer={gameState.currentPlayer}
        legBets={gameState.legBets}
        onPlaceLegBet={handlePlaceLegBet}
        onPlaceDesertTile={handlePlaceDesertTile}
      />
    </div>
  );
};

export default CamelRaceGame;

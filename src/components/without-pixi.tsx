import React, { useState } from "react";

// Start game

type Camel = {
  color: string;
  position: number;
  stack: number;
  move: "left" | "right";
};

type GameState = {
  camels: Camel[];
  track: (null | string)[];
  dice: string[];
  winner: string | null;
  crazyDice: string[];
};

const DEFAULT_ROUND_STATE = {
  round: 0,
  dice: [
    { color: "red", diceValue: 0 },
    { color: "blue", diceValue: 0 },
    { color: "green", diceValue: 0 },
    { color: "yellow", diceValue: 0 },
    { color: "purple", diceValue: 0 },
    { color: "silver", diceValue: 0 },
  ],
  mainDice: [
    { color: "red", steps: 0 },
    { color: "blue", steps: 0 },
    { color: "green", steps: 0 },
    { color: "yellow", steps: 0 },
    { color: "purple", steps: 0 },
  ],
  crazyDice: [
    {
      color: "black",
      steps: 0,
    },
    {
      color: "white",
      steps: 0,
    },
  ],
  activeDice: [],
  maxActiveDice: 5,
};

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
  rollResult: { color: string; steps: number }
): Camel[] => {
  //--- Move camel to stack
  const selectedCamel = camels.find(
    (camel) => camel.color === rollResult.color
  );
  if (!selectedCamel) return camels;

  const nextCamelsWillHaveSamePosition = camels.filter((camel) => {
    return camel.position === selectedCamel?.position + rollResult.steps;
  });

  let newStack = 0;
  if (nextCamelsWillHaveSamePosition.length > 0) {
    newStack = nextCamelsWillHaveSamePosition.length - 1 + 1;
  }

  //--- End move camel to stack

  //--- Camel Follow the camel in same stack
  const camelsHaveSamePositionButHightStack = camels.filter(
    (camel) =>
      camel.position === selectedCamel.position &&
      camel.stack > selectedCamel.stack
  );
  //--- End Camel Follow the camel in same stack

  return camels.map((camel) => {
    const camelHaveSamePositionButHightStackIndex =
      camelsHaveSamePositionButHightStack.findIndex(
        (currentCamel: Camel) => currentCamel.color === camel.color
      );

    if (camel.color === rollResult.color) {
      return {
        ...camel,
        // Move camel position
        position: camel.position + rollResult.steps,
        stack: newStack,
      };
    } else if (camelHaveSamePositionButHightStackIndex >= 0) {
      return {
        ...camel,
        // Move camel position
        position: camel.position + rollResult.steps,
        stack: newStack + (camelHaveSamePositionButHightStackIndex + 1),
      };
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
  const winner = camels
    .filter((camel) => camel.position > trackLength)
    .sort((a, b) => b.stack - a.stack)[0];
  return winner ? winner.color : null;
};

const Track: React.FC<{ camels: Camel[] }> = ({ camels }) => {
  const trackWidth = 1000;
  const trackHeight = 500;
  const totalPositions = 16;
  const positionPerSide = totalPositions / 4;

  const getCamelPosition = (camel: Camel) => {
    const position = camel.position % totalPositions;

    let x = 0,
      y = 0;

    if (position < positionPerSide) {
      x = (trackWidth / positionPerSide) * position;
      y = 0;
    } else if (position < positionPerSide * 2) {
      x = trackWidth;
      y = (trackHeight / positionPerSide) * (position - positionPerSide);
    } else if (position < positionPerSide * 3) {
      x =
        trackWidth -
        (trackWidth / positionPerSide) * (position - positionPerSide * 2);
      y = trackHeight;
    } else {
      x = 0;
      y =
        trackHeight -
        (trackHeight / positionPerSide) * (position - positionPerSide * 3);
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
        border: "2px solid #999",
        backgroundColor: "#f0f0f0",
      }}
    >
      {Array.from({ length: totalPositions }).map((_, index) => {
        let x = 0,
          y = 0;

        if (index < positionPerSide) {
          x = (trackWidth / positionPerSide) * index;
          y = 0;
        } else if (index < positionPerSide * 2) {
          x = trackWidth;
          y = (trackHeight / positionPerSide) * (index - positionPerSide);
        } else if (index < positionPerSide * 3) {
          x =
            trackWidth -
            (trackWidth / positionPerSide) * (index - positionPerSide * 2);
          y = trackHeight;
        } else {
          x = 0;
          y =
            trackHeight -
            (trackHeight / positionPerSide) * (index - positionPerSide * 3);
        }

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${x - 10}px`,
              top: `${y - 10}px`,
              width: "20px",
              height: "20px",
              backgroundColor: index === 0 ? "#879123" : "#fff",
              border: "1px solid #999",
            }}
          ></div>
        );
      })}
      {camels.map((camel) => {
        const { x, y } = getCamelPosition(camel);
        console.log(camel.stack, "camel.stack--------", camel.color);
        return (
          <div
            key={camel.color}
            style={{
              position: "absolute",
              left: `${x}px`,
              top: `${y + camel.stack * 20}px`,
              width: "50px",
              height: "50px",
              backgroundColor: camel.color,
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "white",
              fontWeight: "bold",
              zIndex: camel.stack,
              transition: "left 0.5s, top 0.5s",
            }}
          >
            {camel.color}
          </div>
        );
      })}
    </div>
  );
};

const PlayerDashboard: React.FC<{ onPlaceBet: (color: string) => void }> = ({
  onPlaceBet,
}) => {
  return (
    <div style={{ marginTop: "20px" }}>
      {["red", "blue", "green"].map((color) => (
        <button
          key={color}
          onClick={() => onPlaceBet(color)}
          style={{
            margin: "5px",
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: color,
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Bet on {color} Camel
        </button>
      ))}
    </div>
  );
};

const CamelRaceGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    camels: [
      { color: "red", position: 0, stack: 0, move: "right" },
      { color: "blue", position: 0, stack: 0, move: "right" },
      { color: "green", position: 0, stack: 0, move: "right" },
      { color: "yellow", position: 0, stack: 0, move: "right" },
      { color: "purple", position: 0, stack: 0, move: "right" },
      { color: "white", position: 0, stack: 0, move: "left" },
      { color: "black", position: 0, stack: 0, move: "left" },
    ],
    track: Array(16).fill(null),
    dice: ["red", "blue", "green", "yellow", "purple", "silver"],
    crazyDice: ["black", "white"],
    winner: null,
  });

  const [roundState, setRoundState] = useState<{
    round: number;
    dice: { color: string; diceValue: number }[];
    mainDice: { color: string; steps: number }[];
    crazyDice: { color: string; steps: number }[];
    activeDice: { diceValue: number; color: string }[];
    maxActiveDice: number;
  }>(DEFAULT_ROUND_STATE);

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

  const handlePlaceBet = (color: string) => {
    console.log(`Player bet on ${color} camel`);
  };

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

  const handleRoleDice = () => {
    // const dice = roundState.dice.map((dice) => {
    //   const roll = rollDiceOnly();
    //   return { ...dice, diceValue: roll.steps };
    // });

    if (roundState.activeDice.length >= roundState.maxActiveDice) {
      alert("You can not roll more than 5 dice");
      return;
    }

    const activeDiceColors = roundState.activeDice.map(
      (activeDice) => activeDice.color
    );

    const inActiveDiceColors = gameState.dice.filter(
      (dice) => !activeDiceColors.includes(dice)
    );

    const selectedDice = rollDice(inActiveDiceColors);

    setRoundState((prevState) => ({
      ...prevState,
      activeDice: [
        ...prevState.activeDice,
        {
          diceValue: selectedDice.steps,
          color: selectedDice.color,
        },
      ],
    }));

    const updatedCamels = moveCamel(gameState.camels, selectedDice);

    const winner = checkWinner(updatedCamels, gameState.track.length - 1);

    setGameState((prevState) => ({
      ...prevState,
      camels: updatedCamels,
      winner: winner,
    }));
  };

  const handleNewRound = () => {
    setRoundState((prevState) => ({
      ...DEFAULT_ROUND_STATE,
      round: prevState.round + 1,
    }));
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>Camel Race Game</h1>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "2rem 0",
        }}
      >
        {Array.from({ length: roundState.maxActiveDice }).map(
          (_, diceIndex) => {
            const activeDice = roundState.activeDice.find(
              (_, activeIndex) => activeIndex === diceIndex
            );

            const color = activeDice ? activeDice.color : "white";
            const diceValue = activeDice ? activeDice.diceValue : 0;

            return (
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  backgroundColor: color,
                  color: "#000",
                }}
                key={diceIndex}
              >
                <h3>{diceValue}</h3>
              </div>
            );
          }
        )}
      </div>
      <Track camels={gameState.camels} />
      {/* {JSON.stringify(roundState, null, 4)} */}
      {/* <DiceRoller onRoll={handleRoleDice} /> */}
      {gameState.winner ? (
        <h2 style={{ textAlign: "center", color: gameState.winner }}>
          {gameState.winner.charAt(0).toUpperCase() + gameState.winner.slice(1)}{" "}
          Camel Wins!
        </h2>
      ) : (
        <>
          {roundState.activeDice.length >= roundState.maxActiveDice ? (
            <button
              style={{
              margin: "20px auto",
              padding: "10px 20px",
              fontSize: "18px",
              backgroundColor: "#ffc107",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              }}
              onClick={handleNewRound}
            >
              Next round
            </button>
          ) : (
            <button
              style={{
                margin: "20px auto",
                padding: "10px 20px",
                fontSize: "18px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
              onClick={handleRoleDice}
            >
              Roll Dice
            </button>
          )}
          {/* <DiceRoller onRoll={handleRoleDice} /> */}
        </>
      )}
      {/* <button onClick={startGameDice}>Start Game Dice</button>
      <button onClick={roleCrazyDice}>Role Crazy Dice</button>
      <button onClick={roleCrazyDice}>Role Dice in round {roundState.round}</button> */}
      {/* <div style={{ margin: '20px auto' }}>
      <button onClick={handleRoleDice}>Role Dice in round {roundState.round}</button>
      <button onClick={handleNewRound}>new round</button>
    </div> */}
      <PlayerDashboard onPlaceBet={handlePlaceBet} />
      <pre
        style={{
          width: "500px",
          margin: "20px auto",
          padding: "10px",
          backgroundColor: "#000",
          border: "1px solid #ddd",
          borderRadius: "5px",
          overflowX: "auto",
        }}
      >
        {JSON.stringify(gameState.camels, null, 4)}
      </pre>
    </div>
  );
};

export default CamelRaceGame;

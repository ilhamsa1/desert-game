import React, { useState } from 'react'

type Camel = {
  color: string
  position: number
}

type GameState = {
  camels: Camel[]
  track: (null | string)[]
  dice: string[]
  winner: string | null
}

const rollDice = (dice: string[]): { color: string; steps: number } => {
  const randomIndex = Math.floor(Math.random() * dice.length)
  const selectedDice = dice[randomIndex]
  const steps = Math.floor(Math.random() * 3) + 1
  return { color: selectedDice, steps }
}

const moveCamel = (camels: Camel[], rollResult: { color: string; steps: number }): Camel[] => {
  return camels.map((camel) =>
    camel.color === rollResult.color
      ? { ...camel, position: camel.position + rollResult.steps }
      : camel
  )
}

const checkWinner = (camels: Camel[], trackLength: number): string | null => {
  const winner = camels.find((camel) => camel.position >= trackLength)
  return winner ? winner.color : null
}

const Track: React.FC<{ camels: Camel[] }> = ({ camels }) => {
    const trackWidth = 400
    const trackHeight = 300
    const totalPositions = 16
    const positionPerSide = totalPositions / 4
  
    const getCamelPosition = (camel: Camel) => {
      const position = camel.position % totalPositions
  
      let x = 0, y = 0
  
      if (position < positionPerSide) {
        x = (trackWidth / positionPerSide) * position
        y = 0
      } else if (position < positionPerSide * 2) {
        x = trackWidth
        y = (trackHeight / positionPerSide) * (position - positionPerSide)
      } else if (position < positionPerSide * 3) {
        x = trackWidth - (trackWidth / positionPerSide) * (position - positionPerSide * 2)
        y = trackHeight
      } else {
        x = 0
        y = trackHeight - (trackHeight / positionPerSide) * (position - positionPerSide * 3)
      }
  
      return { x: x - 25, y: y - 25 }
    }
  
    return (
      <div
        style={{
          position: 'relative',
          width: `${trackWidth}px`,
          height: `${trackHeight}px`,
          margin: '0 auto',
          border: '2px solid #999',
          backgroundColor: '#f0f0f0',
        }}
      >
        {Array.from({ length: totalPositions }).map((_, index) => {
          let x = 0, y = 0
  
          if (index < positionPerSide) {
            x = (trackWidth / positionPerSide) * index
            y = 0
          } else if (index < positionPerSide * 2) {
            x = trackWidth
            y = (trackHeight / positionPerSide) * (index - positionPerSide)
          } else if (index < positionPerSide * 3) {
            x = trackWidth - (trackWidth / positionPerSide) * (index - positionPerSide * 2)
            y = trackHeight
          } else {
            x = 0
            y = trackHeight - (trackHeight / positionPerSide) * (index - positionPerSide * 3)
          }
  
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${x - 10}px`,
                top: `${y - 10}px`,
                width: '20px',
                height: '20px',
                backgroundColor: (index === 0) ? '#879123' : '#fff',
                border: '1px solid #999',
              }}
            ></div>
          )
        })}
        {camels.map((camel) => {
          const { x, y } = getCamelPosition(camel)
          return (
            <div
              key={camel.color}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: '50px',
                height: '50px',
                backgroundColor: camel.color,
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                fontWeight: 'bold',
                transition: 'left 0.5s, top 0.5s',
              }}
            >
              {camel.color}
            </div>
          )
        })}
      </div>
    )
  }
  
  

const DiceRoller: React.FC<{ onRoll: () => void }> = ({ onRoll }) => {
  return (
    <button
      style={{
        margin: '20px auto',
        padding: '10px 20px',
        fontSize: '18px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
      }}
      onClick={onRoll}
    >
      Roll Dice
    </button>
  )
}

const PlayerDashboard: React.FC<{ onPlaceBet: (color: string) => void }> = ({ onPlaceBet }) => {
  return (
    <div style={{ marginTop: '20px' }}>
      {['red', 'blue', 'green'].map((color) => (
        <button
          key={color}
          onClick={() => onPlaceBet(color)}
          style={{
            margin: '5px',
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: color,
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Bet on {color} Camel
        </button>
      ))}
    </div>
  )
}

const CamelRaceGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    camels: [
      { color: 'red', position: 0 },
      { color: 'blue', position: 0 },
      { color: 'green', position: 0 },
    ],
    track: Array(16).fill(null),
    dice: ['red', 'blue', 'green'],
    winner: null,
  })

  const handleRollDice = () => {
    if (gameState.winner) return

    const rollResult = rollDice(gameState.dice)
    const updatedCamels = moveCamel(gameState.camels, rollResult)
    const winner = checkWinner(updatedCamels, gameState.track.length - 1)

    setGameState((prevState) => ({
      ...prevState,
      camels: updatedCamels,
      winner: winner,
    }))
  }

  const handlePlaceBet = (color: string) => {
    console.log(`Player bet on ${color} camel`)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>Project Desert Game</h1>
      <Track camels={gameState.camels} />
      {gameState.winner ? (
        <h2 style={{ textAlign: 'center', color: gameState.winner }}>
          {gameState.winner.charAt(0).toUpperCase() + gameState.winner.slice(1)} Camel Wins!
        </h2>
      ) : (
        <DiceRoller onRoll={handleRollDice} />
      )}
      <PlayerDashboard onPlaceBet={handlePlaceBet} />
    </div>
  )
}

export default CamelRaceGame

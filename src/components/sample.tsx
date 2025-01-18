// import { BlurFilter } from 'pixi.js';
// import { Stage, Container, Sprite, Text } from '@pixi/react';
// import { useMemo, useState } from 'react';

// type Camel = {
//   color: string;
//   position: number;
// };

// type GameState = {
//   camels: Camel[];
//   track: (null | string)[];
//   dice: string[];
// };

// const rollDice = (dice: string[]): { color: string; steps: number } => {
//   const randomIndex = Math.floor(Math.random() * dice.length);
//   const selectedDice = dice[randomIndex];
//   const steps = Math.floor(Math.random() * 3) + 1;
//   return { color: selectedDice, steps };
// };

// const moveCamel = (camels: Camel[], rollResult: { color: string; steps: number }): Camel[] => {
//   return camels.map(camel =>
//     camel.color === rollResult.color
//       ? { ...camel, position: camel.position + rollResult.steps }
//       : camel
//   );
// };

// const initialState = {
//   camels: [
//     { color: 'red', position: 0 },
//     { color: 'blue', position: 0 },
//     { color: 'green', position: 0 },
//     { color: 'yellow', position: 0 },
//   ],
//   track: Array(16).fill(null),
//   dice: ['red', 'blue', 'green', 'yellow'],
// };

// type TrackProps = {
//   camels: Camel[];
// };


// const Track: React.FC<TrackProps> = ({ camels }) => {
//   return (
//     <Container>
//       {Array(16).fill(null).map((_, index) => (
//         <Sprite
//           key={index}
//           image="/path/to/tile.png"
//           x={index * 50}
//           y={100}
//         />
//       ))}
//       {camels.map((camel, index) => (
//         <Sprite
//           key={camel.color}
//           image={`/path/to/${camel.color}-camel.png`}
//           x={camel.position * 50} 
//           y={80 - index * 20} 
//           width={70}
//           height={70}
//         />
//       ))}
//     </Container>
//   );
// };

// type DiceRollerProps = {
//   onRoll: () => void;
// };

// type PlayerDashboardProps = {
//   onPlaceBet: (color: string) => void;
// };


// const DiceRoller: React.FC<DiceRollerProps> = ({ onRoll }) => {
//   return (
//     <Text
//       text="Roll Dice"
//       x={100}
//       y={300}
//       interactive
//       buttonMode
//       onpointerdown={(e) =>{
//         console.log(e)
//         onRoll(e)
//       }}
//       onclick={(e) =>{
//         console.log(e)
//         onRoll(e)
//       }}
//       style={{ fill: 'white', fontSize: 24 }}
//     />
//   );
// };

// const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ onPlaceBet }) => {
//   return (
//     <Container>
//       {['red', 'blue', 'green'].map(color => (
//         <Text
//           key={color}
//           text={`Bet on ${color} Camel`}
//           x={10}
//           y={400 + ['red', 'blue', 'green'].indexOf(color) * 50}
//           interactive
//           buttonMode
//           onpointerdown={() => onPlaceBet(color)}
//           style={{ fill: color, fontSize: 18 }}
//         />
//       ))}
//     </Container>
//   );
// };

// export const Sample = () =>
// {
//   const [gameState, setGameState] = useState<GameState>({
//     camels: [
//       { color: 'red', position: 0 },
//       { color: 'blue', position: 0 },
//       { color: 'green', position: 0 },
//     ],
//     track: Array(16).fill(null),
//     dice: ['red', 'blue', 'green'],
//   });

//   const handleRollDice = () => {
//     console.log('hailoo')
//     const rollResult = rollDice(gameState.dice);
//     setGameState(prevState => ({
//       ...prevState,
//       camels: moveCamel(prevState.camels, rollResult),
//     }));
//   };

//   const handlePlaceBet = (color: string) => {
//     console.log(`Player bet on ${color} camel`);
//   };

//   return (
//     <>
//       <img src="/path/to/tile.png" style={{ width: 50, height: 50 }} />
//       <Stage width={800} height={600} options={{ }}>
//         <Track camels={gameState.camels} />
//         <DiceRoller onRoll={handleRollDice} />
//         <PlayerDashboard onPlaceBet={handlePlaceBet} />
//       </Stage>
//     </>
//   );
// };
// import React, { useEffect, useState, useRef } from 'react';
// import { Stage, Container, Graphics, Text } from '@pixi/react';
// import * as PIXI from 'pixi.js';

// const Sample2 = () => {
//   const [logs, setLogs] = useState<string[]>([]);
//   const stageRef = useRef<PIXI.Container | null>(null);

//   const logEvent = (type: string, targetName: string, currentTargetName: string) => {
//     setLogs((prevLogs) => {
//       const newLogs = [
//         `${currentTargetName} received ${type} event (target is ${targetName})`,
//         ...(currentTargetName === 'stage' || type === 'pointerenter' || type === 'pointerleave'
//           ? ['-----------------------------------------', '']
//           : []),
//       ];

//       const trimmedLogs = [...newLogs, ...prevLogs].slice(0, 30);
//       return trimmedLogs;
//     });
//   };

//   const handlePointerEvent = (event: PIXI.FederatedPointerEvent) => {
//     if (!stageRef.current) return;

//     const type = event.type;
//     const targetName = (event.target as PIXI.Container)?.name || 'unknown';
//     const currentTargetName = (event.currentTarget as PIXI.Container)?.name || 'unknown';

//     logEvent(type, targetName, currentTargetName);
//   };

//   return (
//     <Stage
//       options={{ backgroundColor: 0x1099bb, resizeTo: window }}
//       onPointerEnter={handlePointerEvent}
//       onPointerLeave={handlePointerEvent}
//       onPointerOver={handlePointerEvent}
//       onPointerOut={handlePointerEvent}
//       ref={(ref) => {
//         if (ref) stageRef.current = ref?.container as PIXI.Container;
//       }}
//     >
//       <Container name="stage">
//         <Text
//           text={`Move your mouse slowly over the boxes to
// see the order of pointerenter, pointerleave,
// pointerover, pointerout events on each target!`}
//           style={{ fontSize: 16, fill: 0xffffff }}
//           x={2}
//         />
//         <Text
//           text={logs.join('\n')}
//           style={{ fontSize: 14, fill: 0xffffff }}
//           x={2}
//           y={80}
//         />
//         <Graphics
//           name="black box"
//           x={400}
//           draw={(g) => {
//             g.clear();
//             g.beginFill(0x000000);
//             g.drawRect(0, 0, 400, 400);
//             g.endFill();
//           }}
//           interactive
//           pointerEvents="all"
//         >
//           <Graphics
//             name="white box"
//             x={100}
//             y={100}
//             draw={(g) => {
//               g.clear();
//               g.beginFill(0xffffff);
//               g.drawRect(0, 0, 200, 200);
//               g.endFill();
//             }}
//             interactive
//             pointerEvents="all"
//             onPointerEnter={handlePointerEvent}
//             onPointerLeave={handlePointerEvent}
//             onPointerOver={handlePointerEvent}
//             onPointerOut={handlePointerEvent}
//           />
//         </Graphics>
//       </Container>
//     </Stage>
//   );
// };

// export default Sample2;

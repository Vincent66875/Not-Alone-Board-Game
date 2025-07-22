// components/PlanningPhase.tsx
import React from 'react';
import type { Player, GameState } from '../../mult_backend/game/gameEngine';
import { allLocations } from '../../mult_backend/game/gameEngine';

type Props = {
  player: Player;
  gameState: GameState;
  onCardSelect: (cardId: number) => void;
};

const PlanningPhase: React.FC<Props> = ({ player, gameState, onCardSelect }) => {
  const numericHand = player.hand.map(Number);
  console.log("Hands: ", player.hand);
  console.log('Card at index 6:', allLocations[6]);
  console.log('allLocations:', allLocations);

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-6">
      {allLocations.map((locName, index) => {
        const locId = index + 1; // card IDs start at 1
        const inHand = numericHand.includes(locId);

        return (
          <img
            key={locId}
            src={`/cards/${locName}.png`}
            alt={locName}
            className={`w-28 h-auto rounded-lg shadow-md transition-transform duration-200 ${
              inHand ? 'hover:scale-105 cursor-pointer' : 'grayscale opacity-40 pointer-events-none'
            }`}
            onClick={() => inHand && onCardSelect(locId)}
          />
        );
      })}
    </div>
  );
};

export default PlanningPhase;

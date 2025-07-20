// components/PlanningPhase.tsx
import React from 'react';
import type { Player, GameState } from '../../mult_backend/game/gameEngine';
import { allLocations } from '../../game/ai';

type Props = {
  player: Player;
  gameState: GameState;
  onCardSelect: (cardId: number) => void;
};

const PlanningPhase: React.FC<Props> = ({ player, gameState, onCardSelect }) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-6">
      {allLocations.map((locName, locId) => {
        const inHand = player.hand.includes(locId);
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

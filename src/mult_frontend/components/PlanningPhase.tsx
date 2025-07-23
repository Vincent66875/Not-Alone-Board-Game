// components/PlanningPhase.tsx
import { useState } from 'react';
import type { Player, GameState } from '../../mult_backend/gameEngine';
import { allLocations } from '../../mult_backend/gameEngine';

type Props = {
  player: Player;
  gameState: GameState;
  onCardSelect: (cardId: number) => void;
};

const PlanningPhase: React.FC<Props> = ({ player, gameState, onCardSelect }) => {
  const numericHand = player.hand.map(Number);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  return (
    <div className="relative">
      {/* Overlay Preview Modal */}
      {selectedCardId !== null && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex flex-col items-center justify-center">
          <img
            src={`/cards/${allLocations[selectedCardId]}.png`}
            alt="Selected Card"
            className="w-64 h-auto mb-6 shadow-lg rounded-lg"
          />
          <div className="flex gap-6">
            <button
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={() => {
                onCardSelect(selectedCardId + 1);
                setSelectedCardId(null);
              }}
            >
              Play
            </button>
            <button
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={() => setSelectedCardId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Card Grid */}
      <div
        className={`grid grid-cols-5 gap-4 max-w-[35rem] mx-auto transition duration-300 ${
          selectedCardId !== null ? 'grayscale opacity-30 pointer-events-none' : ''
        }`}
      >
        {allLocations.map((locName, locId) => {
          const inHand = numericHand.includes(locId + 1);
          return (
            <img
              key={locId}
              src={`/cards/${locName}.png`}
              alt={locName}
              className={`w-28 h-auto rounded-lg shadow-md transition-transform duration-200 ${
                inHand ? 'hover:scale-105 cursor-pointer' : 'grayscale opacity-40 pointer-events-none'
              }`}
              onClick={() => {
                if (inHand) setSelectedCardId(locId);
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PlanningPhase;

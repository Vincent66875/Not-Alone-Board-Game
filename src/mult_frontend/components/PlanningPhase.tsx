// components/PlanningPhase.tsx
import { useState } from 'react';
import type { Player, GameState } from '../../mult_backend/gameEngine';
import { allLocations } from '../../mult_backend/gameEngine';

type Props = {
  player: Player;
  gameState: GameState;
  onCardSelect: (cardId: number, cardIdAlt?: number) => void;
};

const PlanningPhase: React.FC<Props> = ({ player, gameState, onCardSelect }) => {
  const numericHand = player.hand.map(Number);
  const riverMode = player.riverActive
  const [selectedCardId, setSelectedCardId] = useState<number[]>([]);

  const toggleCard = (cardId: number) => {
    if (!numericHand.includes(cardId + 1)) return;
    if (riverMode) {
      if (selectedCardId.includes(cardId)) {
        setSelectedCardId(selectedCardId.filter(id => id !== cardId));
      } else if (selectedCardId.length < 2) {
        setSelectedCardId([...selectedCardId, cardId]);
      }
    } else {
      setSelectedCardId([cardId]);
    }
  };

  const confirmSelection = () => {
    if (selectedCardId.length === 1) {
      onCardSelect(selectedCardId[0] + 1);
    } else if (selectedCardId.length === 2) {
      onCardSelect(selectedCardId[0] + 1, selectedCardId[1] + 1);
    }
    setSelectedCardId([]);
  };

  const cancelSelection = () => {
    setSelectedCardId([]);
  };

  const readyToPlay = (!riverMode && selectedCardId.length === 1) || (riverMode && selectedCardId.length === 2);

  return (
    <div className="relative">
      {/* Modal */}
      {readyToPlay && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex flex-col items-center justify-center">
          <div className="flex gap-6 mb-6">
            {selectedCardId.map(id => (
              <img
                key={id}
                src={`/cards/${allLocations[id]}.png`}
                alt="Selected"
                className="w-52 h-auto shadow-lg rounded-lg"
              />
            ))}
          </div>
          <div className="flex gap-6">
            <button
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={confirmSelection}
            >
              Play
            </button>
            <button
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={cancelSelection}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Card Grid */}
      <div
        className={`grid grid-cols-5 gap-4 max-w-[35rem] mx-auto transition duration-300 ${
          readyToPlay ? 'grayscale opacity-30 pointer-events-none' : ''
        }`}
      >
        {allLocations.map((locName, locId) => {
          const inHand = numericHand.includes(locId + 1);
          const isSelected = selectedCardId.includes(locId);

          return (
            <img
              key={locId}
              src={`/cards/${locName}.png`}
              alt={locName}
              className={`w-28 h-auto rounded-lg shadow-md transition-transform duration-200 ${
                inHand ? 'hover:scale-105 cursor-pointer' : 'grayscale opacity-40 pointer-events-none'
              } ${isSelected ? 'ring-4 ring-yellow-400 scale-105' : ''}`}
              onClick={() => toggleCard(locId)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PlanningPhase;

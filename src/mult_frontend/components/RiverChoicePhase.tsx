import { useState } from 'react';
import type { GameState, Player } from '../../mult_backend/gameEngine';
import { allLocations } from '../../mult_backend/gameEngine';

interface RiverChoicePhaseProps {
  player: Player;
  players: Player[];
  gameState: GameState;
  onSubmit: (cardId: number) => void;
}

export default function RiverChoicePhase({
  player,
  players,
  gameState,
  onSubmit,
}: RiverChoicePhaseProps) {

  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const huntedMap = new Map<number, 'c' | 'a' | 't'>(
    gameState.huntedLocations?.map(h => [h.cardId, h.type]) || []
  );

  const hasRiverChoice = player.riverActive && player.playedCard && player.playedCardAlt;

  function confirmChoice() {
    if (selectedCardId !== null) {
      onSubmit(selectedCardId);
    }
  }

  return (
    <div className="flex flex-col items-center mt-4 text-white">
      <h2 className="text-2xl font-semibold mb-6">River Decision Phase</h2>

      {!hasRiverChoice && (
        <div className="mb-4 text-yellow-300">Waiting for players with River ability to choose...</div>
      )}

      <div className="grid grid-cols-5 gap-6">
        {Array.from({ length: 10 }, (_, i) => {
          const cardId = i + 1;
          const isHunted = huntedMap.has(cardId);
          const tokenType = huntedMap.get(cardId);
          const isPlayed = player.playedCard === cardId || player.playedCardAlt === cardId;

          return (
            <div
              key={cardId}
              className={`relative flex flex-col items-center p-2 rounded-xl shadow-md ${
                isPlayed ? 'border-4 border-blue-400' : ''
              } ${isHunted ? 'grayscale' : ''}`}
            >
              <div className="text-sm mb-2">Location {cardId}</div>
              <img
                src={`/cards/${allLocations[i]}.png`}
                alt={`Card ${cardId}`}
                className="w-24 h-auto rounded"
              />
              {tokenType && (
                <img
                  src={`/tokens/${tokenType}.png`}
                  alt={`Token ${tokenType}`}
                  className="absolute top-0 right-0 w-8 h-8"
                />
              )}
            </div>
          );
        })}
      </div>

      {hasRiverChoice && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex flex-col items-center justify-center">
          <h3 className="text-xl font-bold mb-4">Choose a card to reveal</h3>
          <div className="flex gap-6 mb-6">
            {[player.playedCard, player.playedCardAlt].map(id => (
              id !== undefined && (
                <img
                  key={id}
                  src={`/cards/${allLocations[id - 1]}.png`}
                  alt={`Card ${id}`}
                  className={`w-40 h-auto rounded cursor-pointer shadow-lg ${
                    selectedCardId === id ? 'border-4 border-yellow-400' : 'border-2 border-transparent'
                  }`}
                  onClick={() => setSelectedCardId(id)}
                />
              )
            ))}
          </div>
          <div className="flex gap-6">
            <button
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={confirmChoice}
              disabled={selectedCardId === null}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

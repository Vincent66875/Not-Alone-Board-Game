import { useState } from 'react';
import type { Player, GameState } from '../../mult_backend/gameEngine';
import { allLocations } from '../../mult_backend/gameEngine';

type Props = {
  gameState: GameState;
  player: Player;
  players: Player[];
};

export default function WaitingPage({ gameState, player, players }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  const playedCards = Array.isArray(player.playedCard)
    ? player.playedCard
    : player.playedCard !== undefined
    ? [player.playedCard]
    : [];


  if (gameState.phase === 'planning') {
    if (player.isCreature) {
      return (
        <div className="text-white text-center text-xl mt-10">
          Waiting for all players to play their cards...
        </div>
      );
    }

    // Survivor: previewable but non-playable grid, with highlights on played cards
    return (
      <div className="relative">
        {selectedCardId !== null && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex flex-col items-center justify-center">
            <img
              src={`/cards/${allLocations[selectedCardId]}.png`}
              alt={`Preview of ${allLocations[selectedCardId]}`}
              className="w-64 h-auto mb-6 shadow-lg rounded-lg"
            />
            <button
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              onClick={() => setSelectedCardId(null)}
            >
              Close Preview
            </button>
          </div>
        )}

        {/* Grid with highlight for played cards */}
        <div className="grid grid-cols-5 gap-4 max-w-[35rem] mx-auto">
          {allLocations.map((locName, locId) => {
            const isPlayed = playedCards.some(cardId => cardId - 1 === locId);

            return (
              <div
                key={locId}
                className={`relative cursor-pointer rounded-lg shadow-md border-4 ${
                  isPlayed ? 'border-yellow-400' : 'border-transparent'
                }`}
                onClick={() => setSelectedCardId(locId)}
              >
                <img
                  src={`/cards/${locName}.png`}
                  alt={locName}
                  className="w-28 h-auto rounded-lg"
                />
                {isPlayed && (
                  <div className="absolute bottom-1 right-1 text-xs text-yellow-300 bg-black bg-opacity-60 px-1 rounded">
                    Played
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-white text-center text-lg mt-6">
          Waiting for other players to finish...
        </div>
      </div>
    );
  }

  // Other phases
  return (
    <div className="text-white text-center text-xl mt-10">
      Waiting for next phase: <span className="font-semibold">{gameState.phase}</span>
    </div>
  );
}

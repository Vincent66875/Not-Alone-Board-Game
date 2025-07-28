import { useState } from 'react';
import type { Player, GameState } from '../../mult_backend/gameEngine';
import { allLocations } from '../../mult_backend/gameEngine';

type ResolutionPageProps = {
  player: Player;
  players: Player[];
  gameState: GameState;
  onContinue: () => void;
  onActivateCard: (cardId: number) => void;
};

export default function ResolutionPage({
  player,
  players,
  gameState,
  onContinue,
  onActivateCard,
}: ResolutionPageProps) {
  const huntedMap = new Map<number, 'c' | 'a' | 't'>(
    gameState.huntedLocations?.map(h => [h.cardId, h.type]) || []
  );

  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const playedCardId = player.playedCard;
  const altCardId = player.playedCardAlt;

  const isCardActivatable = (cardId: number) =>
    cardId !== undefined &&
    !huntedMap.has(cardId) &&
    (playedCardId === cardId || altCardId === cardId);

  function handleCardClick(cardId: number) {
    if (isCardActivatable(cardId)) {
      setSelectedCard(cardId);
    }
  }

  function confirmActivation() {
    if (selectedCard !== null) {
      onActivateCard(selectedCard);
      setSelectedCard(null);
    }
  }

  function cancelActivation() {
    setSelectedCard(null);
  }

  return (
    <div className="flex flex-col items-center mt-4 text-white">
      <h2 className="text-2xl font-semibold mb-6">Resolution Phase</h2>
      <p className="mb-4">Tokens have been revealed. Review the results below:</p>

      <div className="grid grid-cols-5 gap-6">
        {Array.from({ length: 10 }, (_, i) => {
          const cardId = i + 1;
          const isHunted = huntedMap.has(cardId);
          const tokenType = huntedMap.get(cardId);
          const isPlayed = playedCardId === cardId || altCardId === cardId;
          const isSafe = isPlayed && !isHunted;

          return (
            <div
              key={cardId}
              className={`relative flex flex-col items-center p-2 rounded-xl shadow-lg transition-transform duration-150 ${
                isPlayed
                  ? isSafe
                    ? 'border-4 border-green-400 cursor-pointer animate-pulse'
                    : 'border-4 border-red-500'
                  : ''
              } ${isHunted ? 'grayscale' : ''}`}
              onClick={() => handleCardClick(cardId)}
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

      {!playedCardId && (
        <p className="text-yellow-300 mt-6">You didn’t play a card this turn.</p>
      )}

      {(playedCardId && huntedMap.has(playedCardId)) || (altCardId && huntedMap.has(altCardId)) ? (
        <button
          className="mt-6 px-6 py-2 bg-blue-600 rounded hover:bg-blue-700"
          onClick={onContinue}
        >
          Continue
        </button>
      ) : null}

      {/* ✅ Activation Modal */}
      {selectedCard !== null && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex flex-col items-center justify-center">
          <div className="flex gap-6 mb-6">
            <img
              src={`/cards/${allLocations[selectedCard - 1]}.png`}
              alt="Selected"
              className="w-52 h-auto shadow-lg rounded-lg"
            />
          </div>
          <div className="flex gap-6">
            <button
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={confirmActivation}
            >
              Activate
            </button>
            <button
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={cancelActivation}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

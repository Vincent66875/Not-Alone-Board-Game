import { useState } from 'react';
import { allLocations } from '../../mult_backend/gameEngine';
import type { Player, GameState } from '../../mult_backend/gameEngine';

type Props = {
  player: Player;
  gameState: GameState;
  players: Player[];
  onHuntSelect: (cardId: number, tokenType: 'c' | 'a' | 't') => void;
};

export default function HuntingPhase({ player, gameState, players, onHuntSelect }: Props) {
  const isCreature = player.isCreature;
  const [previewCardId, setPreviewCardId] = useState<number | null>(null);

  const tokenOrder: ('t' | 'a' | 'c')[] = ['t', 'a', 'c'];
  const remainingTokens = gameState.remainingTokens;
  const currentTokenType = remainingTokens > 0
  ? tokenOrder[3 - remainingTokens]
  : null;
  console.log("remaining: " + remainingTokens);
  
  function handleCardClick(cardId: number) {
    if (!isCreature || remainingTokens === 0 || currentTokenType === null) return;
    setPreviewCardId(cardId);
  }

  function handleConfirm() {
    if (previewCardId === null || currentTokenType === null) return;
    onHuntSelect(previewCardId, currentTokenType);
    setPreviewCardId(null); // Reset after confirming
  }

  return (
    <div className="flex flex-col items-center mt-4 text-white">
      <h2 className="text-2xl font-semibold mb-6">Hunting Phase</h2>
      <p className="mb-2 text-lg">
        {isCreature ? (
          currentTokenType !== null ? (
            `Choose a location for token '${currentTokenType.toUpperCase()}'`
          ) : (
            'No tokens remaining.Yo'
          )
        ) : (
          'Wait for the Creature to make their move.'
        )}
      </p>
      {isCreature && (
        <p className="text-sm text-gray-300 mb-4">
          Remaining tokens: {remainingTokens}
        </p>
      )}

      {/* Preview selected card */}
      {isCreature && previewCardId !== null && currentTokenType !== null && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex flex-col items-center justify-center">
          <div className="flex gap-6 mb-6">
            <img
              src={`/cards/${allLocations[previewCardId - 1]}.png`}
              alt="Selected"
              className="w-52 h-auto shadow-lg rounded-lg"
            />
          </div>
          <div className="text-white text-lg mb-4">
            Confirm token <strong>{currentTokenType.toUpperCase()}</strong> at location{' '}
            <strong>{previewCardId}</strong>?
          </div>
          <div className="flex gap-6">
            <button
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={handleConfirm}
            >
              Confirm
            </button>
            <button
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={() => setPreviewCardId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grid of location cards */}
      <div className="grid grid-cols-5 gap-6">
        {Array.from({ length: 10 }, (_, i) => {
          const cardId = i + 1;
          const isSelected = previewCardId === cardId;

          return (
            <div
              key={cardId}
              className={`flex flex-col items-center bg-gray-800 p-4 rounded-xl shadow-lg cursor-pointer transition-transform duration-150 ${
                isSelected ? 'border-4 border-yellow-400 scale-105' : 'hover:scale-105'
              }`}
              onClick={() => handleCardClick(cardId)}
            >
              <div className="text-sm mb-2">Location {cardId}</div>
              <img
                src={`/cards/${allLocations[i]}.png`}
                alt={`Card ${cardId}`}
                className="w-24 h-auto rounded"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

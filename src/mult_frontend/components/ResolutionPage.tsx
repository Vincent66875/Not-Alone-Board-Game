import type { Player, GameState } from '../../mult_backend/gameEngine';
import { allLocations } from '../../mult_backend/gameEngine';

type ResolutionPageProps = {
  player: Player;
  players: Player[];
  gameState: GameState;
  onContinue: () => void;
};

export default function ResolutionPage({
  player,
  players,
  gameState,
  onContinue,
}: ResolutionPageProps) {
  const huntedMap = new Map<number, 'c' | 'a' | 't'>(
    gameState.huntedLocations?.map(h => [h.cardId, h.type]) || []
  );

  const playedCardId = player.playedCard;
  console.log(playedCardId);
  return (
    <div className="flex flex-col items-center mt-4 text-white">
      <h2 className="text-2xl font-semibold mb-6">Resolution Phase</h2>
      <p className="mb-4">Tokens have been revealed. Review the results below:</p>

      <div className="grid grid-cols-5 gap-6">
        {Array.from({ length: 10 }, (_, i) => {
          const cardId = i + 1;
          const isHunted = huntedMap.has(cardId);
          const tokenType = huntedMap.get(cardId);
          const isPlayed = playedCardId === cardId;
          const wasSafe = isPlayed && !isHunted;

          return (
            <div
              key={cardId}
              className={`relative flex flex-col items-center p-2 rounded-xl shadow-lg transition-transform duration-150 ${
                isPlayed
                  ? wasSafe
                    ? 'border-4 border-green-400 cursor-pointer animate-pulse'
                    : 'border-4 border-red-500'
                  : ''
              } ${isHunted ? 'grayscale' : ''}`}
              onClick={() => {
                if (wasSafe) onContinue();
              }}
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

      {playedCardId && huntedMap.has(playedCardId) && (
        <button
          className="mt-6 px-6 py-2 bg-blue-600 rounded hover:bg-blue-700"
          onClick={onContinue}
        >
          Continue
        </button>
      )}
    </div>
  );
}

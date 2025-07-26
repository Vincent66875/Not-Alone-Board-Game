import React, { useEffect } from 'react';
import type { Player, GameState } from '../../mult_backend/gameEngine';
import { allLocations } from '../../mult_backend/gameEngine';
type ResolutionPageProps = {
  player: Player;
  players: Player[];
  gameState: GameState;
  onContinue: () => void;
};

const tokenColors: Record<string, string> = {
  Creature: 'bg-red-600',
  Assimilation: 'bg-yellow-500',
  Shadow: 'bg-purple-600'
};

const ResolutionPage: React.FC<ResolutionPageProps> = ({
  player,
  players,
  gameState,
  onContinue,
}) => {
  useEffect(() => {
    console.log('Resolution phase started. Game state:', gameState);
  }, [gameState]);

  const huntedLocations = gameState.huntedLocations ?? [];

  const locationHasToken = (locationId: number, type: 'c' | 'a' | 't') => {
    return huntedLocations.some(
      (h) => h.cardId === locationId && h.type === type
    );
  };

  const getTokenTypesOnLocation = (locationId: number): ('c' | 'a' | 't')[] => {
    return huntedLocations
      .filter((h) => h.cardId === locationId)
      .map((h) => h.type);
  };

  return (
    <div className="p-6 text-white">
      <h2 className="text-3xl font-bold mb-6 text-center">Resolution Phase</h2>

      <div className="grid grid-cols-4 gap-4 justify-items-center mb-8">
        {allLocations.map((name, i) => {
          const locationId = i + 1;
          const tokenTypes = getTokenTypesOnLocation(locationId);

          return (
            <div key={locationId} className="relative">
              <img
                src={`/cards/${name}.png`}
                alt={name}
                className="w-32 h-auto rounded-xl shadow-lg"
              />
              {tokenTypes.map((type) => (
                <span
                  key={type}
                  className={`absolute top-1 left-1 text-xs text-white px-2 py-1 rounded-full shadow ${tokenColors[type] || 'bg-gray-700'} mt-1 mr-1`}
                >
                  {type}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      <h3 className="text-xl font-semibold mb-4 text-center">Player Reveals</h3>
      <div className="grid grid-cols-3 gap-6 justify-items-center mb-10">
        {players
          .filter((p) => !p.isCreature && p.playedCard)
          .map((p) => (
            <div
              key={p.id}
              className="bg-gray-800 p-4 rounded-xl w-40 text-center shadow-lg"
            >
              <p className="text-sm mb-2">{p.name}</p>
              <img
                src={`/cards/${allLocations[(p.playedCard ?? 1) - 1]}.png`}
                alt={`Card ${p.playedCard}`}
                className="w-full rounded"
              />
              {locationHasToken(p.playedCard!, 'c') && (
                <p className="text-red-500 mt-2 text-xs">Caught by Creature</p>
              )}
              {locationHasToken(p.playedCard!, 'a') && (
                <p className="text-yellow-400 mt-1 text-xs">Assimilation!</p>
              )}
            </div>
          ))}
      </div>

      {player.isCreature && (
        <div className="text-center">
          <button
            onClick={onContinue}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl text-lg"
          >
            Continue to Next Phase
          </button>
        </div>
      )}
    </div>
  );
};

export default ResolutionPage;
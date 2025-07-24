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
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);

  // Token order: creature, assimilation, target
  const tokenOrder: ('c' | 'a' | 't')[] = ['c', 'a', 't'];

  // Determine which token to place now based on huntedLocations length
  const placedTokens = gameState.huntedLocations?.length ?? 0;
  const currentTokenType = tokenOrder[placedTokens] ?? 'c'; // fallback 'c' if out of bounds

  const survivorsWithPlayedCards = players.filter(p => !p.isCreature && p.playedCard !== undefined);

  function handleHuntSelect(cardId: number) {
    if (!isCreature) return;
    setSelectedLocation(cardId);
    onHuntSelect(cardId, currentTokenType);
  }

  return (
    <div className="flex flex-col items-center mt-4 text-white">
      <h2 className="text-2xl font-semibold mb-6">Hunting Phase</h2>
      <p className="mb-4 text-lg">
        {isCreature
          ? `Choose location for token "${currentTokenType.toUpperCase()}".`
          : 'Wait for the creature to make a move.'}
      </p>

      <div className="grid grid-cols-4 gap-6">
        {survivorsWithPlayedCards.map(p => {
          const cardIndex = (p.playedCard ?? 1) - 1;
          const isSelected = selectedLocation === p.playedCard;

          return (
            <div
              key={p.id}
              className={`flex flex-col items-center bg-gray-800 p-4 rounded-xl shadow-lg cursor-pointer ${
                isSelected ? 'border-4 border-yellow-400' : ''
              }`}
              onClick={() => handleHuntSelect(p.playedCard!)}
            >
              <div className="text-sm mb-2">{p.name}</div>
              <img
                src={`/cards/${allLocations[cardIndex]}.png`}
                alt={`Card ${p.playedCard}`}
                className="w-28 h-auto rounded"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

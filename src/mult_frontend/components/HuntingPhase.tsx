import type { Player, GameState } from '../../mult_backend/gameEngine';
import { allLocations } from '../../mult_backend/gameEngine';

type Props = {
  player: Player;
  gameState: GameState;
  players: Player[];
};

export default function HuntingPhase({ player, gameState, players }: Props) {
  const isCreature = player.isCreature;

  return (
    <div className="flex flex-col items-center mt-4 text-white">
      <h2 className="text-2xl font-semibold mb-6">Hunting Phase</h2>
      <p className="mb-4 text-lg">
        {isCreature
          ? 'Choose where to hunt.'
          : 'Wait for the creature to make a move.'}
      </p>

      <div className="grid grid-cols-4 gap-6">
        {players
          .filter(p => !p.isCreature && p.playedCard !== undefined)
          .map(p => (
            <div
              key={p.id}
              className="flex flex-col items-center bg-gray-800 p-4 rounded-xl shadow-lg"
            >
              <div className="text-sm mb-2">{p.name}</div>
              <img
                src={`/cards/${allLocations[(p.playedCard ?? 1) - 1]}.png`}
                alt={`Card ${p.playedCard}`}
                className="w-28 h-auto rounded"
              />
            </div>
          ))}
      </div>
    </div>
  );
}

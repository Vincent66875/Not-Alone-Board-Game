import type { Player } from '../../mult_backend/gameEngine';

interface GameDownBarProps {
  players: Player[];
  player: Player;
}

export default function GameDownBar({ players, player }: GameDownBarProps) {

  return (
    <>
      {/* Main Player Info Bar */}
      <div className="w-full fixed bottom-0 left-0 text-white py-3 px-4 flex gap-6 overflow-x-auto bg-black bg-opacity-70">
        {players
          .filter(p => !p.isCreature)
          .map((p) => (
            <div
              key={p.id || p.name}
              className="flex flex-col items-center min-w-[90px] bg-gray-800 rounded-md px-3 py-2"
              title={`${p.name}`}
            >
              <div className="font-semibold text-sm truncate w-full text-center">{p.name}</div>
              <div className="text-xs mt-1">
                <span className="font-bold">Will:</span> {p.will}
              </div>
              <div className="text-xs mt-0.5">
                <span className="font-bold">Hand:</span> {p.hand.length}
              </div>
            </div>
          ))}
      </div>

      {/* 🟨 Survival Cards Display in Bottom Right */}
      {player && player.survival.length > 0 && (
        <div className="fixed bottom-3 right-3 flex gap-2 bg-black bg-opacity-60 p-2 rounded-lg shadow-lg">
          {player.survival.map((cardId, idx) => (
            <img
              key={idx}
              src={`/cards/survival_card_${cardId}.png`}
              alt={`Survival ${cardId}`}
              className="w-16 h-auto rounded"
            />
          ))}
        </div>
      )}
    </>
  );
}

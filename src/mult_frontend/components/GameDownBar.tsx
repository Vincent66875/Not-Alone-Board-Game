import type { Player } from '../../mult_backend/gameEngine';

interface GameDownBarProps {
  players: Player[];
}

export default function GameDownBar({ players }: GameDownBarProps) {
  return (
    <div className="w-full fixed bottom-0 left-0 text-white py-3 px-4 flex gap-6 overflow-x-auto ">
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
  );
}

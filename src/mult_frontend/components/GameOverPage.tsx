import type { Player } from '../../mult_backend/gameEngine';

interface GameOverPageProps {
  winner: 'alien' | 'human';
  players: Player[];
}

export default function GameOverPage({ winner, players }: GameOverPageProps) {
  const bgImage = winner === 'alien' ? '/images/alienWin.jpg' : '/images/humanWin.jpg';
  const victoryText = winner === 'alien' ? 'The Creature Prevails' : 'The Humans Survive!';

  return (
    <div
      className="w-screen h-screen bg-cover bg-center flex flex-col justify-center items-center text-white"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="bg-black bg-opacity-60 px-10 py-6 rounded-lg shadow-lg text-center">
        <h1 className="text-4xl font-bold mb-4">{victoryText}</h1>
        <p className="text-xl">Thanks for playing!</p>
        <div className="mt-6 text-sm opacity-80">
          {players.map((p) => (
            <div key={p.id || p.name}>{p.name} - {p.isCreature ? 'Creature' : 'Human'}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

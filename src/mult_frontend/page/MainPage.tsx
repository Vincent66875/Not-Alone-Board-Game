interface MainPageProps {
  roomId: string;
  playerName: string;
  players: string[];
  onStart: () => void;
}

export default function MainPage({ roomId, playerName, players, onStart }: MainPageProps) {
  const canStart = players.length >= 3;

  return (
    <div className="text-white p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">Room: {roomId}</h1>
      <p className="mb-2">You are: {playerName}</p>

      <h2 className="text-xl mt-4">Players in Room:</h2>
      <ul className="mt-2 mb-6">
        {players.map((name, idx) => (
          <li key={idx} className="text-lg">• {name}</li>
        ))}
      </ul>

      {canStart ? (
        <button
          onClick={onStart}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold"
        >
          Start Game
        </button>
      ) : (
        <p className="text-gray-400">Waiting for at least 3 players to join...</p>
      )}
    </div>
  );
}

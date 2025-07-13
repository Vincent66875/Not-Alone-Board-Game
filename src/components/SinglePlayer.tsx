import { useState } from "react";
import GameBoard from './GameBoard';

type Difficulty = 'Easy' | 'Normal' | 'Hard';

export default function SinglePlayerGame() {
  const [playerName, setPlayerName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Normal');
  const [gameStarted, setGameStarted] = useState(false);

  const startGame = () => {
    if (playerName.trim()) {
      setGameStarted(true);
    } else {
      alert('Please enter your name');
    }
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-semibold mb-4">Single Player Mode</h2>

        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="border border-gray-400 rounded px-3 py-2 mb-4 w-60 text-black"
        />

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="border border-gray-400 rounded px-3 py-2 mb-4 w-60 text-black"
        >
          <option value="Easy">Easy</option>
          <option value="Normal">Normal</option>
          <option value="Hard">Hard</option>
        </select>

        <button
          onClick={startGame}
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
        >
          Start Game
        </button>
      </div>
    );
  }

  return <GameBoard playerName={playerName} difficulty={difficulty} />;
}

import type { GameState, Player } from '../../mult_backend/gameEngine';

interface EndingPageProps {
  gameState: GameState;
  player: Player;
  onEndTurn: () => void;
}

export default function EndingPage({ gameState, player, onEndTurn }: EndingPageProps) {
  const { board, turn } = gameState;

  return (
    <div className="flex flex-col items-center mt-10 text-white">
      <h2 className="text-3xl font-bold mb-4">End of Turn {turn}</h2>
      <div className="text-lg mb-6">Review the current state before proceeding.</div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg px-6 py-4">
          <h3 className="text-xl font-semibold mb-2">Progress</h3>
          <p><strong>Rescue:</strong> {board.rescue}</p>
          <p><strong>Assimilation:</strong> {board.assimilation}</p>
        </div>

        <div className="bg-gray-800 rounded-lg px-6 py-4">
          <h3 className="text-xl font-semibold mb-2">Tokens</h3>
          <p><strong>Remaining Tokens:</strong> {gameState.remainingTokens}</p>
          <p><strong>Beach Marker:</strong> {board.beachMarker ? 'Active' : 'Inactive'}</p>
        </div>
      </div>

      <button
        onClick={onEndTurn}
        className="px-8 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Start Next Turn
      </button>
    </div>
  );
}

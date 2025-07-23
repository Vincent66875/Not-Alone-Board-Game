import { useState } from 'react';

interface JoinRoomProps {
  connection: boolean;
  onJoin?: (roomId: string, playerName: string) => void;
  sendMessage: (msg: any) => void; 
}

export default function JoinRoom({ connection, onJoin, sendMessage }: JoinRoomProps) {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if(roomId.trim() && playerName.trim()) {
        sendMessage({type: 'joinRoom', roomId: roomId.trim(), playerName: playerName.trim()})
        onJoin?.(roomId.trim(), playerName.trim());
    } else {
        alert('Please enter both room id and player name');
    }
  }

  function handleCreate() {
    if(playerName.trim()) {
        const newRoomId = crypto.randomUUID().slice(0, 6);
        const name = playerName.trim();
        sendMessage({type: 'joinRoom', roomId: newRoomId, playerName: name});
        onJoin?.(newRoomId, name);
    } else {
        alert('Please enter a player name before creating a room');
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
      <h1 className="text-3xl font-bold text-blue-950 mb-6">Join a Room</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="text"
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="px-4 py-2 rounded bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />

        <input
          type="text"
          placeholder="Player Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="px-4 py-2 rounded bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />

        <button
          type="submit"
          disabled={!connection}
          className={`rounded py-2 font-semibold transition ${
            connection
            ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
            : 'bg-indigo-600 cursor-not-allowed filter grayscale'
          }`}
        >
          Join Room
        </button>

        <button
          type="button"
          disabled={!connection}
          onClick={handleCreate}
          className={`rounded py-2 font-semibold transition ${
            connection
            ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
            : 'bg-green-600 cursor-not-allowed filter grayscale'
          }`}
        >
            Create Room
        </button>
      </form>
    </div>
  );
}

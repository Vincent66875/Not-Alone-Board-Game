import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6 w-full max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold mb-4">Not Alone</h1>
      <button
        onClick={() => navigate('/single')}
        className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Single Player
      </button>
      <button
        onClick={() => navigate('/multi')}
        className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 transition"
      >
        Multiple Player
      </button>
    </div>
  );
}

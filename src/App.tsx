import { useState } from 'react';
import LandingPage from './components/LandingPage';
import SinglePlayerGame from './components/SinglePlayer';
import './index.css';
import './App.css';
import MultiplayerGame from './mult_frontend/page/MultiplayerGame';

export default function App() {
  const [mode, setMode] = useState<'landing' | 'single' | 'multi'>('landing');

  return (
    <>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed top-0 left-0 w-full h-full object-cover -z-10"
        src="/background/galaxy.mp4"
      />

      <div className="relative z-10 min-h-screen w-full flex flex-col items-center justify-center bg-transparent">
x
        {mode === 'landing' && <LandingPage onSelectMode={setMode} />}
        {mode === 'single' && <SinglePlayerGame />}
        {mode === 'multi' && <MultiplayerGame />}
      </div>
    </>
  );
}

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import './App.css';
import MultiplayerGame from './mult_frontend/page/MultiplayerGame';
import LandingPage from './components/LandingPage';
import SinglePlayerGame from './components/SinglePlayer';

export default function App() {
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

      <Router>
        <div className="relative z-10 min-h-screen w-full flex flex-col items-center justify-center bg-transparent">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/single" element={<SinglePlayerGame />} />
            <Route path="/multi" element={<MultiplayerGame />} />
          </Routes>
        </div>
      </Router>
    </>
  );
}

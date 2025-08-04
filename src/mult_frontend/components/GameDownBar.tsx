import { useState } from 'react';
import type { Player } from '../../mult_backend/gameEngine';

interface GameDownBarProps {
  players: Player[];
  player: Player;
}

export default function GameDownBar({ players, player }: GameDownBarProps) {
  const [showHand, setShowHand] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [showSurvival, setShowSurvival] = useState(false);

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

      <div className="fixed bottom-3 left-3 flex gap-3">
      {/* Hand */}
        <img
          src="/icons/hand_icon.png"
          onClick={() => setShowHand(prev => !prev)}
          className={`w-12 h-auto cursor-pointer transition-all hover:scale-105 
            ${player.hand.length === 0 ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}
          title="Hand"
        />
        {/* Discard */}
        <img
          src="/icons/discard_icon.png"
          onClick={() => player.discard.length > 0 && setShowDiscard(prev => !prev)}
          className={`w-12 h-auto cursor-pointer transition-all hover:scale-105 
            ${player.discard.length === 0 ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}
          title="Discard"
        />
        {/* Survival */}
        <img
          src="/icons/survival_icon.png"
          onClick={() => player.survival.length > 0 && setShowSurvival(prev => !prev)}
          className={`w-12 h-auto cursor-pointer transition-all hover:scale-105 
            ${player.survival.length === 0 ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}
          title="Survival Cards"
        />
      </div>
      {/* Sliding Panel: Hand */}
        {showHand && (
          <div className="fixed bottom-20 left-3 bg-black bg-opacity-70 p-3 rounded-lg flex gap-2 shadow-xl">
            {player.hand.map((cardId, idx) => (
              <img key={idx} src={`/cards/location_card_${cardId}.png`} className="w-20 h-auto rounded" />
            ))}
          </div>
        )}

        {/* Sliding Panel: Discard */}
        {showDiscard && (
          <div className="fixed bottom-20 left-3 bg-black bg-opacity-70 p-3 rounded-lg flex gap-2 shadow-xl">
            {player.discard.map((cardId, idx) => (
              <img key={idx} src={`/cards/location_card_${cardId}.png`} className="w-20 h-auto rounded opacity-70" />
            ))}
          </div>
        )}

        {/* Survival already handled in your code, can re-use toggle: */}
        {showSurvival && (
          <div className="fixed bottom-20 right-3 flex gap-2 bg-black bg-opacity-70 p-2 rounded-lg shadow-lg">
            {player.survival.map((cardId, idx) => (
              <img key={idx} src={`/cards/survival_card_${cardId}.png`} className="w-16 h-auto rounded" />
            ))}
          </div>
        )}
    </>
  );
}

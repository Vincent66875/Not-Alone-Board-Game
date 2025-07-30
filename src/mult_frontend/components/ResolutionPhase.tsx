import { useEffect, useState } from 'react';
import type { Player, GameState } from '../../mult_backend/gameEngine';
import { allLocations } from '../../mult_backend/gameEngine';

type ResolutionPageProps = {
  player: Player;
  players: Player[];
  gameState: GameState;
  onContinue: () => void;
  onActivateCard: (
    cardId: number,
    options?: {
      selectedCardIds?: number[];
      selectedSurvivalCard?: string;
      targetPlayerId?: string;
      effectChoice?: 'heal' | 'survival';
    }
  ) => void;
};

export default function ResolutionPage({
  player,
  players,
  gameState,
  onContinue,
  onActivateCard,
}: ResolutionPageProps) {
  const huntedMap = new Map<number, 'c' | 'a' | 't'>(
    gameState.huntedLocations?.map(h => [h.cardId, h.type]) || []
  );
  const creatureCardId = gameState.huntedLocations?.find(h => h.type === 'c')?.cardId ?? 1;

  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null);
  const [effectChoice, setEffectChoice] = useState<'heal' | 'survival' | null>(null);
  const [survivalOptions, setSurvivalOptions] = useState<number[]>([]);
  const [lairChoice, setLairChoice] = useState<'creature' | 'lair' | null>(null);

  const playedCardId = player.playedCard;
  const altCardId = player.playedCardAlt;

  const isCardActivatable = (cardId: number) =>
    cardId !== undefined &&
    !huntedMap.has(cardId) &&
    (playedCardId === cardId || altCardId === cardId);

  function handleCardClick(cardId: number) {
    if (isCardActivatable(cardId)) {
      setSelectedCard(cardId);
      setSelectedCardIds([]);
      setTargetPlayerId(null);
      setEffectChoice(null);
    }
  }

  function toggleSelectCard(id: number) {
    setSelectedCardIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  function confirmActivation() {
    if (selectedCard === null) return;

    const options: any = {};
    if ([2, 5, 6].includes(selectedCard)) options.selectedCardIds = selectedCardIds;
    if (selectedCard === 7 && selectedCardIds.length === 1) {
      options.selectedSurvivalCard = `survival_card_${selectedCardIds[0]}`;
    }
    if (selectedCard === 9) {
      options.effectChoice = effectChoice;
      if (effectChoice === 'heal' && selectedCardIds.length === 1) {
        options.targetPlayerId = selectedCardIds[0];
      }
    }
    onActivateCard(selectedCard, options);
    setSelectedCard(null);
    setSelectedCardIds([]);
    setTargetPlayerId(null);
    setEffectChoice(null);
  }

  function cancelActivation() {
    setSelectedCard(null);
    setSelectedCardIds([]);
    setTargetPlayerId(null);
    setEffectChoice(null);
  }

  const discardOptions = player.discard.filter(c => c !== selectedCard);

  useEffect(()=> {
    if(selectedCard === 7){
      const shuffled = [1, 2, 3].sort(() => 0.5 - Math.random());
      setSurvivalOptions(shuffled.slice(0, 2));
      setSelectedCardIds([]);
    }
  }, [selectedCard]);

  return (
    <div className="flex flex-col items-center mt-4 text-white">
      <h2 className="text-2xl font-semibold mb-6">Resolution Phase</h2>
      <p className="mb-4">Tokens have been revealed. Review the results below:</p>

      <div className="grid grid-cols-5 gap-6">
        {Array.from({ length: 10 }, (_, i) => {
          const cardId = i + 1;
          const isHunted = huntedMap.has(cardId);
          const tokenType = huntedMap.get(cardId);
          const isPlayed = playedCardId === cardId || altCardId === cardId;
          const isSafe = isPlayed && !isHunted;

          return (
            <div
              key={cardId}
              className={`relative flex flex-col items-center p-2 rounded-xl shadow-lg transition-transform duration-150 ${
                isPlayed
                  ? isSafe
                    ? 'border-4 border-green-400 cursor-pointer animate-pulse'
                    : 'border-4 border-red-500'
                  : ''
              } ${isHunted ? 'grayscale' : ''}`}
              onClick={() => handleCardClick(cardId)}
            >
              <div className="text-sm mb-2">Location {cardId}</div>
              <img
                src={`/cards/${allLocations[i]}.png`}
                alt={`Card ${cardId}`}
                className="w-24 h-auto rounded"
              />
              {tokenType && (
                <img
                  src={`/tokens/${tokenType}.png`}
                  alt={`Token ${tokenType}`}
                  className="absolute top-0 right-0 w-8 h-8"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Activation Modal */}
      {selectedCard !== null && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex flex-col items-center justify-center">
          <h3 className="text-xl font-bold mb-4">Activate Card {selectedCard}</h3>
          {selectedCard === 1 && (
            <div className="flex flex-col items-center gap-4 mb-4">
              <p className="mb-2">Activate card 1 ability or the card with Creature token?</p>
              <div className="flex gap-4">
                <button
                  className={`px-6 py-2 rounded ${
                    lairChoice === 'lair' ? 'bg-yellow-600' : 'bg-gray-700'
                  }`}
                  onClick={() => setLairChoice('lair')}
                >
                  Card 1 Ability (Lair)
                </button>
                <button
                  className={`px-6 py-2 rounded ${
                    lairChoice === 'creature' ? 'bg-yellow-600' : 'bg-gray-700'
                  }`}
                  onClick={() => setLairChoice('creature')}
                >
                  Card with Creature Token
                </button>
              </div>

              {lairChoice === 'creature' && (
                <div className="mt-4">
                  <p>
                    Creature token is on card {creatureCardId}.
                  </p>
                  <img
                    src={`/cards/${allLocations[creatureCardId - 1]}.png`}
                    alt={`Creature card ${creatureCardId}`}
                    className="w-36 h-auto rounded shadow-md mt-2"
                  />
                </div>
              )}
            </div>
          )}

          {/* Jungle (2) or Swamp (6) */}
          {[2, 6].includes(selectedCard) && (
            <div className="flex flex-wrap gap-3 mb-4">
              {discardOptions.map(c => (
                <img
                  key={c}
                  src={`/cards/${allLocations[c - 1]}.png`}
                  alt={`Option ${c}`}
                  className={`w-20 h-auto rounded cursor-pointer ${
                    selectedCardIds.includes(c) ? 'border-4 border-yellow-400' : ''
                  }`}
                  onClick={() => toggleSelectCard(c)}
                />
              ))}
            </div>
          )}

          {/* Rover (5) — pick one from reserve (here assume discarded) */}
          {selectedCard === 5 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {[6, 7, 8, 9, 10]
                .filter(c => !player.hand.includes(c) && !player.discard.includes(c))
                .map(c => (
                  <img
                    key={c}
                    src={`/cards/${allLocations[c - 1]}.png`}
                    alt={`Option ${c}`}
                    className={`w-20 h-auto rounded cursor-pointer ${
                      selectedCardIds.includes(c) ? 'border-4 border-yellow-400' : ''
                    }`}
                    onClick={() => setSelectedCardIds([c])} // Allow only one selection
                  />
                ))}
            </div>
          )}


          {/* Shelter (7): survival cards (dummy options) */}
          {selectedCard === 7 && (
            <div className="flex flex-col items-center gap-4 mb-4">
              <div className="flex gap-4 mb-4">
                {survivalOptions.map((cardNum) => (
                  <img
                    key={cardNum}
                    src={`/cards/survival_card_${cardNum}.png`}
                    alt={`Survival ${cardNum}`}
                    className={`w-24 h-auto rounded cursor-pointer ${
                      selectedCardIds[0] === cardNum ? 'border-4 border-yellow-400' : ''
                    }`}
                    onClick={() => setSelectedCardIds([cardNum])}
                  />))}
              </div>
              <p className="text-sm text-gray-300">Choose 1 Survival card</p>
            </div>
          )}

          {/* Source (9) */}
          {selectedCard === 9 && (
            <>
              <div className="flex gap-4 mb-2">
                <button
                  className={`px-4 py-2 rounded ${
                    effectChoice === 'heal' ? 'bg-yellow-600' : 'bg-gray-700'
                  }`}
                  onClick={() => setEffectChoice('heal')}
                >
                  Heal
                </button>
                <button
                  className={`px-4 py-2 rounded ${
                    effectChoice === 'survival' ? 'bg-yellow-600' : 'bg-gray-700'
                  }`}
                  onClick={() => {
                    setEffectChoice('survival');
                    setSelectedCardIds([]);
                  }}
                >
                  Draw Survival
                </button>
              </div>
              {effectChoice === 'heal' && (
                <div className="flex gap-3 mb-3">
                  {players.map(p => (
                    <button
                      key={p.id}
                      className={`px-3 py-1 rounded ${
                        targetPlayerId === p.id ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                      onClick={() => setTargetPlayerId(p.id)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              {effectChoice === 'heal' && selectedCardIds.length === 0 && (
                <p className="text-sm text-red-400">Select a player to heal</p>
              )}
            </>
          )}

          {[3, 4, 8, 10].includes(selectedCard) && (
            <div className="bg-gray-800 rounded p-4 max-w-md text-center">
            {selectedCard === 3 && (
              <p>
                Card 3 (River): Activate to play 2 place cards next turn, then
                reveal one and return the other.
              </p>
            )}
            {selectedCard === 4 && (
              <p>
                Card 4 (Beach):{' '}
                {gameState.board.beachMarker
                  ? 'Removing the marker will advance the Rescue token.'
                  : 'Placing a marker to block progress.'}
              </p>
            )}
            {selectedCard === 8 && (
              <p>
                Card 8 (Wreck): Move Rescue token forward by 1 space.
              </p>
            )}
            {selectedCard === 10 && (
              <p>
                Card 10 (Artefact): Activate artefact ability next turn.
              </p>
            )}
          </div>
          )}

          <div className="flex gap-6">
            <button
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={confirmActivation}
              disabled={
                (selectedCard === 2 && selectedCardIds.length !== 1) ||
                (selectedCard === 6 && selectedCardIds.length !== 2) ||
                (selectedCard === 5 && selectedCardIds.length !== 1) ||
                (selectedCard === 7 && selectedCardIds.length !== 1) ||
                (selectedCard === 9 &&
                  (!effectChoice || (effectChoice === 'heal' && !targetPlayerId)))
              }
            >
              Confirm
            </button>
            <button
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={cancelActivation}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!playedCardId && (
        <p className="text-yellow-300 mt-6">You didn’t play a card this turn.</p>
      )}

      {playedCardId && huntedMap.has(playedCardId) && (
        <button
          className="mt-6 px-6 py-2 bg-blue-600 rounded hover:bg-blue-700"
          onClick={onContinue}
        >
          Continue
        </button>
      )}
    </div>
  );
}

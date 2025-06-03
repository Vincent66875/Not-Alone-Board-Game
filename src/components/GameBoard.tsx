import { useState } from 'react';
import type { LocationCard, GameState } from '../game/gameLogic';
import { createInitialGameState, resolveTurn } from '../game/gameLogic';
import { getAIBasedHunterLocation } from '../game/ai';
import type { AbilityType } from '../game/gameLogic';
import { abilityFromLocation } from '../game/gameLogic';

interface GameBoardProps {
  playerName: string;
  difficulty: 'Easy'|'Normal'|'Hard';
};


const getInitialWill = (difficulty: GameBoardProps['difficulty']) => {
  switch (difficulty) {
    case 'Easy':
      return 11;
    case 'Hard':
      return 5;
    default:
      return 8;
  }
};

export default function GameBoard({ playerName, difficulty }: GameBoardProps) {
  const [state, setState] = useState<GameState & {
    gameOver: boolean;
    result: 'win' | 'lose' | null;
    }>(() => ({
    ...createInitialGameState(),
    will: getInitialWill(difficulty),
    gameOver: false,
    result: null,
  }));
  const [willSpent, setWillSpent] = useState(0);
  const [selectedRecovery, setSelectedRecovery] = useState<LocationCard[]>([]);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [abilityType, setAbilityType] = useState<AbilityType | null>(null);
  const [lairRecoveryChoice, setLairRecoveryChoice] = useState(false);
  const [riverActive, setRiverActive] = useState<{
    stage: 'selectTwo' | 'confirmOne' | 'done' | null;
    selectedCards: LocationCard[];
    confirmedCard: LocationCard;
  } | null>(null);
  const [roverAcquire, setRoverAcquire] = useState<{
    active: boolean;
    selectedCard: LocationCard | null;
  } | null>(null);


  const handlePlayerChoice = (location: LocationCard, source: 'river' | 'normal' = 'normal') => {
    if (state.gameOver) return;

    let aiChoice: LocationCard;
    let hand = state.hand;
    if (source === 'river') {
      aiChoice = state.hunterLoc!;
      if (riverActive) {
        const otherCard = riverActive.selectedCards.find(card => card !== location)!;
        hand = [...state.hand, otherCard];
        EndRiverAbility();
      }
    } else {
      aiChoice = getAIBasedHunterLocation(state.hand);
    }
    const update = resolveTurn({
      ...state,
      hand: hand,
      playerLoc: location,
      hunterLoc: aiChoice,
    });
    const gameOver = update.will <= 0 || update.progress >= 7;
    //if progress > 7 wins, else if no more will loses, else null
    const result = update.progress >= 7 ? 'win' : update.will <= 0 ? 'lose' : null;

    setState({
      ...update,
      gameOver,
      result,
    });
    setRiverActive({
      stage: null,
      selectedCards: [],
      confirmedCard: null as any,
    })
    if (gameOver) return;
    switch(update.abilityType){
      case 'LairRecovery':
        setAbilityType('JungleRecovery');
        startLairRecovery();
        break;
      case 'JungleRecovery':
        startJungleRecovery(update.discardPile);
        break;
      case 'RiverSecond':
        startRiverAbility();
        console.log("hand " + state.hand);
        break;
      case 'BeachMark':
        startBeachAbility();
        break;
      case 'RoverAcquire':
        startRoverAbility();
        break;
      case 'SwampRecovery':
        startSwampRecovery();
        break;
      case 'WreckAdvance':
        startWreckAbility();
        break;
      case 'SourceHeal':
        startSourceAbility();
        break;
      default:
        break;
    }
    return;
  };

  const resetGame = () => {
    setState({
      ...createInitialGameState(),
      will: getInitialWill(difficulty),
      gameOver: false,
      result: null,
    });
  };

  //Recovery
  const startRecovery = (will:number) => {
    if(state.will< will) return;
    setWillSpent(will);
    setSelectedRecovery([]);
    setRecoveryMode(true);
    setAbilityType('WillRecovery');
  }
  const EndRecovery = () => {
    if (abilityType === 'WillRecovery') {
      setState((prev) => ({
        ...prev,
        will: prev.will - willSpent,
        hand: [...prev.hand, ...selectedRecovery],
        discardPile: prev.discardPile.filter((c) => !selectedRecovery.includes(c)),
      }));
    } else {
      setState((prev) => ({
        ...prev,
        hand: [...prev.hand, ...selectedRecovery],
        discardPile: prev.discardPile.filter((c) => !selectedRecovery.includes(c)),
      }));
    }

    setRecoveryMode(false);
    setSelectedRecovery([]);
    setWillSpent(0);
    setAbilityType(null);
  };

  //Lair
  const startLairRecovery = () => {
    setLairRecoveryChoice(true);  // Show the choice window
  };
  const startLairActivate = (ability: AbilityType) => {
    switch(ability){
      case 'LairRecovery':
        setAbilityType('JungleRecovery');
        startLairRecovery();
        break;
      case 'JungleRecovery':
        startJungleRecovery(state.discardPile);
        break;
      case 'RiverSecond':
        startRiverAbility();
        console.log("hand " + state.hand);
        break;
      case 'BeachMark':
        startBeachAbility();
        break;
      case 'RoverAcquire':
        startRoverAbility();
        break;
      case 'SwampRecovery':
        startSwampRecovery();
        break;
      case 'WreckAdvance':
        startWreckAbility();
        break;
      case 'SourceHeal':
        startSourceAbility();
        break;
      default:
        break;
    }
  }
  //Jungle
  const startJungleRecovery = (discards: LocationCard[]) => {
    const remainingDiscards = discards.filter((c) => c !== 'Jungle');

    // Always add Jungle back to hand
    setState(prev => ({
      ...prev,
      hand: [...prev.hand, 'Jungle'],
      discardPile: remainingDiscards,
    }));

    // Start recovery
    if (remainingDiscards.length > 0) {
      setSelectedRecovery([]);
      setRecoveryMode(true);
      setAbilityType('JungleRecovery');
    }
  };
  //River
  const startRiverAbility = () => {
    if (state.hand.length < 2) {
      setRiverActive({
        stage: 'done',  // Skip ability
        selectedCards: [],
        confirmedCard: null as any,
      });
      return;
    }
    // Enough cards to activate River's effect
    setRiverActive({
      stage: 'selectTwo',
      selectedCards: [],
      confirmedCard: null as any,
    });
  };
  const handleRiverChoice = (selected: LocationCard[]) => {
    if (selected.length !== 2) return;
    setState(prev => {
      // lock-in AI’s hunted location before the player chooses which card to reveal
      const aiChoice = getAIBasedHunterLocation(prev.hand);
      const newHand = prev.hand.filter(card => !selected.includes(card));

      return {
        ...prev,
        hand: newHand,
        hunterLoc: aiChoice,
      };
    });
    setRiverActive({
      stage: 'confirmOne',
      selectedCards: selected,
      confirmedCard: null as any,
    });
  }
  const EndRiverAbility = () => {
    setRiverActive({
      stage: null,
      selectedCards: [],
      confirmedCard: null as any,
    });
  }
  //Beach
  const startBeachAbility = () => {
    setState((prev) => {
      if (!prev.beachMarker) {
        return {
          ...prev,
          beachMarker: true,
        };
      } else {
        return {
          ...prev,
          beachMarker: false,
          progress: prev.progress + 1,
        };
      }
    });
  };
  //Rover
  const startRoverAbility = () => {
    if (state.reserveCards.length === 0) {
      return;
    }

    setRoverAcquire({
      active: true,
      selectedCard: null,
    });
  };
  const handleRoverConfirm = () => {
    if (!roverAcquire?.selectedCard) return;

    const card = roverAcquire.selectedCard;

    setState(prev => ({
      ...prev,
      hand: [...prev.hand, card],
      reserveCards: prev.reserveCards.filter(c => c !== card),
      abilityType: null,
    }));

    setRoverAcquire(null);
  };
  //Swamp
  const startSwampRecovery = () => {
    const remainingDiscards = state.discardPile.filter((c) => c !== 'Swamp');

    // Add Swamp back to hand
    setState(prev => ({
      ...prev,
      hand: [...prev.hand, 'Swamp'],
      discardPile: remainingDiscards,
    }));

    // Start recovery only if other cards remain
    if (remainingDiscards.length > 0) {
      setSelectedRecovery([]);
      setRecoveryMode(true);
      setAbilityType('SwampRecovery');
    }
  };
  const startWreckAbility = () => {
    setState((prev) => {
      const newProgress = prev.progress + 1;
      return {
        ...prev,
        progress: newProgress,
      };
    });
  };
  const startSourceAbility = () => {
    setState((prev) => ({
      ...prev,
      playerWill: prev.will + 1,
    }));
  };



  const toggleSelected = (card: LocationCard) => {
    setSelectedRecovery((prev) => {
      const isSelected = prev.includes(card);

      // Jungle: exactly 1 card
      if (abilityType === 'JungleRecovery') {
        return isSelected ? [] : [card];
      }

      // Swamp: up to 2 cards
      if (abilityType === 'SwampRecovery') {
        if (isSelected) {
          return prev.filter((c) => c !== card);
        } else if (prev.length < 2) {
          return [...prev, card];
        }
        return prev;
      }

      // Fallback (e.g., WillRecovery): use willSpent * 2
      if (isSelected) {
        return prev.filter((c) => c !== card);
      } else if (prev.length < willSpent * 2) {
        return [...prev, card];
      }

      return prev;
    });
  };


  return (
    <div className="min-h-screen p-4 flex flex-col items-center gap-6">
      {/* Top Game Info Bar */}
      <h1 className="text-4xl font-extrabold text-white drop-shadow-sm tracking-wide">
        Not Alone - Single Player
      </h1>
      <div className="w-full max-w-4xl bg-white/30 backdrop-blur-sm p-4 rounded-xl shadow-lg flex justify-around items-center text-sm sm:text-base font-medium text-white">
        <div className="flex flex-col items-center">
          <span className="text-gray-200">Player</span>
          <span className="text-lg font-semibold">{playerName}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-200">Round</span>
          <span className="text-lg font-semibold">{state.round}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-200">Will</span>
          <span className="text-lg font-semibold">{state.will}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-200">Progress</span>
          <span className="text-lg font-semibold">{state.progress}</span>
        </div>
      </div>

      {/* Action Results */}
      {state.playerLoc && riverActive?.stage !== 'confirmOne' && (
        <div className="text-white text-center">
          <div className="flex flex-row justify-center items-center gap-8">
            <div className="text-center">
              <p className="mb-2">Normal ver. You played:</p>
              <img
                src={`/cards/${state.playerLoc}.png`}
                alt={state.playerLoc}
                className="w-40 rounded shadow border"
              />
            </div>
            <div className="text-center">
              <p className="mb-2">AI hunted:</p>
              <img
                src={`/cards/${state.hunterLoc}.png`}
                alt={state.hunterLoc ?? ''}
                className="w-40 rounded shadow border"
              />
            </div>
          </div>
        </div>
      )}
      {riverActive?.stage === 'confirmOne' && (
        <div className="text-white text-center">
          <div className="flex flex-row justify-center items-center gap-8">
            <div className="text-center">
              <p className="mb-2">Choose 1 card to play. The other returns to your hand.</p>
              {riverActive.selectedCards.map((card) => (
                <button
                  key={card}
                  onClick={() => handlePlayerChoice(card, 'river')}
                  className={`hover:scale-105 transition-transform ${
                    riverActive.confirmedCard === card ? 'ring-4 ring-green-500' : ''
                  }`}
                >
                  <img
                    src={`/cards/${card}.png`}
                    alt={card}
                    className="w-40 rounded shadow"
                  />
                </button>
              ))}
            </div>

            <div className="text-center">
              <p className="mb-2">AI hunted:</p>
              <img
                src={`/cards/${state.hunterLoc}.png`}
                alt={state.hunterLoc ?? ''}
                className="w-40 rounded shadow"
              />
            </div>
          </div>
        </div>
      )}



      {/* Hand (Normal) */}
      {state.hand && riverActive?.stage !== 'selectTwo' &&(
        <div className="w-full max-w-4xl">
          <p className="text-lg font-medium mb-2">Normal ver. Your Hand:</p>
          <div className="grid grid-cols-5 gap-3">
            {state.hand.map((loc, index) => (
              <button
                key={`${loc}-${index}`}
                onClick={() => handlePlayerChoice(loc)}
                className="hover:scale-105 transition-transform"
              >
                <img
                  src={`/cards/${loc}.png`}
                  alt={loc}
                  className="w-full rounded shadow"
                />
              </button>
            ))}
          </div>
        </div>
      )}
      {riverActive?.stage === 'selectTwo' && (
        <div className="w-full max-w-4xl text-white text-center">
          <p className="text-lg font-medium mb-2">River activated: Select 2 Place cards</p>
          <div className="grid grid-cols-5 gap-3">
            {state.hand.map((loc, index) => {
              const selected = riverActive.selectedCards.includes(loc);
              return (
                <button
                  key={`${loc}-${index}`}
                  onClick={() => {
                    setRiverActive((prev) => {
                      if (!prev) return prev;
                      const already = prev.selectedCards.includes(loc);
                      const newSelection = already
                        ? prev.selectedCards.filter((l) => l !== loc)
                        : prev.selectedCards.length < 2
                          ? [...prev.selectedCards, loc]
                          : prev.selectedCards;
                      return {
                        ...prev,
                        selectedCards: newSelection,
                      };
                    });
                  }}
                  className={`hover:scale-105 transition-transform ${
                    selected ? 'ring-4 ring-green-500' : ''
                  }`}
                >
                  <img src={`/cards/${loc}.png`} alt={loc} className="w-full rounded shadow" />
                </button>
              );
            })}
          </div>
          <button
            disabled={riverActive.selectedCards.length !== 2}
            onClick={() => handleRiverChoice(riverActive.selectedCards)}
            className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      )}
      

      {!recoveryMode && (
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((w) => (
            <button
              key={w}
              onClick={() => startRecovery(w)}
              disabled={state.will < w}
              className="bg-blue-500 text-white px-3 py-1 rounded disabled:opacity-50"
            >
              Lose {w} Will
            </button>
          ))}
        </div>
      )}
      {lairRecoveryChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full text-center text-white">
            <p className="mb-4 text-lg font-semibold">Lair Recovery Activated</p>
            <p className="mb-6">Choose your action:</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setLairRecoveryChoice(false);
                  setState((prev) => ({
                    ...prev,
                    hand: [...prev.hand, ...prev.discardPile.filter(c => c !== 'Lair')],
                    discardPile: prev.discardPile.includes('Lair') ? ['Lair'] : [],
                  }));
                  setAbilityType('LairRecovery');
                }}
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              >
                Take back discard pile
              </button>
              <button
                onClick={() => {
                  setLairRecoveryChoice(false);
                  // Activate the hunted card action (example: set abilityType)
                  if (state.hunterLoc && state.hunterLoc != null) {
                    const newAbility = abilityFromLocation(state.hunterLoc);
                    setAbilityType(newAbility);
                    startLairActivate(newAbility); 
                  }
                }}
                className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
              >
                Activate the hunted card
              </button>
            </div>
          </div>
        </div>
      )}
      {recoveryMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full text-center">
            <p className="mb-4 text-white text-lg">
              {abilityType === 'JungleRecovery'
                ? 'Select 1 card from discard pile to recover with Jungle'
                : abilityType === 'SwampRecovery'
                ? 'Select 2 cards from discard pile to recover with Swamp!'
                : `Select cards to recover (${selectedRecovery.length} / ${willSpent * 2})`}
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-h-60 overflow-y-auto">
              {state.discardPile.map((card) => (
                <img
                  key={card}
                  src={`/cards/${card}.png`}
                  onClick={() => toggleSelected(card)}
                  className={`w-20 border-2 rounded cursor-pointer ${
                    selectedRecovery.includes(card)
                      ? 'border-green-400'
                      : 'border-transparent'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-5">
              <button
                onClick={EndRecovery}
                disabled={
                  abilityType === 'JungleRecovery'
                  ? selectedRecovery.length !== 1
                  : abilityType === 'SwampRecovery'
                  ? selectedRecovery.length !== 2
                  : selectedRecovery.length === 0
                }
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setRecoveryMode(false);
                  setSelectedRecovery([]);
                  setWillSpent(0);
                  setAbilityType(null);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {roverAcquire?.active && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-white p-4">
          <p className="mb-4 text-lg font-semibold">Rover activated: Choose 1 reserve card to add to your hand</p>
          <div className="flex gap-6">
            {state.reserveCards.map((card) => (
              <button
                key={card}
                onClick={() => setRoverAcquire((prev) => prev ? { ...prev, selectedCard: card } : null)}
                className={`hover:scale-105 transition-transform rounded shadow ${
                  roverAcquire.selectedCard === card ? 'ring-4 ring-green-400' : ''
                }`}
              >
                <img src={`/cards/${card}.png`} alt={card} className="w-40 rounded" />
              </button>
            ))}
          </div>
          <button
            disabled={!roverAcquire.selectedCard}
            onClick={handleRoverConfirm}
            className="mt-6 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      )}




      {/* Discard Pile */}
      <div className="w-full max-w-4xl">
        <p className="text-lg font-medium mt-4 mb-2">Discard Pile:</p>
        <div className="flex flex-wrap gap-3">
          {state.discardPile.map((loc, index) => (
            <img
              key={`discard-${index}`}
              src={`/cards/${loc}.png`}
              alt={loc}
              className="w-16 rounded border"
            />
          ))}
        </div>
      </div>

      {/* End Game */}
      {state.gameOver && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="p-6 bg-gray-200 border text-black rounded text-center max-w-md shadow-lg">
            <h2 className="text-2xl font-bold">
              {state.result === 'win' ? '🎉 You Escaped the Planet! 🎉' : '💀 You Were Hunted Down! 💀'}
            </h2>
            <p className="mt-2 mb-4">Game Over</p>
            <button
              onClick={resetGame}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

    </div>

  );
}

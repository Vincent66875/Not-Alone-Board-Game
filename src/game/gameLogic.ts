export type LocationCard = 
| 'Lair'
| 'Jungle'
| 'River'
| 'Beach'
| 'Rover'
| 'Swamp'
| 'Source'
| 'Wreck';

export type AbilityType = 'LairRecovery' | 'JungleRecovery' | 'BeachMark' | 'SourceHeal' | 'WillRecovery' | 'SwampRecovery' | 'RiverSecond' | 'RoverAcquire' | 'WreckAdvance';

export interface GameState {
  round: number;
  will: number;
  progress: number;
  playerLoc: LocationCard | null;
  hunterLoc: LocationCard | null;
  hand: LocationCard[]; // Cards in the player's hand
  discardPile: LocationCard[];  // Discard pile
  abilityType: AbilityType | null; //Ability that is active
  pendingAbility?: AbilityType;
  playedCards: LocationCard[];
  reserveCards: LocationCard[];
  beachMarker: boolean;
}

export function abilityFromLocation(loc: LocationCard): AbilityType {
  switch (loc) {
    case 'Lair':
      return 'LairRecovery';
    case 'Jungle':
      return 'JungleRecovery';
    case 'River':
      return 'RiverSecond';
    case 'Beach':
      return 'BeachMark';
    case 'Rover':
      return 'RoverAcquire';
    case 'Swamp':
      return 'SwampRecovery';
    case 'Source':
        return 'SourceHeal';
    case 'Wreck':
        return 'WreckAdvance';
    default:
      return 'LairRecovery';
  }
}

export function createInitialGameState(): GameState {
  return {
    round: 1,
    will: 5,
    progress: 0,
    beachMarker: false,
    playerLoc: null,
    playedCards: [],
    hunterLoc: null,
    hand: ['Lair', 'Jungle', 'River', 'Beach', 'Rover'],
    discardPile: [],
    abilityType: null,
    reserveCards: ['Swamp', 'Source', 'Wreck'],
  };
}

export function resolveTurn(state: GameState): GameState {
    if (!state.playerLoc){
        return state;
    }

    const caught = state.playerLoc === state.hunterLoc;
    const isLair = state.playerLoc === 'Lair';

    const playedCardIndex = state.hand.indexOf(state.playerLoc);
    const newHand = [...state.hand];
    if(playedCardIndex !== -1) newHand.splice(playedCardIndex, 1);
    const newDiscard = [...state.discardPile, state.playerLoc];
    //Get caught in Lair
    let willLoss = caught ? 1 : 0;
    if (caught && isLair) {
        willLoss += 1;
    }
    let newState: GameState = {
        ...state,
        round: state.round + 1,
        will: state.will - willLoss,
        progress: state.progress + (caught?0:1),
        hand: newHand,
        discardPile: newDiscard,
        abilityType: null,
    };

    if(!caught){
        newState.abilityType = abilityFromLocation(state.playerLoc);
    }else{
        console.log("caught!");
    }

    return newState;
}
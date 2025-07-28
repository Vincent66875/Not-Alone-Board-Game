export type GamePhase = 'lobby' | 'planning' | 'hunting' | 'resolution' | 'ended';

export function getPhaseNumber(phase: GamePhase): number | null {
  const map: Record<Exclude<GamePhase, 'lobby'>, number> = {
    planning: 1,
    hunting: 2,
    resolution: 3,
    ended: 4,
  };
  return phase === 'lobby' ? null : map[phase];
}

export type LocationCard = 
| 'Lair'
| 'Jungle'
| 'River'
| 'Beach'
| 'Rover'
| 'Swamp'
| 'Shelter'
| 'Wreck'
| 'Source'
| 'Artefact';

export const allLocations: LocationCard[] = [
    'Lair',
    'Jungle',
    'River',
    'Beach',
    'Rover',
    'Swamp',
    'Shelter',
    'Wreck',
    'Source',
    'Artefact'
];

export const tokenOrder: ('c'|'a'|'t')[] = ['c', 'a', 't'];

export interface HuntedLocation {
  cardId: number; // location card index or ID
  type: 'c' | 'a' | 't'; // action type: card, assimilation, token, etc.
}

export interface BoardState {
  player_num: number;
  rescue: number; 
  assimilation: number;
  beachMarker: boolean;
}

export interface GameState {
  phase: GamePhase;
  turn: number;
  board: BoardState;
  history: string[];
  effectsUsed?: {
    beachUsed?: boolean;
    wreckUsed?: boolean;
  };
  huntedLocations?: HuntedLocation[];
  remainingTokens: number;
}

export type Player = {
  id: string;
  name: string;
  connectionId: string; 
  hand: number[];
  discard: number[];
  playedCard?: number;
  isCreature: boolean;
  will: number;
  survival: string[];
  riverActive: boolean;
  playedCardAlt?: number;
};

export interface Game {
  roomId: string;
  players: Player[];
  state: GameState;
  host: string;
  createdAt: string;
}

export function initializeGame(roomId: string, players: Player[]): Game {
  const initialState: GameState = {
    phase: 'lobby',
    turn: 0,
    remainingTokens: 1,
    board: {
      player_num: players.length,
      rescue: 0,
      assimilation: 0,
      beachMarker: false,
    },
    history: [],
  };

  return {
    roomId,
    players,
    state: initialState,
    host: players[0]?.connectionId || '',
    createdAt: new Date().toISOString(),
  };
}

export function startGame(game: Game): Game {
  console.log("Starting the game");

  game.state.phase = 'planning';
  game.state.turn = 1;
  const creature = Math.floor(Math.random() * game.players.length);
  game.players = game.players.map((p, i) => {
    const updatedPlayer: Player = {
      ...p,
      will: 3,
      isCreature: i === creature,
      hand: [1, 2, 3, 4, 5],
      discard: [],
      riverActive: false,
    };

    if (p.playedCard !== undefined) {
      updatedPlayer.playedCard = p.playedCard;
    }

    return updatedPlayer;
  });
  game.state.history.push('Game started. Planning phase begins.');

  console.log("Game started! Player list:", game.players);
  return game;
}
//how the cards get activated
export function handleActivateCard(
  game: Game,
  pid: string,
  cardId: number
): Game {
  const updatedGame = { ...game };
  const playerIndex = updatedGame.players.findIndex(p => p.id === pid);

const player = { ...updatedGame.players[playerIndex] };

  if (!player) {
    console.warn(`Player ${pid} not found in game.`);
    return game;
  }
  if (!player.hand.includes(cardId)) {
    console.warn(`Player ${player.id} tried to play card ${cardId} not in hand.`);
    return game;
  }

  //hand -> discard
  player.hand = player.hand.filter((id) => id !== cardId);
  player.discard.push(cardId);
  player.playedCard = cardId;

  switch (cardId) {
    case 1:
      // Player chooses: either recover all place cards except Lair, or trigger location with Creature
      // For now: assume player chooses to recover
      player.hand.push(...player.discard.filter((c) => c !== 1));
      player.discard = [1];
      break;

    case 2:
      // Return Jungle and 1 other from discard
      {
        const others = player.discard.filter((c) => c !== 2);
        const oneOther = others.length > 0 ? [others[0]] : [];
        player.hand.push(...oneOther, 2);
        player.discard = player.discard.filter((c) => ![2, ...oneOther].includes(c));
      }
      break;

    case 3:
      //Mark it
      player.riverActive = true;
      break;

    case 4: // Beach
      if (!updatedGame.state.effectsUsed?.beachUsed) {
        if (!updatedGame.state.board.beachMarker) {
          updatedGame.state.board.beachMarker = true;
        } else {
          updatedGame.state.board.beachMarker = false;
          updatedGame.state.history.push(`${player.name} advanced the Rescue token via Beach.`);
        }
        updatedGame.state.effectsUsed = { ...updatedGame.state.effectsUsed, beachUsed: true };
      } else {
        updatedGame.state.history.push(`${player.name} used Beach, but its effect was already used this turn.`);
      }
      break;

    case 5: // Rover
      // Placeholder: add a new card to hand from reserve (handled by UI later)
      // For now, assume player gets card 6 if not owned
      const allCards = [...player.hand, ...player.discard];
      if (!allCards.includes(6)) {
        player.hand.push(6);
        updatedGame.state.history.push(`${player.name} gained a new location card (6).`);
      }
      break;

    case 6: // Swamp
      {
        const others = player.discard.filter((c) => c !== 6);
        const twoOthers = others.slice(0, 2);
        player.hand.push(...twoOthers, 6);
        player.discard = player.discard.filter((c) => ![6, ...twoOthers].includes(c));
      }
      break;

    case 7: // Shelter
      // Placeholder: draw 2 survival, keep 1 (requires UI)
      // For now, give 1 dummy survival card
      player.survival.push("RandomSurvivalCard");
      updatedGame.state.history.push(`${player.name} drew a Survival card.`);
      break;

    default:
      break;
  }

  updatedGame.players[playerIndex] = player;
  return updatedGame;
}
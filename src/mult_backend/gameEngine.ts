export type GamePhase = 'lobby' | 'planning' | 'hunting' | 'riverChoice' | 'resolution' | 'ended';

export function getPhaseNumber(phase: GamePhase): number | null {
  const map: Record<Exclude<GamePhase, 'lobby'>, number> = {
    planning: 1,
    hunting: 2,
    riverChoice: 3,
    resolution: 4,
    ended: 5,
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
  survival: number[];
  riverActive: boolean;
  artefactActive: boolean;
  playedCardAlt?: number;
  hasActivated?: boolean;
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
      hand: i === creature ? [] : [1, 2, 3, 4, 5],
      discard: [],
      riverActive: false,
      artefactActive: false
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

export function handleCatching(game: Game): Game {
  const updatedGame = { ...game };
  const hunted = updatedGame.state.huntedLocations ?? [];
  const players = updatedGame.players ?? [];

  let creatureTriggered = false;

  for (const { cardId, type } of hunted) {
    players.forEach(player => {
      const played = player.playedCard ?? null;

      if (played === cardId) {
        switch (type) {
          case 'c': // Creature
            player.will = Math.max(0, player.will - 1);
            creatureTriggered = true;
            updatedGame.state.history.push(`${player.name} was caught by the Creature and lost 1 Will.`);
            break;

          case 'a': // Assimilation
            if (player.hand.length > 0) {
              const removedCard = player.hand.pop(); // Remove last card (or use random if needed)
              updatedGame.state.history.push(
                `${player.name} was caught by Artemia and discarded Place card ${removedCard}.`
              );
            } else {
              updatedGame.state.history.push(`${player.name} was caught by Artemia but had no Place cards to discard.`);
            }
            break;

          case 't':
            // Nothing for Target token
            break;
        }
      }
    });
  }

  if (creatureTriggered) {
    updatedGame.state.board.assimilation += 1;
    updatedGame.state.history.push(`The Creature advanced the Assimilation token by 1.`);
    return handleWill(updatedGame);
  }
  // Otherwise, just return the updatedGame without calling handleWill
  return updatedGame;
}
export function handleWill(game: Game): Game {
  const updatedGame = { ...game };
  let numRestored = 0;
  updatedGame.players = updatedGame.players.map(player => {
    if (!player.isCreature && player.will <= 0) {
      numRestored += 1;
      return {
        ...player,
        will: 3,
        discard: [],
        hand: [...player.hand, ...player.discard],
      };
    }
    return player;
  });

  if (numRestored > 0) {
    updatedGame.state.board.assimilation += numRestored;
    updatedGame.state.history.push(`${numRestored} player(s) exhausted and restored. Assimilation +${numRestored}.`);
  }

  return updatedGame;
}
//how the cards get activated
export function handleActivateCard(
  game: Game,
  pid: string,
  cardId: number,
  options?: {
    selectedCardIds?: number[];     // For Jungle, Swamp
    selectedSurvivalCard?: number;  // For Shelter
    targetPlayerId?: string;        // For Source
    effectChoice: 'heal'|'survival' // For Source
  }
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
      // Lair recover all place cards except Lair
      {
        player.hand.push(...player.discard.filter((c) => c !== 1));
        player.discard = [1];
        updatedGame.state.history.push(`${player.name} take back all cards except 1`);
      }
      break;

    case 2:
      // Return Jungle and 1 other from discards
      {  
        const selected = options?.selectedCardIds ?? [];
        const valid = selected.length === 1 && player.discard.includes(selected[0]);
        if (valid) {
          player.hand.push(2, selected[0]);
          player.discard = player.discard.filter(c => ![2, selected[0]].includes(c));
          updatedGame.state.history.push(`${player.name} used Jungle to recover ${selected[0]}`);
        }
      }
      break;

    case 3: // Mark River
      {
        player.riverActive = true;
        updatedGame.state.history.push(`${player.name} activate river ability`);
      }
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
      {
        const selected = options?.selectedCardIds ?? [];
        const valid = selected.length === 1;
        console.log("Rover ability: adding", selected);
        if (valid) {
          const selectedCard = selected[0];
          const allCards = [...player.hand, ...player.discard];

          if (!allCards.includes(selectedCard)) {
            player.hand.push(selectedCard);
            updatedGame.state.history.push(`${player.name} used Rover to gain card ${selectedCard}.`);
          } else {
            updatedGame.state.history.push(`${player.name} already owns card ${selectedCard}, Rover effect skipped.`);
          }
        } else {
          updatedGame.state.history.push(`${player.name} played Rover but did not select a valid card.`);
        }
      }
      break;

    case 6: // Return Swamp and 2 other from discard
      {
        const selected = options?.selectedCardIds ?? [];
        const valid = selected.length === 2 && selected.every(c => player.discard.includes(c));
        if (valid) {
          player.hand.push(6, ...selected);
          player.discard = player.discard.filter(c => ![6, ...selected].includes(c));
          updatedGame.state.history.push(`${player.name} used Swamp to recover ${selected.join(', ')}`);
        }
      }
      break;

    case 7: // Shelter: draw 2 survival, keep 1 (requires UI)
      {
        const card = options?.selectedSurvivalCard;
        if (card) {
          player.survival.push(card);
          updatedGame.state.history.push(`${player.name} chose a Survival card.`);
        }
      }
      break;
    
    case 8: //Wreck
      {
        updatedGame.state.board.rescue += 1;
        updatedGame.state.history.push(`${player.name} move rescue counter by 1`);
      }
      break;

    case 9: { // Source: heal player or draw one survival card
      const choice = options?.effectChoice;

      if (choice === 'heal') {
        const targetId = options?.targetPlayerId;
        const target = updatedGame.players.find(p => p.id === targetId);
        if (target) {
          target.will += 1;
          updatedGame.state.history.push(`${player.name} used Source to heal ${target.name}.`);
        } else {
          updatedGame.state.history.push(`${player.name} tried to heal, but target not found.`);
        }

      } else if (choice === 'survival') {
        const randomCard = Math.floor(Math.random() * 3) + 1; // 1–3
        player.survival.push(randomCard);
        updatedGame.state.history.push(`${player.name} used Source to draw a Survival card (${randomCard}).`);
      } else {
        updatedGame.state.history.push(`${player.name} played Source, but made no valid choice.`);
      }
    }
    break;

    case 10:
      {
        player.artefactActive = true;
        updatedGame.state.history.push(`${player.name} activate artefact ability`);
      }
      break;

    default:
      break;
  }

  updatedGame.players[playerIndex] = player;
  return updatedGame;
}

export function handleReset(game: Game): Game {
  const updatedGame = { ...game };

  // Check for game end condition before resetting
  if (updatedGame.state.board.assimilation >= 10 || updatedGame.state.board.rescue >= 10) {
    updatedGame.state.phase = 'ended';
    updatedGame.state.history.push(
      `Game ended. ${updatedGame.state.board.assimilation >= 10 ? 'Creature' : 'Survivors'} win.`
    );
    return updatedGame;
  }

  // Clear phase and increment turn
  updatedGame.state.phase = 'planning';
  updatedGame.state.turn += 1;

  // Reset hunted locations and effect flags
  updatedGame.state.huntedLocations = [];
  updatedGame.state.effectsUsed = {};

  // Update token availability based on rescue progress
  updatedGame.state.remainingTokens = updatedGame.state.board.rescue >= 10 ? 2 : 1;

  // Advance rescue track
  updatedGame.state.board.rescue += 1;

  // Reset player state
  // updatedGame.players = updatedGame.players.map((p) => ({
  //   id: p.id,
  //   name: p.name,
  //   connectionId: p.connectionId,
  //   hand: p.hand,
  //   discard: p.discard,
  //   isCreature: p.isCreature,
  //   will: p.will,
  //   survival: p.survival,
  //   riverActive: p.riverActive,
  //   artefactActive: p.artefactActive,
  // }));

  updatedGame.state.history.push(`Turn ${updatedGame.state.turn} ended. Starting next turn.`);

  return updatedGame;
}

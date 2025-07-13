export type GamePhase = 'lobby' | 'planning' | 'hunting' | 'resolution' | 'ended';

export interface BoardState {
  rescue: number; 
  assimilation: number;
}

export interface GameState {
  phase: GamePhase;
  turn: number;
  board: BoardState;
  history: string[];
}

export interface Player {
  connectionId: string;
  name: string;
  role?: 'creature' | 'hunted';
  hand?: number[];
  discarded?: number[];
}

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
    board: {
      rescue: 0,
      assimilation: 0,
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

export function handlePlayCard(
    game: GameState,
    player: Player,
    cardId: number,
): GameState {
    return game;
}

export function resolveTurn(game: GameState, players: Player[]): GameState {
    return game;
}
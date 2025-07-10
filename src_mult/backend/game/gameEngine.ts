export interface GameState {
    phase: 'lobby' | 'planning' | 'hunting' | 'resolution';
    turn: number;
    board: {
        rescue: number;
        assimilation: number;
    };
    history: string[];
}

export interface Player {
    connectionId: string;
    name: string;
    hand: number[];
    discarded: number[];
    role: 'creature' | 'hunted';
}

export function initializeGame(players: Player[]): GameState {
    return {
        phase: 'planning',
        turn: 1,
        board: {rescue: 0, assimilation: 0},
        history: [],
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
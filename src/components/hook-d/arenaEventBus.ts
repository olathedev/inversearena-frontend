/**
 * Arena Event Bus - Lightweight publish/subscribe event system
 * 
 * A framework-agnostic event bus for broadcasting arena domain events
 * across loosely coupled parts of the application.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Game state enum representing the current phase of the arena
 */
export type GameState = 'JOINING' | 'ACTIVE' | 'RESOLVING' | 'ENDED';

/**
 * Event listener function type
 */
export type EventListener<T> = (payload: T) => void;

/**
 * Unsubscribe function returned by event subscriptions
 */
export type UnsubscribeFn = () => void;

// ============================================================================
// Event Payload Interfaces
// ============================================================================

/**
 * Payload for round:started event
 */
export interface RoundStartedPayload {
  roundNumber: number;
  timestamp: number;
  duration: number;
}

/**
 * Payload for round:ended event
 */
export interface RoundEndedPayload {
  roundNumber: number;
  timestamp: number;
  outcome: 'heads' | 'tails';
}

/**
 * Payload for round:resolved event
 */
export interface RoundResolvedPayload {
  roundNumber: number;
  timestamp: number;
  eliminatedCount: number;
  survivorCount: number;
}

/**
 * Payload for player:eliminated event
 */
export interface PlayerEliminatedPayload {
  playerId: string;
  roundNumber: number;
  timestamp: number;
  choice: 'heads' | 'tails';
}

/**
 * Payload for player:joined event
 */
export interface PlayerJoinedPayload {
  playerId: string;
  timestamp: number;
  stake: number;
}

/**
 * Payload for player:choice event
 */
export interface PlayerChoiceMadePayload {
  playerId: string;
  roundNumber: number;
  choice: 'heads' | 'tails';
  timestamp: number;
}

/**
 * Payload for timer:tick event
 */
export interface TimerTickPayload {
  remainingSeconds: number;
  roundNumber: number;
}

/**
 * Payload for timer:tension event
 */
export interface TimerTensionModePayload {
  remainingSeconds: number;
  roundNumber: number;
}

/**
 * Payload for timer:expired event
 */
export interface TimerExpiredPayload {
  roundNumber: number;
  timestamp: number;
}

/**
 * Payload for pot:changed event
 */
export interface PotChangedPayload {
  newAmount: number;
  previousAmount: number;
  timestamp: number;
}

/**
 * Payload for pot:distributed event
 */
export interface PotDistributedPayload {
  totalAmount: number;
  winnerCount: number;
  amountPerWinner: number;
  timestamp: number;
}

/**
 * Payload for game:stateChanged event
 */
export interface GameStateChangedPayload {
  previousState: GameState;
  newState: GameState;
  timestamp: number;
}

/**
 * Map of all arena events to their payload types
 * This provides type safety for event names and payloads
 */
export interface ArenaEventMap {
  'round:started': RoundStartedPayload;
  'round:ended': RoundEndedPayload;
  'round:resolved': RoundResolvedPayload;
  'player:eliminated': PlayerEliminatedPayload;
  'player:joined': PlayerJoinedPayload;
  'player:choice': PlayerChoiceMadePayload;
  'timer:tick': TimerTickPayload;
  'timer:tension': TimerTensionModePayload;
  'timer:expired': TimerExpiredPayload;
  'pot:changed': PotChangedPayload;
  'pot:distributed': PotDistributedPayload;
  'game:stateChanged': GameStateChangedPayload;
}

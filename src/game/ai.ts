import type { LocationCard } from "./gameLogic";

export const allLocations: LocationCard[] = [
    'Lair',
    'Jungle',
    'River',
    'Beach',
    'Rover',
    'Swamp',
    'Source',
    'Wreck'
];


export function getAIBasedHunterLocation(playerHand: LocationCard[]): LocationCard {
  const index = Math.floor(Math.random() * playerHand.length);
  return playerHand[index];
}
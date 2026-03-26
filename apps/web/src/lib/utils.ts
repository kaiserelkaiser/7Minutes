import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a seeded pseudo-random position for orbs based on their ID
export function getOrbPosition(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Return percentage for absolute positioning
  const x = Math.abs(hash % 80) + 10; // 10% to 90%
  const speedOffset = Math.abs(hash % 20); // Variation in animation speed
  
  return { x, speedOffset };
}

export type AuthUserSession = {
  id: string;
  username: string;
  colorSignature: string;
  inviteCode: string;
  invitedByUsername: string | null;
  reputation: number;
  totalRoomsJoined: number;
  totalResonances: number;
  followerCount: number;
  verified: boolean;
  verificationTier: "creator" | "celebrity" | "founder" | null;
  currentStreak: number;
  creatureStage: number;
  interests: string[];
};

export type StoredAuthSession = {
  token: string;
  user: AuthUserSession;
};

export type StoredRoomSession = {
  userId: string;
  username: string;
  color: string;
  riftId: string;
  isRadio: boolean;
  sessionToken: string;
};

const AUTH_KEY = "sevenminutes_auth";
const ROOM_KEY = "sevenminutes_room";

export function getStoredAuthSession(): StoredAuthSession | null {
  return readStorage<StoredAuthSession>("localStorage", AUTH_KEY);
}

export function persistAuthSession(session: StoredAuthSession): void {
  writeStorage("localStorage", AUTH_KEY, session);
}

export function clearStoredAuthSession(): void {
  removeStorage("localStorage", AUTH_KEY);
}

export function getAuthToken(): string | null {
  return getStoredAuthSession()?.token ?? null;
}

export function getStoredRoomSession(): StoredRoomSession | null {
  return readStorage<StoredRoomSession>("sessionStorage", ROOM_KEY);
}

export function persistRoomSession(session: StoredRoomSession): void {
  writeStorage("sessionStorage", ROOM_KEY, session);
}

export function clearStoredRoomSession(): void {
  removeStorage("sessionStorage", ROOM_KEY);
}

function readStorage<T>(storageType: "localStorage" | "sessionStorage", key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const storage = window[storageType];
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeStorage(storageType: "localStorage" | "sessionStorage", key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window[storageType].setItem(key, JSON.stringify(value));
}

function removeStorage(storageType: "localStorage" | "sessionStorage", key: string): void {
  if (typeof window === "undefined") return;
  window[storageType].removeItem(key);
}

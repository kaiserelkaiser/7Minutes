import { logger } from "./logger";

export interface RiftUser {
  id: string;
  username: string;
  color: string;
  isGhost: boolean;
  isRadio: boolean;
  isTyping: boolean;
  joinedAt: Date;
  lastActivity: Date;
  x: number;
  y: number;
  vibeScore: number;
  burstUsed: boolean;
  momentum: number;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  userColor: string;
  content: string;
  createdAt: Date;
  expiresAt: Date;
  fadeStartAt: Date;
  isBurst: boolean;
  decayStage: 0 | 1 | 2 | 3 | 4;
  sentiment: "positive" | "negative" | "neutral";
}

export interface Fragment {
  id: string;
  userId: string;
  username: string;
  userColor: string;
  content: string;
  createdAt: Date;
  expiresAt: Date;
  completed: boolean;
}

export interface GhostTrail {
  userId: string;
  username: string;
  color: string;
  lastTopic: string;
  leftAt: Date;
  expiresAt: Date;
}

export interface RiftParticipant {
  userId: string;
  username: string;
  color: string;
}

export interface EarlyDeparture {
  userId: string;
  username: string;
  color: string;
  leftAt: Date;
}

export interface ResonanceChain {
  participantIds: string[];
  participants: Array<{ userId: string; username: string; userColor: string }>;
  sharedThought: string;
}

export interface RiftClosureSnapshot {
  roomId: string;
  topic: string;
  participantIds: string[];
  participantNames: string[];
  peakUsers: number;
  totalMessages: number;
  vibeColor: string;
  temperature: number;
  resonanceMoments: number;
  resonanceChains: number;
  catalystHistory: string[];
  earlyDepartureUserIds: string[];
  messages: Array<{ content: string; createdAt: Date }>;
}

export interface RemoveUserResult {
  trail: GhostTrail | null;
  closedSnapshot: RiftClosureSnapshot | null;
}

export interface Rift {
  id: string;
  topic: string;
  isQuantum: boolean;
  revealedTopic: string | null;
  users: Map<string, RiftUser>;
  participantLedger: Map<string, RiftParticipant>;
  earlyDepartures: Map<string, EarlyDeparture>;
  radioUsers: Set<string>;
  messages: Message[];
  fragments: Fragment[];
  ghostTrails: GhostTrail[];
  createdAt: Date;
  expiresAt: Date;
  vibeColor: string;
  temperature: number;
  isChaosMode: boolean;
  lastCatalystAt: Date | null;
  currentCatalyst: string | null;
  catalystHistory: string[];
  messageRate: number;
  lastMessageAt: Date | null;
  lastWordWinnerId: string | null;
  peakUsers: number;
  resonanceMoments: number;
  resonanceChains: number;
}

const RIFT_DURATION_MS = 7 * 60 * 1000;
const MESSAGE_FADE_START_NORMAL_MS = 3 * 60 * 1000;
const MESSAGE_FADE_START_CHAOS_MS = 2 * 60 * 1000;
const MESSAGE_EXPIRE_NORMAL_MS = 7 * 60 * 1000;
const MESSAGE_EXPIRE_CHAOS_MS = 5 * 60 * 1000;
const FRAGMENT_EXPIRE_MS = 90 * 1000;
const GHOST_TRAIL_EXPIRE_MS = 30 * 1000;
const MAX_USERS_PER_RIFT = 12;
const CHAOS_TEMP_THRESHOLD = 70;

export const QUANTUM_TOPICS = [
  "Argue the opposite of what you believe for seven minutes",
  "Confessional mode: say the thing you never post publicly",
  "Build a civilization from scratch in one conversation",
  "Hot take theater: defend your most suspicious opinion",
  "The trolley problem, but make it personal",
  "Design a future city with zero compromise",
  "Tell a story that changes halfway through",
  "Debate whether memory is a bug or a feature",
];

export const CATALYST_PROMPTS = [
  "Hot take time: Is social media rewiring how we love?",
  "Story circle: tell the moment this year that changed you.",
  "Debate mode: comfort or ambition?",
  "Confessional: say the thing you have been avoiding.",
  "Design challenge: invent a ritual for strangers to trust each other.",
  "Quick poll: what deserves to disappear forever?",
  "Unpopular opinion: what is secretly overrated right now?",
  "Imagine it is 2045. What went strangely right?",
  "Speed philosophy: what does a meaningful life cost?",
  "What truth got clearer for you this month?",
];

const NEGATIVE_WORDS = ["stupid", "idiot", "dumb", "hate", "terrible", "awful", "worst", "garbage", "trash", "useless"];
const POSITIVE_WORDS = ["great", "amazing", "love", "awesome", "brilliant", "nice", "helpful", "thanks", "excellent", "good", "perfect"];

const rifts = new Map<string, Rift>();

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function detectSentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const neg = NEGATIVE_WORDS.filter(w => lower.includes(w)).length;
  const pos = POSITIVE_WORDS.filter(w => lower.includes(w)).length;
  if (neg > pos) return "negative";
  if (pos > neg) return "positive";
  return "neutral";
}

function pickUserColor(rift: Rift, username: string): string {
  const preferredColor = colorFromUsername(username);
  const inUse = new Set(Array.from(rift.users.values()).map((user) => user.color));
  if (!inUse.has(preferredColor)) return preferredColor;
  return colorFromUsername(`${username}-${rift.id}-${rift.users.size}`);
}
function computeVibeColor(messages: Message[], isChaos: boolean, temp: number): string {
  const recent = messages.slice(-10);
  if (recent.length === 0) return "#00f5ff";
  const text = recent.map((message) => message.content).join(" ").toLowerCase();
  if (isChaos) return "#ff3366";
  if (temp > 80) return "#ff6b6b";

  const calmWords = ["slow", "gentle", "peace", "breathe", "reflect", "listen"];
  const creativeWords = ["build", "invent", "dream", "create", "imagine", "make"];
  const heatedWords = ["fight", "angry", "rage", "wrong", "never", "always"];
  const mysteriousWords = ["why", "unknown", "ghost", "void", "strange", "maybe"];

  let calm = 0;
  let creative = 0;
  let heated = 0;
  let mysterious = 0;

  for (const word of calmWords) if (text.includes(word)) calm += 1;
  for (const word of creativeWords) if (text.includes(word)) creative += 1;
  for (const word of heatedWords) if (text.includes(word)) heated += 1;
  for (const word of mysteriousWords) if (text.includes(word)) mysterious += 1;

  const max = Math.max(calm, creative, heated, mysterious);
  if (max === 0) return "#00f5ff";
  if (max === calm) return "#4da8ff";
  if (max === creative) return "#ccff00";
  if (max === heated) return "#ff6b6b";
  return "#9b5cff";
}

function updateTemperature(rift: Rift): void {
  const now = Date.now();
  const recentMessages = rift.messages.filter(m =>
    now - m.createdAt.getTime() < 60 * 1000
  );
  const rate = recentMessages.length;
  rift.messageRate = rate;
  const targetTemp = Math.min(100, rate * 8);
  rift.temperature = rift.temperature + (targetTemp - rift.temperature) * 0.3;
  const wasChaos = rift.isChaosMode;
  rift.isChaosMode = rift.temperature >= CHAOS_TEMP_THRESHOLD;
  if (rift.isChaosMode && !wasChaos) {
    logger.info({ riftId: rift.id }, "Rift entered chaos mode");
  }
}

export function checkEchoMoment(rift: Rift, newContent: string, newUserId: string): Message | null {
  const now = Date.now();
  const recent = rift.messages.filter(m =>
    m.userId !== newUserId &&
    now - m.createdAt.getTime() < 10000
  );
  for (const msg of recent) {
    const similarity = computeSimilarity(newContent.toLowerCase(), msg.content.toLowerCase());
    if (similarity > 0.6) {
      return msg;
    }
  }
  return null;
}

function computeSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared++;
  }
  return shared / Math.max(wordsA.size, wordsB.size);
}

export function getActiveRifts(): Rift[] {
  const now = new Date();
  const active: Rift[] = [];
  for (const rift of rifts.values()) {
    pruneRift(rift);
    if (rift.expiresAt > now) {
      active.push(rift);
    } else {
      rifts.delete(rift.id);
    }
  }
  return active;
}

export function getRiftById(riftId: string): Rift | undefined {
  const rift = rifts.get(riftId);
  if (!rift) return undefined;
  pruneRift(rift);
  if (rift.expiresAt <= new Date()) {
    rifts.delete(riftId);
    return undefined;
  }
  return rift;
}

export function findOrCreateRift(topic: string, riftId?: string, quantum?: boolean): Rift | null {
  if (riftId) {
    const existing = rifts.get(riftId);
    if (existing && existing.expiresAt > new Date() && existing.users.size < MAX_USERS_PER_RIFT) {
      return existing;
    }
  }
  for (const rift of rifts.values()) {
    if (rift.topic === topic && rift.expiresAt > new Date() && rift.users.size < MAX_USERS_PER_RIFT) {
      return rift;
    }
  }
  const now = new Date();
  const isQuantum = !!quantum;
  const revealedTopic = isQuantum ? null : topic;
  const newRift: Rift = {
    id: riftId?.trim() || generateId(),
    topic: isQuantum ? "???" : topic,
    isQuantum,
    revealedTopic,
    users: new Map(),
    participantLedger: new Map(),
    earlyDepartures: new Map(),
    radioUsers: new Set(),
    messages: [],
    fragments: [],
    ghostTrails: [],
    createdAt: now,
    expiresAt: new Date(now.getTime() + RIFT_DURATION_MS),
    vibeColor: "#00ffff",
    temperature: 0,
    isChaosMode: false,
    lastCatalystAt: null,
    currentCatalyst: null,
    catalystHistory: [],
    messageRate: 0,
    lastMessageAt: null,
    lastWordWinnerId: null,
    peakUsers: 0,
    resonanceMoments: 0,
    resonanceChains: 0,
  };
  if (isQuantum) {
    const randomTopic = QUANTUM_TOPICS[Math.floor(Math.random() * QUANTUM_TOPICS.length)];
    newRift.revealedTopic = randomTopic;
  }
  rifts.set(newRift.id, newRift);
  logger.info({ riftId: newRift.id, topic, isQuantum }, "New rift created");
  return newRift;
}

export function addUserToRift(
  rift: Rift,
  username: string,
  asRadio = false,
  options?: { userId?: string; color?: string },
): RiftUser | null {
  if (!asRadio && rift.users.size >= MAX_USERS_PER_RIFT) return null;
  if (options?.userId) {
    const existing = rift.users.get(options.userId);
    if (existing) {
      existing.isRadio = asRadio;
      rift.earlyDepartures.delete(existing.id);
      return existing;
    }
  }
  const user: RiftUser = {
    id: options?.userId ?? generateId(),
    username,
    color: options?.color ?? pickUserColor(rift, username),
    isGhost: false,
    isRadio: asRadio,
    isTyping: false,
    joinedAt: new Date(),
    lastActivity: new Date(),
    x: 20 + Math.random() * 60,
    y: 20 + Math.random() * 60,
    vibeScore: 50,
    burstUsed: false,
    momentum: 0,
  };
  rift.users.set(user.id, user);
  rift.participantLedger.set(user.id, {
    userId: user.id,
    username: user.username,
    color: user.color,
  });
  rift.earlyDepartures.delete(user.id);
  if (asRadio) {
    rift.radioUsers.add(user.id);
  }
  rift.peakUsers = Math.max(rift.peakUsers, rift.users.size);
  return user;
}

export function removeUserFromRift(riftId: string, userId: string): RemoveUserResult {
  const rift = rifts.get(riftId);
  if (!rift) return { trail: null, closedSnapshot: null };
  pruneRift(rift);
  const user = rift.users.get(userId);
  let trail: GhostTrail | null = null;
  if (user && !user.isRadio) {
    const lastMsg = [...rift.messages].reverse().find(m => m.userId === userId);
    trail = {
      userId: user.id,
      username: user.username,
      color: user.color,
      lastTopic: lastMsg?.content.substring(0, 60) || rift.topic,
      leftAt: new Date(),
      expiresAt: new Date(Date.now() + GHOST_TRAIL_EXPIRE_MS),
    };
    rift.ghostTrails.push(trail);
    setTimeout(() => {
      rift.ghostTrails = rift.ghostTrails.filter(t => t.userId !== userId || t.leftAt !== trail!.leftAt);
    }, GHOST_TRAIL_EXPIRE_MS);
  }
  if (user) {
    rift.earlyDepartures.set(user.id, {
      userId: user.id,
      username: user.username,
      color: user.color,
      leftAt: new Date(),
    });
  }
  rift.radioUsers.delete(userId);
  rift.users.delete(userId);
  let closedSnapshot: RiftClosureSnapshot | null = null;
  if (rift.users.size === 0 && rift.radioUsers.size === 0) {
    closedSnapshot = {
      roomId: rift.id,
      topic: rift.revealedTopic ?? rift.topic,
      participantIds: Array.from(rift.participantLedger.keys()),
      participantNames: Array.from(rift.participantLedger.values()).map((participant) => participant.username),
      peakUsers: rift.peakUsers,
      totalMessages: rift.messages.length,
      vibeColor: rift.vibeColor,
      temperature: rift.temperature,
      resonanceMoments: rift.resonanceMoments,
      resonanceChains: rift.resonanceChains,
      catalystHistory: [...rift.catalystHistory],
      earlyDepartureUserIds: Array.from(rift.earlyDepartures.keys()),
      messages: rift.messages.map((message) => ({
        content: message.content,
        createdAt: message.createdAt,
      })),
    };
    rifts.delete(riftId);
    logger.info({ riftId }, "Rift removed (empty)");
  }
  return { trail, closedSnapshot };
}

export function addMessage(rift: Rift, userId: string, content: string, isBurst = false): Message | null {
  const user = rift.users.get(userId);
  if (!user || user.isRadio || user.isGhost) return null;
  const now = new Date();
  const fadeStart = rift.isChaosMode ? MESSAGE_FADE_START_CHAOS_MS : MESSAGE_FADE_START_NORMAL_MS;
  const expire = rift.isChaosMode ? MESSAGE_EXPIRE_CHAOS_MS : MESSAGE_EXPIRE_NORMAL_MS;
  const sentiment = detectSentiment(content);
  if (sentiment === "negative") {
    user.vibeScore = Math.max(0, user.vibeScore - 10);
  } else if (sentiment === "positive") {
    user.vibeScore = Math.min(100, user.vibeScore + 5);
  }
  const vibeExpire = user.vibeScore > 70
    ? expire + 30000
    : user.vibeScore < 30
    ? expire - 30000
    : expire;
  const msg: Message = {
    id: generateId(),
    userId,
    username: user.username,
    userColor: user.color,
    content,
    createdAt: now,
    fadeStartAt: new Date(now.getTime() + fadeStart),
    expiresAt: new Date(now.getTime() + Math.max(60000, vibeExpire)),
    isBurst,
    decayStage: 0,
    sentiment,
  };
  rift.messages.push(msg);
  user.lastActivity = now;
  user.isTyping = false;
  rift.lastMessageAt = now;
  rift.lastWordWinnerId = userId;
  user.momentum = Math.min(100, user.momentum + 10);
  updateTemperature(rift);
  rift.vibeColor = computeVibeColor(rift.messages, rift.isChaosMode, rift.temperature);
  if (rift.messages.length > 100) rift.messages = rift.messages.slice(-80);
  return msg;
}

export function addFragment(rift: Rift, userId: string, content: string): Fragment | null {
  const user = rift.users.get(userId);
  if (!user || user.isRadio || user.isGhost) return null;
  const now = new Date();
  const fragment: Fragment = {
    id: generateId(),
    userId,
    username: user.username,
    userColor: user.color,
    content,
    createdAt: now,
    expiresAt: new Date(now.getTime() + FRAGMENT_EXPIRE_MS),
    completed: false,
  };
  rift.fragments.push(fragment);
  setTimeout(() => {
    rift.fragments = rift.fragments.filter(f => f.id !== fragment.id);
  }, FRAGMENT_EXPIRE_MS);
  return fragment;
}

export function completeFragment(rift: Rift, fragmentId: string, userId: string, completion: string): { fragment: Fragment; fullMessage: string } | null {
  const fragment = rift.fragments.find(f => f.id === fragmentId && !f.completed);
  if (!fragment || fragment.userId === userId) return null;
  const user = rift.users.get(userId);
  if (!user || user.isRadio || user.isGhost) return null;
  fragment.completed = true;
  rift.fragments = rift.fragments.filter(f => f.id !== fragmentId);
  const fullMessage = `${fragment.content}...${completion}`;
  return { fragment, fullMessage };
}

export function dropCatalyst(rift: Rift): string {
  const catalyst = CATALYST_PROMPTS[Math.floor(Math.random() * CATALYST_PROMPTS.length)];
  rift.currentCatalyst = catalyst;
  rift.lastCatalystAt = new Date();
  rift.catalystHistory = [...rift.catalystHistory.slice(-4), catalyst];
  return catalyst;
}

export function registerResonanceMoment(
  rift: Rift,
  participantIds: string[],
  mode: "echo" | "chain",
): void {
  rift.resonanceMoments += 1;
  if (mode === "chain") {
    rift.resonanceChains += 1;
    rift.temperature = Math.min(100, rift.temperature + 20);
    rift.isChaosMode = rift.temperature >= CHAOS_TEMP_THRESHOLD;
  }

  for (const participantId of participantIds) {
    const user = rift.users.get(participantId);
    if (!user) continue;
    user.vibeScore = Math.min(100, user.vibeScore + (mode === "chain" ? 18 : 10));
    user.momentum = Math.min(100, user.momentum + (mode === "chain" ? 22 : 12));
  }
}

export function checkResonanceChain(
  rift: Rift,
  newContent: string,
  newUserId: string,
): ResonanceChain | null {
  const now = Date.now();
  const recent = rift.messages.filter(
    (message) =>
      message.userId !== newUserId &&
      now - message.createdAt.getTime() < 10000 &&
      computeSimilarity(newContent.toLowerCase(), message.content.toLowerCase()) > 0.45,
  );

  const uniqueMessages = dedupeByUser(recent).slice(0, 4);
  if (uniqueMessages.length < 2) {
    return null;
  }

  const currentUser = rift.users.get(newUserId);
  if (!currentUser) return null;

  const participants = [
    ...uniqueMessages.map((message) => ({
      userId: message.userId,
      username: message.username,
      userColor: message.userColor,
    })),
    {
      userId: currentUser.id,
      username: currentUser.username,
      userColor: currentUser.color,
    },
  ];

  const participantIds = Array.from(new Set(participants.map((participant) => participant.userId)));
  if (participantIds.length < 3) {
    return null;
  }

  return {
    participantIds,
    participants,
    sharedThought: extractSharedThought([newContent, ...uniqueMessages.map((message) => message.content)]),
  };
}

export function getPresenceRoster() {
  const now = Date.now();
  return getActiveRifts().map((rift) => ({
    roomId: rift.id,
    topic: rift.revealedTopic ?? rift.topic,
    userCount: rift.users.size,
    maxUsers: MAX_USERS_PER_RIFT,
    temperature: rift.temperature,
    vibeColor: rift.vibeColor,
    timeLeftSeconds: Math.max(0, Math.floor((rift.expiresAt.getTime() - now) / 1000)),
    users: Array.from(rift.users.values())
      .filter((user) => !user.isRadio)
      .map((user) => ({
        userId: user.id,
        username: user.username,
        colorSignature: user.color,
      })),
  }));
}

export function setUserTyping(riftId: string, userId: string, isTyping: boolean): void {
  const rift = rifts.get(riftId);
  if (!rift) return;
  const user = rift.users.get(userId);
  if (user && !user.isRadio && !user.isGhost) user.isTyping = isTyping;
}

export function setGhostMode(riftId: string, userId: string, isGhost: boolean): void {
  const rift = rifts.get(riftId);
  if (!rift) return;
  const user = rift.users.get(userId);
  if (user) user.isGhost = isGhost;
}

export function useBurst(riftId: string, userId: string): boolean {
  const rift = rifts.get(riftId);
  if (!rift) return false;
  const user = rift.users.get(userId);
  if (!user || user.burstUsed) return false;
  user.burstUsed = true;
  return true;
}

export function serializeRift(rift: Rift) {
  return {
    id: rift.id,
    topic: rift.revealedTopic ?? rift.topic,
    isQuantum: rift.isQuantum,
    revealedTopic: rift.revealedTopic,
    userCount: rift.users.size,
    maxUsers: MAX_USERS_PER_RIFT,
    createdAt: rift.createdAt.toISOString(),
    expiresAt: rift.expiresAt.toISOString(),
    vibeColor: rift.vibeColor,
    temperature: rift.temperature,
    isChaosMode: rift.isChaosMode,
    currentCatalyst: rift.currentCatalyst,
  };
}

export function serializeUsers(rift: Rift) {
  return Array.from(rift.users.values()).map(u => ({
    id: u.id,
    username: u.username,
    color: u.color,
    isGhost: u.isGhost,
    isRadio: u.isRadio,
    isTyping: u.isTyping,
    x: u.x,
    y: u.y,
    vibeScore: u.vibeScore,
    momentum: u.momentum,
    burstUsed: u.burstUsed,
  }));
}

export function serializeMessages(rift: Rift) {
  const now = new Date();
  return rift.messages
    .filter(m => m.expiresAt > now)
    .map(m => ({
      id: m.id,
      userId: m.userId,
      username: m.username,
      userColor: m.userColor,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      fadeStartAt: m.fadeStartAt.toISOString(),
      expiresAt: m.expiresAt.toISOString(),
      isBurst: m.isBurst,
      decayStage: m.decayStage,
      sentiment: m.sentiment,
    }));
}

export function serializeFragments(rift: Rift) {
  const now = new Date();
  return rift.fragments
    .filter(f => !f.completed && f.expiresAt > now)
    .map(f => ({
      id: f.id,
      userId: f.userId,
      username: f.username,
      userColor: f.userColor,
      content: f.content,
      createdAt: f.createdAt.toISOString(),
      expiresAt: f.expiresAt.toISOString(),
    }));
}

export function serializeGhostTrails(rift: Rift) {
  const now = new Date();
  return rift.ghostTrails
    .filter(t => t.expiresAt > now)
    .map(t => ({
      userId: t.userId,
      username: t.username,
      color: t.color,
      lastTopic: t.lastTopic,
      leftAt: t.leftAt.toISOString(),
      expiresAt: t.expiresAt.toISOString(),
    }));
}

export function getRiftUser(riftId: string, userId: string): RiftUser | undefined {
  const rift = getRiftById(riftId);
  return rift?.users.get(userId);
}

export function expireRift(riftId: string): void {
  rifts.delete(riftId);
}

export function getSpeakerCount(rift: Rift): number {
  return Array.from(rift.users.values()).filter((user) => !user.isRadio).length;
}

export function getRiftParticipants(rift: Rift): RiftParticipant[] {
  return Array.from(rift.participantLedger.values());
}

function pruneRift(rift: Rift): void {
  const now = Date.now();
  rift.messages = rift.messages.filter((message) => message.expiresAt.getTime() > now);
  rift.fragments = rift.fragments.filter(
    (fragment) => !fragment.completed && fragment.expiresAt.getTime() > now,
  );
  rift.ghostTrails = rift.ghostTrails.filter((trail) => trail.expiresAt.getTime() > now);
}

function dedupeByUser(messages: Message[]): Message[] {
  const seen = new Set<string>();
  const unique: Message[] = [];
  for (const message of [...messages].reverse()) {
    if (seen.has(message.userId)) continue;
    seen.add(message.userId);
    unique.unshift(message);
  }
  return unique;
}

function extractSharedThought(contents: string[]): string {
  const score = new Map<string, number>();
  for (const content of contents) {
    const uniqueWords = new Set(
      content
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 3),
    );
    for (const word of uniqueWords) {
      score.set(word, (score.get(word) ?? 0) + 1);
    }
  }

  const best = [...score.entries()].sort((left, right) => right[1] - left[1])[0];
  return best?.[0] ?? "shared signal";
}

function colorFromUsername(username: string): string {
  let hash = 0;
  for (let index = 0; index < username.length; index += 1) {
    hash = username.charCodeAt(index) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 88%, 62%)`;
}

export { MAX_USERS_PER_RIFT };



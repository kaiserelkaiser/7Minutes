import { Server as IOServer, Socket } from "socket.io";
import { logger } from "./logger";
import {
  addFragment,
  addMessage,
  checkResonanceChain,
  checkEchoMoment,
  completeFragment,
  dropCatalyst,
  expireRift,
  getRiftParticipants,
  getRiftById,
  getRiftUser,
  getSpeakerCount,
  removeUserFromRift,
  serializeFragments,
  serializeGhostTrails,
  serializeMessages,
  serializeRift,
  serializeUsers,
  setGhostMode,
  setUserTyping,
  useBurst,
  registerResonanceMoment,
} from "./riftManager";
import { verifyRiftSessionToken } from "./auth";
import {
  finalizeClosedRoom,
  recordMessage,
  recordResonance,
  syncRoomSnapshot,
} from "./persistence";

const socketToRift = new Map<string, { riftId: string; userId: string; username: string }>();
const riftSchedules = new Map<
  string,
  {
    closing?: NodeJS.Timeout;
    lastWord?: NodeJS.Timeout;
    close?: NodeJS.Timeout;
    catalyst?: NodeJS.Timeout;
  }
>();

function scheduleDecayStages(
  io: IOServer,
  riftId: string,
  msgId: string,
  fadeStartMs: number,
  expireMs: number,
): void {
  const stageGap = Math.max(250, (expireMs - fadeStartMs) / 4);
  [1, 2, 3, 4].forEach((stage, index) => {
    const delay = fadeStartMs + stageGap * index;
    setTimeout(() => {
      if (getRiftById(riftId)) {
        io.to(riftId).emit("message-decay", { messageId: msgId, stage });
      }
    }, delay);
  });

  setTimeout(() => {
    io.to(riftId).emit("message-faded", { messageId: msgId });
  }, expireMs);
}

function ensureRiftSchedule(io: IOServer, riftId: string): void {
  if (riftSchedules.has(riftId)) {
    return;
  }

  const rift = getRiftById(riftId);
  if (!rift) {
    return;
  }

  const schedule: {
    closing?: NodeJS.Timeout;
    lastWord?: NodeJS.Timeout;
    close?: NodeJS.Timeout;
    catalyst?: NodeJS.Timeout;
  } = {};
  const timeLeft = Math.max(0, rift.expiresAt.getTime() - Date.now());
  const warningAt = Math.max(0, timeLeft - 60000);
  const lastWordAt = Math.max(0, timeLeft - 30000);

  schedule.closing = setTimeout(() => {
    if (getRiftById(riftId)) {
      io.to(riftId).emit("rift-closing", { timeLeft: 60000 });
    }
  }, warningAt);

  schedule.lastWord = setTimeout(() => {
    if (getRiftById(riftId)) {
      io.to(riftId).emit("last-word-gambit");
    }
  }, lastWordAt);

  schedule.close = setTimeout(() => {
    const currentRift = getRiftById(riftId);
    const lastWordWinnerId = currentRift?.lastWordWinnerId ?? null;
    if (currentRift) {
      const participants = getRiftParticipants(currentRift);
      void finalizeClosedRoom({
        roomId: currentRift.id,
        topic: currentRift.revealedTopic ?? currentRift.topic,
        participantIds: participants.map((participant) => participant.userId),
        participantNames: participants.map((participant) => participant.username),
        peakUsers: currentRift.peakUsers,
        totalMessages: currentRift.messages.length,
        vibeColor: currentRift.vibeColor,
        temperature: currentRift.temperature,
        resonanceMoments: currentRift.resonanceMoments,
        resonanceChains: currentRift.resonanceChains,
        catalystHistory: [...currentRift.catalystHistory],
        earlyDepartureUserIds: Array.from(currentRift.earlyDepartures.keys()),
        messages: currentRift.messages.map((message) => ({
          content: message.content,
          createdAt: message.createdAt,
        })),
      });
    }
    io.to(riftId).emit("rift-closed", { lastWordWinnerId });
    clearRiftSchedule(riftId);
    expireRift(riftId);
  }, timeLeft);

  schedule.catalyst = scheduleNextCatalyst(io, riftId);
  riftSchedules.set(riftId, schedule);
}

function scheduleNextCatalyst(io: IOServer, riftId: string): NodeJS.Timeout {
  const delay = 90000 + Math.random() * 60000;

  return setTimeout(() => {
    const rift = getRiftById(riftId);
    if (!rift) {
      clearRiftSchedule(riftId);
      return;
    }

    if (getSpeakerCount(rift) >= 2) {
      const catalyst = dropCatalyst(rift);
      io.to(riftId).emit("catalyst-drop", { catalyst });
      syncPersistedRift(riftId);
    }

    const schedule = riftSchedules.get(riftId);
    if (!schedule) {
      return;
    }

    schedule.catalyst = scheduleNextCatalyst(io, riftId);
  }, delay);
}

function clearRiftSchedule(riftId: string): void {
  const schedule = riftSchedules.get(riftId);
  if (!schedule) {
    return;
  }

  if (schedule.closing) clearTimeout(schedule.closing);
  if (schedule.lastWord) clearTimeout(schedule.lastWord);
  if (schedule.close) clearTimeout(schedule.close);
  if (schedule.catalyst) clearTimeout(schedule.catalyst);
  riftSchedules.delete(riftId);
}

function emitTypingState(io: IOServer, riftId: string): void {
  const rift = getRiftById(riftId);
  if (!rift) {
    return;
  }

  const typingUsers = Array.from(rift.users.values())
    .filter((user) => user.isTyping)
    .map((user) => user.id);

  io.to(riftId).emit("typing-update", { typingUsers });
}

function emitRiftError(socket: Socket, message: string): void {
  socket.emit("rift-error", { message });
}

function parseJoinPayload(payload: unknown): { riftId: string; sessionToken: string } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const riftId = typeof data.riftId === "string" ? data.riftId.trim() : "";
  const sessionToken =
    typeof data.sessionToken === "string" ? data.sessionToken.trim() : "";

  if (!riftId || !sessionToken) {
    return null;
  }

  return { riftId, sessionToken };
}

function parseMessagePayload(
  payload: unknown,
): { content: string; isBurst: boolean } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const content = typeof data.content === "string" ? data.content.trim().slice(0, 500) : "";

  if (!content) {
    return null;
  }

  return { content, isBurst: Boolean(data.isBurst) };
}

function parseTogglePayload(
  payload: unknown,
  key: "isGhost",
): { value: boolean } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  if (typeof data[key] !== "boolean") {
    return null;
  }

  return { value: data[key] as boolean };
}

function parseFragmentPayload(
  payload: unknown,
): { content: string } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const content = typeof data.content === "string" ? data.content.trim().slice(0, 200) : "";

  if (!content) {
    return null;
  }

  return { content };
}

function parseCompleteFragmentPayload(
  payload: unknown,
): { fragmentId: string; completion: string } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const fragmentId = typeof data.fragmentId === "string" ? data.fragmentId.trim() : "";
  const completion =
    typeof data.completion === "string" ? data.completion.trim().slice(0, 300) : "";

  if (!fragmentId || !completion) {
    return null;
  }

  return { fragmentId, completion };
}

function getSocketContext(socketId: string): { riftId: string; userId: string; username: string } | null {
  return socketToRift.get(socketId) ?? null;
}

function syncPersistedRift(riftId: string): void {
  const rift = getRiftById(riftId);
  if (!rift) return;

  void syncRoomSnapshot({
    id: rift.id,
    topic: rift.revealedTopic ?? rift.topic,
    type: rift.isQuantum ? "quantum" : "standard",
    activeUsers: rift.users.size,
    temperature: rift.temperature,
    vibe: rift.vibeColor,
    createdAt: rift.createdAt,
    expiresAt: rift.expiresAt,
    totalMessages: rift.messages.length,
    peakUsers: rift.peakUsers,
    isLive: true,
  });
}

export function setupSocketHandlers(io: IOServer): void {
  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    socket.on("join-rift", (payload) => {
      const parsed = parseJoinPayload(payload);
      if (!parsed) {
        emitRiftError(socket, "Invalid join payload");
        return;
      }

      const { riftId, sessionToken } = parsed;
      let claims;
      try {
        claims = verifyRiftSessionToken(sessionToken);
      } catch {
        emitRiftError(socket, "Invalid room session");
        return;
      }

      if (claims.riftId !== riftId) {
        emitRiftError(socket, "Room session mismatch");
        return;
      }

      const userId = claims.sub;
      const rift = getRiftById(riftId);
      const user = getRiftUser(riftId, userId);

      if (!rift || !user) {
        emitRiftError(socket, "Rift not found or session expired");
        return;
      }

      socketToRift.set(socket.id, { riftId, userId, username: claims.username });
      socket.join(riftId);

      socket.emit("rift-state", {
        rift: serializeRift(rift),
        users: serializeUsers(rift),
        messages: serializeMessages(rift),
        fragments: serializeFragments(rift),
        ghostTrails: serializeGhostTrails(rift),
        vibeColor: rift.vibeColor,
      });

      if (!user.isRadio) {
        socket.to(riftId).emit("user-joined", {
          user: {
            id: user.id,
            username: user.username,
            color: user.color,
            isGhost: user.isGhost,
            isRadio: user.isRadio,
            isTyping: user.isTyping,
            vibeScore: user.vibeScore,
            momentum: user.momentum,
            burstUsed: user.burstUsed,
          },
        });
      }

      ensureRiftSchedule(io, riftId);
      syncPersistedRift(riftId);
      logger.info({ riftId, userId, username: user.username }, "User joined rift via socket");
    });

    socket.on("send-message", (payload) => {
      const parsed = parseMessagePayload(payload);
      const context = getSocketContext(socket.id);
      if (!parsed || !context) {
        return;
      }

      const { riftId, userId } = context;
      const { content, isBurst } = parsed;
      const rift = getRiftById(riftId);
      const user = getRiftUser(riftId, userId);

      if (!rift || !user) {
        return;
      }

      if (isBurst && !useBurst(riftId, userId)) {
        emitRiftError(socket, "Burst mode has already been used in this rift");
        return;
      }

      const echoMatch = checkEchoMoment(rift, content, userId);
      const resonanceChain = checkResonanceChain(rift, content, userId);
      const msg = addMessage(rift, userId, content, isBurst);
      if (!msg) {
        return;
      }

      const message = {
        id: msg.id,
        userId: msg.userId,
        username: msg.username,
        userColor: msg.userColor,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        fadeStartAt: msg.fadeStartAt.toISOString(),
        expiresAt: msg.expiresAt.toISOString(),
        isBurst: msg.isBurst,
        decayStage: 0,
        sentiment: msg.sentiment,
      };

      io.to(riftId).emit("new-message", { message });
      io.to(riftId).emit("vibe-update", {
        vibeColor: rift.vibeColor,
        temperature: rift.temperature,
        isChaosMode: rift.isChaosMode,
      });

      io.to(riftId).emit("user-vibe-update", {
        userId,
        vibeScore: user.vibeScore,
        momentum: user.momentum,
        burstUsed: user.burstUsed,
      });
      void recordMessage({
        roomId: riftId,
        userId,
        username: user.username,
        content: msg.content,
        sentiment: msg.sentiment,
        createdAt: msg.createdAt,
        expiresAt: msg.expiresAt,
        isBurst: msg.isBurst,
      });
      syncPersistedRift(riftId);

      emitTypingState(io, riftId);

      if (echoMatch) {
        registerResonanceMoment(rift, [echoMatch.userId, msg.userId], "echo");
        void recordResonance([echoMatch.userId, msg.userId]);
        setTimeout(() => {
          if (!getRiftById(riftId)) {
            return;
          }

          io.to(riftId).emit("echo-moment", {
            message1: {
              id: echoMatch.id,
              content: echoMatch.content,
              userColor: echoMatch.userColor,
              username: echoMatch.username,
            },
            message2: {
              id: msg.id,
              content: msg.content,
              userColor: msg.userColor,
              username: msg.username,
            },
            mergedContent:
              content.length > echoMatch.content.length ? content : echoMatch.content,
          });
        }, 200);
      }

      if (resonanceChain) {
        registerResonanceMoment(rift, resonanceChain.participantIds, "chain");
        void recordResonance(resonanceChain.participantIds);
        io.to(riftId).emit("resonance-chain", {
          participants: resonanceChain.participants,
          sharedThought: resonanceChain.sharedThought,
          achievement:
            resonanceChain.participantIds.length >= 5
              ? "HIVE MIND MOMENT"
              : "Triple Resonance",
          roomTemperatureBoost: 20,
          messageBoostMultiplier: resonanceChain.participantIds.length >= 5 ? 1.8 : 1.5,
          goldenAuraSeconds: 30,
        });
      }

      io.to(riftId).emit("vibe-update", {
        vibeColor: rift.vibeColor,
        temperature: rift.temperature,
        isChaosMode: rift.isChaosMode,
      });
      syncPersistedRift(riftId);

      const fadeDelay = msg.fadeStartAt.getTime() - Date.now();
      const expireDelay = msg.expiresAt.getTime() - Date.now();

      if (fadeDelay > 0 && expireDelay > fadeDelay) {
        scheduleDecayStages(io, riftId, msg.id, fadeDelay, expireDelay);
      }
    });

    socket.on("drop-fragment", (payload) => {
      const parsed = parseFragmentPayload(payload);
      const context = getSocketContext(socket.id);
      if (!parsed || !context) {
        return;
      }

      const { riftId, userId } = context;
      const { content } = parsed;
      const rift = getRiftById(riftId);
      if (!rift || !getRiftUser(riftId, userId)) {
        return;
      }

      const fragment = addFragment(rift, userId, content);
      if (!fragment) {
        return;
      }

      io.to(riftId).emit("new-fragment", {
        fragment: {
          id: fragment.id,
          userId: fragment.userId,
          username: fragment.username,
          userColor: fragment.userColor,
          content: fragment.content,
          createdAt: fragment.createdAt.toISOString(),
          expiresAt: fragment.expiresAt.toISOString(),
        },
      });

      setTimeout(() => {
        if (getRiftById(riftId)) {
          io.to(riftId).emit("fragment-expired", { fragmentId: fragment.id });
        }
      }, 90000);
    });

    socket.on("complete-fragment", (payload) => {
      const parsed = parseCompleteFragmentPayload(payload);
      const context = getSocketContext(socket.id);
      if (!parsed || !context) {
        return;
      }

      const { riftId, userId } = context;
      const { fragmentId, completion } = parsed;
      const rift = getRiftById(riftId);
      if (!rift || !getRiftUser(riftId, userId)) {
        return;
      }

      const result = completeFragment(rift, fragmentId, userId, completion);
      if (!result) {
        return;
      }

      io.to(riftId).emit("fragment-completed", {
        fragmentId,
        completion,
        completedBy: userId,
      });

      const msg = addMessage(rift, userId, result.fullMessage);
      if (!msg) {
        return;
      }

      io.to(riftId).emit("new-message", {
        message: {
          id: msg.id,
          userId: msg.userId,
          username: msg.username,
          userColor: msg.userColor,
          content: msg.content,
          createdAt: msg.createdAt.toISOString(),
          fadeStartAt: msg.fadeStartAt.toISOString(),
          expiresAt: msg.expiresAt.toISOString(),
          isBurst: false,
          decayStage: 0,
          sentiment: msg.sentiment,
        },
      });

      io.to(riftId).emit("vibe-update", {
        vibeColor: rift.vibeColor,
        temperature: rift.temperature,
        isChaosMode: rift.isChaosMode,
      });
      void recordMessage({
        roomId: riftId,
        userId,
        username: msg.username,
        content: msg.content,
        sentiment: msg.sentiment,
        createdAt: msg.createdAt,
        expiresAt: msg.expiresAt,
        isBurst: false,
      });
      syncPersistedRift(riftId);

      emitTypingState(io, riftId);

      const fadeDelay = msg.fadeStartAt.getTime() - Date.now();
      const expireDelay = msg.expiresAt.getTime() - Date.now();
      if (fadeDelay > 0 && expireDelay > fadeDelay) {
        scheduleDecayStages(io, riftId, msg.id, fadeDelay, expireDelay);
      }
    });

    socket.on("typing-start", () => {
      const context = getSocketContext(socket.id);
      if (!context || !getRiftUser(context.riftId, context.userId)) {
        return;
      }

      setUserTyping(context.riftId, context.userId, true);
      emitTypingState(io, context.riftId);
    });

    socket.on("typing-stop", () => {
      const context = getSocketContext(socket.id);
      if (!context || !getRiftUser(context.riftId, context.userId)) {
        return;
      }

      setUserTyping(context.riftId, context.userId, false);
      emitTypingState(io, context.riftId);
    });

    socket.on("ghost-mode", (payload) => {
      const parsed = parseTogglePayload(payload, "isGhost");
      const context = getSocketContext(socket.id);
      if (!parsed || !context || !getRiftUser(context.riftId, context.userId)) {
        return;
      }

      setGhostMode(context.riftId, context.userId, parsed.value);
      setUserTyping(context.riftId, context.userId, false);
      io.to(context.riftId).emit("user-updated", {
        userId: context.userId,
        isGhost: parsed.value,
      });
      emitTypingState(io, context.riftId);
    });

    socket.on("disconnect", () => {
      const info = socketToRift.get(socket.id);
      if (!info) {
        return;
      }

      const { riftId, userId } = info;
      socketToRift.delete(socket.id);

      const result = removeUserFromRift(riftId, userId);
      const rift = getRiftById(riftId);

      socket.to(riftId).emit("user-left", { userId });

      if (result.trail) {
        socket.to(riftId).emit("ghost-trail", {
          trail: {
            userId: result.trail.userId,
            username: result.trail.username,
            color: result.trail.color,
            lastTopic: result.trail.lastTopic,
            leftAt: result.trail.leftAt.toISOString(),
            expiresAt: result.trail.expiresAt.toISOString(),
          },
        });
      }

      if (!rift) {
        clearRiftSchedule(riftId);
        if (result.closedSnapshot) {
          void finalizeClosedRoom(result.closedSnapshot);
        }
      } else {
        emitTypingState(io, riftId);
        syncPersistedRift(riftId);
      }

      logger.info({ riftId, userId }, "User left rift");
    });
  });
}

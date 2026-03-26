import { Server as IOServer, Socket } from "socket.io";
import { logger } from "./logger";
import {
  addFragment,
  addMessage,
  checkEchoMoment,
  completeFragment,
  dropCatalyst,
  expireRift,
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
} from "./riftManager";

const socketToRift = new Map<string, { riftId: string; userId: string }>();
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

function parseJoinPayload(payload: unknown): { riftId: string; userId: string } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const riftId = typeof data.riftId === "string" ? data.riftId.trim() : "";
  const userId = typeof data.userId === "string" ? data.userId.trim() : "";

  if (!riftId || !userId) {
    return null;
  }

  return { riftId, userId };
}

function parseMessagePayload(
  payload: unknown,
): { riftId: string; userId: string; content: string; isBurst: boolean } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const riftId = typeof data.riftId === "string" ? data.riftId.trim() : "";
  const userId = typeof data.userId === "string" ? data.userId.trim() : "";
  const content = typeof data.content === "string" ? data.content.trim().slice(0, 500) : "";

  if (!riftId || !userId || !content) {
    return null;
  }

  return { riftId, userId, content, isBurst: Boolean(data.isBurst) };
}

function parseTogglePayload(
  payload: unknown,
  key: "isGhost",
): { riftId: string; userId: string; value: boolean } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const riftId = typeof data.riftId === "string" ? data.riftId.trim() : "";
  const userId = typeof data.userId === "string" ? data.userId.trim() : "";

  if (!riftId || !userId || typeof data[key] !== "boolean") {
    return null;
  }

  return { riftId, userId, value: data[key] as boolean };
}

function parsePresencePayload(payload: unknown): { riftId: string; userId: string } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const riftId = typeof data.riftId === "string" ? data.riftId.trim() : "";
  const userId = typeof data.userId === "string" ? data.userId.trim() : "";

  if (!riftId || !userId) {
    return null;
  }

  return { riftId, userId };
}

function parseFragmentPayload(
  payload: unknown,
): { riftId: string; userId: string; content: string } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const riftId = typeof data.riftId === "string" ? data.riftId.trim() : "";
  const userId = typeof data.userId === "string" ? data.userId.trim() : "";
  const content = typeof data.content === "string" ? data.content.trim().slice(0, 200) : "";

  if (!riftId || !userId || !content) {
    return null;
  }

  return { riftId, userId, content };
}

function parseCompleteFragmentPayload(
  payload: unknown,
): { riftId: string; userId: string; fragmentId: string; completion: string } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const riftId = typeof data.riftId === "string" ? data.riftId.trim() : "";
  const userId = typeof data.userId === "string" ? data.userId.trim() : "";
  const fragmentId = typeof data.fragmentId === "string" ? data.fragmentId.trim() : "";
  const completion =
    typeof data.completion === "string" ? data.completion.trim().slice(0, 300) : "";

  if (!riftId || !userId || !fragmentId || !completion) {
    return null;
  }

  return { riftId, userId, fragmentId, completion };
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

      const { riftId, userId } = parsed;
      const rift = getRiftById(riftId);
      const user = getRiftUser(riftId, userId);

      if (!rift || !user) {
        emitRiftError(socket, "Rift not found or session expired");
        return;
      }

      socketToRift.set(socket.id, { riftId, userId });
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
      logger.info({ riftId, userId, username: user.username }, "User joined rift via socket");
    });

    socket.on("send-message", (payload) => {
      const parsed = parseMessagePayload(payload);
      if (!parsed) {
        return;
      }

      const { riftId, userId, content, isBurst } = parsed;
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

      emitTypingState(io, riftId);

      if (echoMatch) {
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

      const fadeDelay = msg.fadeStartAt.getTime() - Date.now();
      const expireDelay = msg.expiresAt.getTime() - Date.now();

      if (fadeDelay > 0 && expireDelay > fadeDelay) {
        scheduleDecayStages(io, riftId, msg.id, fadeDelay, expireDelay);
      }
    });

    socket.on("drop-fragment", (payload) => {
      const parsed = parseFragmentPayload(payload);
      if (!parsed) {
        return;
      }

      const { riftId, userId, content } = parsed;
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
      if (!parsed) {
        return;
      }

      const { riftId, userId, fragmentId, completion } = parsed;
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

      emitTypingState(io, riftId);

      const fadeDelay = msg.fadeStartAt.getTime() - Date.now();
      const expireDelay = msg.expiresAt.getTime() - Date.now();
      if (fadeDelay > 0 && expireDelay > fadeDelay) {
        scheduleDecayStages(io, riftId, msg.id, fadeDelay, expireDelay);
      }
    });

    socket.on("typing-start", (payload) => {
      const parsed = parsePresencePayload(payload);
      if (!parsed || !getRiftUser(parsed.riftId, parsed.userId)) {
        return;
      }

      setUserTyping(parsed.riftId, parsed.userId, true);
      emitTypingState(io, parsed.riftId);
    });

    socket.on("typing-stop", (payload) => {
      const parsed = parsePresencePayload(payload);
      if (!parsed || !getRiftUser(parsed.riftId, parsed.userId)) {
        return;
      }

      setUserTyping(parsed.riftId, parsed.userId, false);
      emitTypingState(io, parsed.riftId);
    });

    socket.on("ghost-mode", (payload) => {
      const parsed = parseTogglePayload(payload, "isGhost");
      if (!parsed || !getRiftUser(parsed.riftId, parsed.userId)) {
        return;
      }

      setGhostMode(parsed.riftId, parsed.userId, parsed.value);
      setUserTyping(parsed.riftId, parsed.userId, false);
      io.to(parsed.riftId).emit("user-updated", {
        userId: parsed.userId,
        isGhost: parsed.value,
      });
      emitTypingState(io, parsed.riftId);
    });

    socket.on("disconnect", () => {
      const info = socketToRift.get(socket.id);
      if (!info) {
        return;
      }

      const { riftId, userId } = info;
      socketToRift.delete(socket.id);

      const trail = removeUserFromRift(riftId, userId);
      const rift = getRiftById(riftId);

      socket.to(riftId).emit("user-left", { userId });

      if (trail) {
        socket.to(riftId).emit("ghost-trail", {
          trail: {
            userId: trail.userId,
            username: trail.username,
            color: trail.color,
            lastTopic: trail.lastTopic,
            leftAt: trail.leftAt.toISOString(),
            expiresAt: trail.expiresAt.toISOString(),
          },
        });
      }

      if (!rift) {
        clearRiftSchedule(riftId);
      } else {
        emitTypingState(io, riftId);
      }

      logger.info({ riftId, userId }, "User left rift");
    });
  });
}

import { Router, type IRouter } from "express";
import {
  JoinRiftBody,
  JoinRiftResponse,
  ListRiftsResponse,
} from "@workspace/api-zod";
import {
  addUserToRift,
  findOrCreateRift,
  getActiveRifts,
  getRiftById,
  MAX_USERS_PER_RIFT,
  type RiftType,
} from "../lib/riftManager";
import { signRiftSessionToken } from "../lib/auth";
import { recordRoomJoin, syncRoomSnapshot } from "../lib/persistence";

const router: IRouter = Router();
const MAX_USERNAME_LENGTH = 20;
const MAX_TOPIC_LENGTH = 48;

router.get("/rifts", (_req, res) => {
  const activeRifts = getActiveRifts();
  const data = ListRiftsResponse.parse({
    rifts: activeRifts.map(r => ({
      id: r.id,
      topic: r.topic,
      type: r.type,
      isQuantum: r.isQuantum,
      persistsUntilEmpty: r.type === "context",
      userCount: r.users.size,
      maxUsers: MAX_USERS_PER_RIFT,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      vibeColor: r.vibeColor,
      temperature: r.temperature,
      isChaosMode: r.isChaosMode,
    })),
  });
  res.json(data);
});

router.post("/rifts/join", (req, res) => {
  const parseResult = JoinRiftBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { username, topic, riftId, quantum, asRadio, mode } = parseResult.data;
  const authUser = req.auth;
  const trimmedUsername = (authUser?.username ?? username ?? "").trim().slice(0, MAX_USERNAME_LENGTH);
  const trimmedTopic = (topic || "").trim().slice(0, MAX_TOPIC_LENGTH);

  if (!trimmedUsername) {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  if (!trimmedTopic) {
    res.status(400).json({ error: "Topic is required" });
    return;
  }

  const requestedType: RiftType = mode === "context" ? "context" : quantum ? "quantum" : "standard";
  const rift = findOrCreateRift(trimmedTopic, riftId, !!quantum, requestedType);
  if (!rift) {
    res.status(400).json({ error: "No available rifts for this topic" });
    return;
  }

  const user = addUserToRift(rift, trimmedUsername, !!asRadio, {
    userId: authUser?.userId,
  });
  if (!user) {
    res.status(400).json({ error: "Rift is full" });
    return;
  }

  void syncRoomSnapshot({
    id: rift.id,
    topic: rift.revealedTopic ?? rift.topic,
    type: rift.type,
    activeUsers: rift.users.size,
    temperature: rift.temperature,
    vibe: rift.vibeColor,
    createdAt: rift.createdAt,
    expiresAt: rift.expiresAt,
    totalMessages: rift.messages.length,
    peakUsers: rift.peakUsers,
    isLive: true,
  });

  if (authUser?.userId) {
    void recordRoomJoin(authUser.userId, trimmedTopic);
  }

  const sessionToken = signRiftSessionToken(user.id, user.username, rift.id);

  const data = JoinRiftResponse.parse({
    riftId: rift.id,
    userId: user.id,
    userColor: user.color,
    asRadio: !!asRadio,
    sessionToken,
    rift: {
      id: rift.id,
      topic: rift.topic,
      type: rift.type,
      isQuantum: rift.isQuantum,
      persistsUntilEmpty: rift.type === "context",
      userCount: rift.users.size,
      maxUsers: MAX_USERS_PER_RIFT,
      createdAt: rift.createdAt,
      expiresAt: rift.expiresAt,
      vibeColor: rift.vibeColor,
      temperature: rift.temperature,
      isChaosMode: rift.isChaosMode,
    },
  });
  res.json(data);
});

router.get("/rifts/:id", (req, res) => {
  const rift = getRiftById(req.params.id);
  if (!rift) {
    res.status(404).json({ error: "Rift not found" });
    return;
  }

  res.json({
    rift: {
      id: rift.id,
      topic: rift.topic,
      type: rift.type,
      isQuantum: rift.isQuantum,
      persistsUntilEmpty: rift.type === "context",
      userCount: rift.users.size,
      maxUsers: MAX_USERS_PER_RIFT,
      createdAt: rift.createdAt,
      expiresAt: rift.expiresAt,
      vibeColor: rift.vibeColor,
      temperature: rift.temperature,
      isChaosMode: rift.isChaosMode,
    },
    joinable: rift.users.size < MAX_USERS_PER_RIFT,
  });
});

export default router;

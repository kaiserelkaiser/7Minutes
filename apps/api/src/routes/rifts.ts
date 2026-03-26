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
  MAX_USERS_PER_RIFT,
} from "../lib/riftManager";

const router: IRouter = Router();
const MAX_USERNAME_LENGTH = 20;
const MAX_TOPIC_LENGTH = 48;

router.get("/rifts", (_req, res) => {
  const activeRifts = getActiveRifts();
  const data = ListRiftsResponse.parse({
    rifts: activeRifts.map(r => ({
      id: r.id,
      topic: r.topic,
      isQuantum: r.isQuantum,
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

  const { username, topic, riftId, quantum, asRadio } = parseResult.data;
  const trimmedUsername = (username || "").trim().slice(0, MAX_USERNAME_LENGTH);
  const trimmedTopic = (topic || "").trim().slice(0, MAX_TOPIC_LENGTH);

  if (!trimmedUsername) {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  if (!trimmedTopic) {
    res.status(400).json({ error: "Topic is required" });
    return;
  }

  const rift = findOrCreateRift(trimmedTopic, riftId, !!quantum);
  if (!rift) {
    res.status(400).json({ error: "No available rifts for this topic" });
    return;
  }

  const user = addUserToRift(rift, trimmedUsername, !!asRadio);
  if (!user) {
    res.status(400).json({ error: "Rift is full" });
    return;
  }

  const data = JoinRiftResponse.parse({
    riftId: rift.id,
    userId: user.id,
    userColor: user.color,
    asRadio: !!asRadio,
    rift: {
      id: rift.id,
      topic: rift.topic,
      isQuantum: rift.isQuantum,
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

export default router;

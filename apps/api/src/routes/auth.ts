import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { signAuthToken } from "../lib/auth";
import {
  getHomeFeed,
  getUserById,
  isPersistenceError,
  loginUser,
  markRoomEchoViewed,
  registerUser,
} from "../lib/persistence";

const router: IRouter = Router();

router.post("/auth/register", async (req, res) => {
  try {
    const username = readString(req.body?.username, 24);
    const inviteCode = readOptionalString(req.body?.inviteCode, 40);
    const interests = Array.isArray(req.body?.interests)
      ? req.body.interests.filter((value: unknown): value is string => typeof value === "string")
      : [];

    const user = await registerUser({ username, inviteCode, interests });
    const token = signAuthToken(user.id, user.username);
    res.json({ token, user });
  } catch (error) {
    if (isPersistenceError(error)) {
      res.status(503).json({ error: "Persistence layer unavailable" });
      return;
    }

    const message = error instanceof Error ? error.message : "Unable to register user";
    res.status(message === "Username already taken" ? 409 : 400).json({ error: message });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const username = readString(req.body?.username, 24);
    const user = await loginUser(username);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const token = signAuthToken(user.id, user.username);
    res.json({ token, user });
  } catch (error) {
    if (isPersistenceError(error)) {
      res.status(503).json({ error: "Persistence layer unavailable" });
      return;
    }

    const message = error instanceof Error ? error.message : "Unable to login";
    res.status(400).json({ error: message });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.auth!.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    if (isPersistenceError(error)) {
      res.status(503).json({ error: "Persistence layer unavailable" });
      return;
    }

    res.status(500).json({ error: "Unable to read current user" });
  }
});

router.get("/auth/home-feed", requireAuth, async (req, res) => {
  try {
    const feed = await getHomeFeed(req.auth!.userId);
    res.json(feed);
  } catch (error) {
    if (isPersistenceError(error)) {
      res.status(503).json({ error: "Persistence layer unavailable" });
      return;
    }

    res.status(500).json({ error: "Unable to read home feed" });
  }
});

router.post("/auth/echoes/:echoId/view", requireAuth, async (req, res) => {
  try {
    const echoId = typeof req.params.echoId === "string" ? req.params.echoId.trim() : "";
    const viewed = await markRoomEchoViewed(req.auth!.userId, echoId);
    if (!viewed) {
      res.status(404).json({ error: "Echo not found" });
      return;
    }

    res.json({ viewed: true });
  } catch (error) {
    if (isPersistenceError(error)) {
      res.status(503).json({ error: "Persistence layer unavailable" });
      return;
    }

    res.status(500).json({ error: "Unable to update echo state" });
  }
});

export default router;

function readString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    throw new Error("Username is required");
  }

  const trimmed = value.trim().slice(0, maxLength);
  if (!trimmed) {
    throw new Error("Username is required");
  }

  return trimmed;
}

function readOptionalString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || undefined;
}

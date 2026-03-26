import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import {
  followUser,
  getUserProfile,
  isPersistenceError,
} from "../lib/persistence";

const router: IRouter = Router();

router.get("/users/:username", async (req, res) => {
  try {
    const username = readUsernameParam(req.params.username);
    const authHeader = req.headers.authorization;
    const viewerUserId = req.auth?.userId;

    if (authHeader && !req.auth) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const profile = await getUserProfile(username, viewerUserId);
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(profile);
  } catch (error) {
    if (isPersistenceError(error)) {
      res.status(503).json({ error: "Persistence layer unavailable" });
      return;
    }

    const message = error instanceof Error ? error.message : "Unable to read user profile";
    res.status(400).json({ error: message });
  }
});

router.post("/users/:username/follow", requireAuth, async (req, res) => {
  try {
    const username = readUsernameParam(req.params.username);
    const result = await followUser(req.auth!.userId, username);
    res.json(result);
  } catch (error) {
    if (isPersistenceError(error)) {
      res.status(503).json({ error: "Persistence layer unavailable" });
      return;
    }

    const message = error instanceof Error ? error.message : "Unable to update follow state";
    res.status(message === "User not found" ? 404 : 400).json({ error: message });
  }
});

export default router;

function readUsernameParam(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Username is required");
  }

  const username = value.trim().slice(0, 24);
  if (!username) {
    throw new Error("Username is required");
  }

  return username;
}

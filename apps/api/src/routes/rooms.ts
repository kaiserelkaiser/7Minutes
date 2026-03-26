import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { isPersistenceError, listScheduledRooms, scheduleRoom } from "../lib/persistence";

const router: IRouter = Router();

router.get("/rooms/upcoming", async (_req, res) => {
  try {
    const rooms = await listScheduledRooms();
    res.json({ rooms });
  } catch (error) {
    if (isPersistenceError(error)) {
      res.status(503).json({ error: "Persistence layer unavailable" });
      return;
    }

    res.status(500).json({ error: "Unable to read scheduled rooms" });
  }
});

router.post("/rooms/schedule", requireAuth, async (req, res) => {
  try {
    const room = await scheduleRoom({
      creatorUserId: req.auth!.userId,
      topic: readString(req.body?.topic, 60),
      scheduledFor: readString(req.body?.scheduledFor, 40),
      description: readOptionalString(req.body?.description, 180),
      isPublic: typeof req.body?.isPublic === "boolean" ? req.body.isPublic : true,
      maxUsers: typeof req.body?.maxUsers === "number" ? req.body.maxUsers : 12,
      reminderEnabled:
        typeof req.body?.reminderEnabled === "boolean" ? req.body.reminderEnabled : true,
      kind: readKind(req.body?.kind),
    });

    res.status(201).json(room);
  } catch (error) {
    if (isPersistenceError(error)) {
      res.status(503).json({ error: "Persistence layer unavailable" });
      return;
    }

    const message = error instanceof Error ? error.message : "Unable to schedule room";
    res.status(400).json({ error: message });
  }
});

export default router;

function readString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    throw new Error("Required field missing");
  }

  const trimmed = value.trim().slice(0, maxLength);
  if (!trimmed) {
    throw new Error("Required field missing");
  }

  return trimmed;
}

function readOptionalString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || undefined;
}

function readKind(value: unknown): "ama" | "launch-party" | "watch-party" | "study-session" | "open" {
  switch (value) {
    case "ama":
    case "launch-party":
    case "watch-party":
    case "study-session":
      return value;
    default:
      return "open";
  }
}

import { Router, type IRouter } from "express";
import { getPresenceRoster } from "../lib/riftManager";
import { getPresenceSnapshot, isPersistenceError } from "../lib/persistence";

const router: IRouter = Router();

router.get("/presence", async (req, res) => {
  try {
    const snapshot = await getPresenceSnapshot(getPresenceRoster(), req.auth?.userId);
    res.json(snapshot);
  } catch (error) {
    if (isPersistenceError(error)) {
      res.status(503).json({ error: "Persistence layer unavailable" });
      return;
    }

    res.status(500).json({ error: "Unable to read presence snapshot" });
  }
});

export default router;

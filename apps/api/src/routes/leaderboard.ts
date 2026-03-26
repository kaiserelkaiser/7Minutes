import { Router, type IRouter } from "express";
import { getInviterLeaderboard, isPersistenceError } from "../lib/persistence";

const router: IRouter = Router();

router.get("/leaderboard/inviters", async (_req, res) => {
  try {
    const leaderboard = await getInviterLeaderboard();
    res.json({ inviters: leaderboard });
  } catch (error) {
    if (isPersistenceError(error)) {
      res.status(503).json({ error: "Persistence layer unavailable" });
      return;
    }

    res.status(500).json({ error: "Unable to read inviter leaderboard" });
  }
});

export default router;

import { Router, type IRouter } from "express";
import { optionalAuth } from "../lib/auth";
import authRouter from "./auth";
import healthRouter from "./health";
import leaderboardRouter from "./leaderboard";
import presenceRouter from "./presence";
import roomsRouter from "./rooms";
import riftsRouter from "./rifts";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(optionalAuth);
router.use(healthRouter);
router.use(authRouter);
router.use(leaderboardRouter);
router.use(presenceRouter);
router.use(roomsRouter);
router.use(riftsRouter);
router.use(usersRouter);

export default router;

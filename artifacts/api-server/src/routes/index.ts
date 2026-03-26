import { Router, type IRouter } from "express";
import healthRouter from "./health";
import riftsRouter from "./rifts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(riftsRouter);

export default router;

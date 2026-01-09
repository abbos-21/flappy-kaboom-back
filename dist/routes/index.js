import express from "express";
import authRouter from "./auth.js";
import gameRouter from "./game.js";
import { telegramAuthMiddleware, verifyToken } from "../middleware/index.js";
const router = express.Router();
router.use("/auth", telegramAuthMiddleware, authRouter);
router.use("/game", verifyToken, gameRouter);
export default router;

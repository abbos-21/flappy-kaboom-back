import express from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma.js";
import { JWT_SECRET } from "../config/env.js";
const router = express.Router();
/**
 * Telegram → Sync user → Issue tokens
 */
router.post("/sync", async (req, res) => {
    const tgUser = req.tgUser;
    const user = await prisma.user.upsert({
        where: { telegramId: tgUser.id },
        update: {
            firstName: tgUser.first_name,
            lastName: tgUser.last_name ?? "",
            username: tgUser.username ?? "",
        },
        create: {
            telegramId: tgUser.id,
            firstName: tgUser.first_name,
            lastName: tgUser.last_name ?? "",
            username: tgUser.username ?? "",
            canPlay: true,
        },
    });
    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "15m",
    });
    const refreshToken = uuidv4();
    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });
    res.json({
        accessToken,
        refreshToken,
        user,
    });
});
/**
 * Refresh access token
 */
router.post("/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken)
        return res.status(400).json({ message: "Refresh token required" });
    const stored = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
    });
    if (!stored || stored.expiresAt < new Date()) {
        return res.status(403).json({ message: "Invalid refresh token" });
    }
    const accessToken = jwt.sign({ userId: stored.userId }, JWT_SECRET, {
        expiresIn: "15m",
    });
    res.json({ accessToken });
});
/**
 * Logout (optional but recommended)
 */
router.post("/logout", async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
        await prisma.refreshToken.deleteMany({
            where: { token: refreshToken },
        });
    }
    res.json({ success: true });
});
export default router;

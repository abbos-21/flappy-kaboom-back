import express, { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Configuration constants must match Frontend constants
const PIPE_SPAWN_RATE = 1.5; // Seconds per pipe
const INITIAL_DELAY = 2.0; // Seconds before first pipe
const LATENCY_BUFFER = 0.8; // Allow 2 seconds of lag buffer

/**
 * 1. Start Game Session
 * Creates a record in DB with the server-side timestamp.
 */
router.post("/start", verifyToken, async (req: Request, res: Response) => {
  try {
    const session = await prisma.gameSession.create({
      data: {
        userId: req.userId!,
        status: "ACTIVE",
        startTime: new Date(),
      },
    });

    res.json({
      sessionId: session.id,
      success: true,
    });
  } catch (error) {
    console.error("Start Game Error:", error);
    res.status(500).json({ message: "Failed to start session" });
  }
});

/**
 * 2. End Game Session (Secure Score Submission)
 */
router.post("/end", verifyToken, async (req: Request, res: Response) => {
  const { sessionId, score } = req.body;

  if (!sessionId || typeof score !== "number") {
    return res.status(400).json({ message: "Invalid payload" });
  }

  try {
    // 1. Fetch session AND user info
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || session.userId !== req.userId) {
      return res.status(403).json({ message: "Invalid session" });
    }

    if (session.status !== "ACTIVE") {
      return res.status(400).json({ message: "Session already finalized" });
    }

    const now = new Date();
    const durationSeconds =
      (now.getTime() - session.startTime.getTime()) / 1000;

    // 2. Refined Anti-Cheat Math
    // We subtract the initial delay. If the result is negative, game just started.
    const netGameTime = durationSeconds - INITIAL_DELAY;

    // In Kaboom loop(1.5), the first pipe usually spawns AFTER the first interval.
    // So the first pipe passes the bird at roughly: INITIAL_DELAY + SPAWN_RATE + TravelTime.
    // To be safe for pro players, we use a generous "Floor + 1" logic.
    const maxPossibleScore =
      netGameTime > 0
        ? Math.floor((netGameTime + LATENCY_BUFFER) / PIPE_SPAWN_RATE) + 1
        : 0;

    let finalStatus: "COMPLETED" | "FAILED" = "COMPLETED";
    let isValid = true;
    let coinsEarned = 0;

    // Validation: Only flag if score is higher than math allows AND score is significant
    if (score > maxPossibleScore && score > 3) {
      console.warn(
        `[ANTI-CHEAT] Rejecting score ${score}. Max allowed was ${maxPossibleScore} for ${durationSeconds.toFixed(2)}s`,
      );
      finalStatus = "FAILED";
      isValid = false;
    } else {
      coinsEarned = score;
    }

    // 3. Prepare User Data
    const isNewHighScore = isValid && score > session.user.maxScore;

    // 4. Update Database Transaction
    const [updatedSession, updatedUser] = await prisma.$transaction([
      prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          endTime: now,
          score: isValid ? score : 0,
          status: finalStatus,
          isValid,
        },
      }),
      prisma.user.update({
        where: { id: req.userId },
        data: {
          coins: { increment: coinsEarned },
          totalCoins: { increment: coinsEarned },
          maxScore: isNewHighScore ? score : undefined,
        },
      }),
    ]);

    res.json({
      success: true,
      valid: isValid,
      newCoins: updatedUser.coins,
      earned: coinsEarned,
      highScore: updatedUser.maxScore,
    });
  } catch (error) {
    console.error("End Game Error:", error);
    res.status(500).json({ message: "Failed to submit score" });
  }
});

/**
 * 3. Sync User State
 */
router.get("/sync", verifyToken, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: {
      coins: true,
      maxScore: true,
      firstName: true,
    },
  });

  if (!user) return res.status(404).json({ message: "User not found" });

  res.json({ success: true, user });
});

export default router;

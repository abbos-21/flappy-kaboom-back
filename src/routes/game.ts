import express, { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Configuration constants must match Frontend constants
const PIPE_SPAWN_RATE = 1.5; // Seconds per pipe
const INITIAL_DELAY = 2.0; // Seconds before first pipe
const LATENCY_BUFFER = 2.0; // Allow 2 seconds of lag buffer

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
    // 1. Fetch session AND user info in one go to save DB calls
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { user: true }, // This gives us session.user.maxScore
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

    // 2. Anti-Cheat Logic
    const maxPossibleScore = Math.ceil(
      (durationSeconds - INITIAL_DELAY + LATENCY_BUFFER) / PIPE_SPAWN_RATE,
    );

    let finalStatus: "COMPLETED" | "FAILED" = "COMPLETED";
    let isValid = true;
    let coinsEarned = 0;

    if (score > maxPossibleScore && score > 5) {
      console.warn(`CHEAT DETECTED: User ${req.userId}`);
      finalStatus = "FAILED";
      isValid = false;
    } else {
      coinsEarned = score;
    }

    // 3. Prepare User Data
    // We already have the current maxScore from the 'include' above
    const isNewHighScore = isValid && score > session.user.maxScore;

    // 4. Update Database Transaction
    // No awaits inside the array!
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
      // Use a single update call for user
      prisma.user.update({
        where: { id: req.userId },
        data: {
          coins: { increment: coinsEarned },
          totalCoins: { increment: coinsEarned },
          // Only update if it's a record, otherwise leave it as is
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

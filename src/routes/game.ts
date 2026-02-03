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
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    // 1. Check existence and ownership
    if (!session || session.userId !== req.userId) {
      return res.status(403).json({ message: "Invalid session" });
    }

    // 2. Check if already finished
    if (session.status !== "ACTIVE") {
      return res.status(400).json({ message: "Session already finalized" });
    }

    const now = new Date();
    const durationSeconds =
      (now.getTime() - session.startTime.getTime()) / 1000;

    // 3. Mathematical Validation (Anti-Cheat)
    // Max Score = (Total Time - Start Delay) / Rate
    const maxPossibleScore = Math.ceil(
      (durationSeconds - INITIAL_DELAY + LATENCY_BUFFER) / PIPE_SPAWN_RATE,
    );

    let finalStatus = "COMPLETED";
    let isValid = true;
    let coinsEarned = 0;

    // If score is impossibly high given the time elapsed
    if (score > maxPossibleScore && score > 5) {
      console.warn(
        `CHEAT DETECTED: User ${req.userId} score ${score} in ${durationSeconds}s`,
      );
      finalStatus = "FAILED";
      isValid = false;
    } else {
      // Legit score
      coinsEarned = score; // 1 coin per 1 score logic
    }

    // 4. Update Database Transaction
    const [updatedSession, updatedUser] = await prisma.$transaction([
      prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          endTime: now,
          score: isValid ? score : 0,
          status: finalStatus as any,
          isValid,
        },
      }),
      // Only update user stats if valid
      ...(isValid
        ? [
            prisma.user.update({
              where: { id: req.userId },
              data: {
                coins: { increment: coinsEarned },
                totalCoins: { increment: coinsEarned },
                maxScore: {
                  set:
                    score >
                    (
                      await prisma.user.findUniqueOrThrow({
                        where: { id: req.userId },
                      })
                    ).maxScore
                      ? score
                      : undefined,
                },
              },
            }),
          ]
        : []),
    ]);

    res.json({
      success: true,
      valid: isValid,
      newCoins: isValid ? updatedUser.coins : undefined,
      earned: coinsEarned,
      highScore: isValid ? updatedUser.maxScore : undefined,
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

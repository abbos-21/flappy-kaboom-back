import express, { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

router.get("/sync", async (req: Request, res: Response) => {
  const user = prisma.user.findUnique({
    where: {
      id: req.userId!,
    },
    select: {
      coins: true,
      maxScore: true,
      canPlay: true,
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({ success: true, user: user });
});

export default router;

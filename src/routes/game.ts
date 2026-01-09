import express, { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

router.get("/sync", async (req: Request, res: Response) => {
  const user = prisma.user.findUnique({
    where: {
      id: req.userId!,
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({ success: true, data: { user: user } });
});

export default router;

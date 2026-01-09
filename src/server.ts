import express, { Request, Response } from "express";
import cors from "cors";
import http from "http";
import { PORT } from "./config/env.js";
import apiRouter from "./routes/index.js";

export async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.set("trust proxy", true);
  app.use(cors());
  app.use(express.json());

  app.get("/", (req: Request, res: Response) => {
    res.json("Hey, you just got hacked!");
  });

  app.use("/api", apiRouter);

  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
}

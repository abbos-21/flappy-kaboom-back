import dotenv from "dotenv";
dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN!;
export const PORT = process.env.PORT!;
export const JWT_SECRET = process.env.JWT_SECRET!;

import { Bot } from "grammy";
import "dotenv/config";
import interactionComposer from "./features/interactions.js";
import { BOT_TOKEN } from "../config/env.js";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is missing in environment variables");
  process.exit(1);
}

export const bot = new Bot(BOT_TOKEN);

// 1. Register Logic
bot.use(interactionComposer);

// 2. Global Error Handler
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  console.error(err.error);
});

// 3. Start Function
export async function startBot() {
  try {
    // Clear old updates to avoid spam on restart
    await bot.api.deleteWebhook({ drop_pending_updates: true });

    const me = await bot.api.getMe();
    console.log(`✅ Bot @${me.username} is up and running!`);

    await bot.start();
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
}

// Graceful shutdown
const stop = () => bot.stop();
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

// Run directly if executed as script
// if (require.main === module) startBot();

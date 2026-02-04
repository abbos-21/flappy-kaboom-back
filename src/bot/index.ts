// src/bot/index.ts
import { Bot } from "grammy";
import "dotenv/config";

import commandsComposer from "./commands.js"; // your composer file
import { BOT_TOKEN } from "../config/env";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is missing");
  process.exit(1);
}

export const bot = new Bot(BOT_TOKEN);

// Register middleware / handlers
bot.use(commandsComposer);

// Error handler
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Update ${ctx?.update.update_id ?? "unknown"} failed:`, err);
});

/**
 * Starts the bot with long polling
 * Can be awaited or called directly
 */
export async function startBot() {
  try {
    const me = await bot.api.getMe();
    console.log(`Bot @${me.username} started successfully`);

    await bot.start({
      drop_pending_updates: true,
      onStart: () => {
        console.log("Polling active — bot is ready!");
      },
    });
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());

// If this file is run directly → start the bot automatically
if (require.main === module) {
  startBot().catch(console.error);
}

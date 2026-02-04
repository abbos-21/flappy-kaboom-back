// src/bot/index.ts (or commands file)
import { Composer } from "grammy";
import { getOrCreateUser } from "./handlers/user.js";
import { prisma } from "../lib/prisma.js";

const composer = new Composer();

composer.command("start", async (ctx) => {
  try {
    const user = await getOrCreateUser(ctx);

    let text = `Welcome, ${user.firstName}! 👋`;

    if (ctx.match) {
      // Optional: show different message if came via referral
      if (typeof ctx.match === "string" && ctx.match.startsWith("ref_")) {
        text += "\n\nYou were invited by a friend — enjoy the game!";
      }
    }

    await ctx.reply(text, {
      // reply_markup: your main menu keyboard
    });
  } catch (err) {
    console.error(err);
    await ctx.reply("Sorry, something went wrong 😔");
  }
});

composer.command("ref", async (ctx) => {
  const user = await getOrCreateUser(ctx); // or get from session/context

  const botUsername = ctx.me.username; // grammy automatically sets ctx.me
  if (!botUsername) return ctx.reply("Error getting bot username");

  const refLink = `https://t.me/${botUsername}?start=ref_${user.id}`;

  await ctx.reply(
    `🎁 Your referral link:\n\n${refLink}\n\n` +
      `Share it with friends and earn 100 coins for each new player!`,
    {
      link_preview_options: { is_disabled: true },
    },
  );
});

composer.command("stats", async (ctx) => {
  const user = await getOrCreateUser(ctx);

  const referralCount = await prisma.user.count({
    where: { referredById: user.id },
  });

  const text =
    `👤 You invited ${referralCount} friends\n` + `Your coins: ${user.coins}`;

  await ctx.reply(text);
});

export default composer;

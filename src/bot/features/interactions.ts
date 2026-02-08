import { Composer, Context } from "grammy";
import { getOrCreateUser } from "../handlers/user.js";
import { prisma } from "../../lib/prisma.js";
import { KEYBOARDS } from "../ui/menus.js";

const composer = new Composer();

// --- Helper to Generate Main Menu Text ---
const getMainMenuText = (name: string, isRef: boolean) => {
  let text = `👋 <b>Welcome, ${name}!</b>\n\n`;
  text += `I am your personal assistant bot. Use the menu below to navigate.`;

  if (isRef) {
    text += `\n\n<i>✨ You were invited by a friend! Enjoy the game!</i>`;
  }
  return text;
};

// --- Command: /start ---
composer.command("start", async (ctx) => {
  try {
    const user = await getOrCreateUser(ctx);
    const isRef = typeof ctx.match === "string" && ctx.match.startsWith("ref_");

    await ctx.reply(getMainMenuText(user.firstName, isRef), {
      reply_markup: KEYBOARDS.main,
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error(err);
    await ctx.reply("Sorry, something went wrong initializing your profile.");
  }
});

// --- Callback: Back to Main Menu ---
composer.callbackQuery("menu_main", async (ctx) => {
  const user = await getOrCreateUser(ctx);
  await ctx.editMessageText(getMainMenuText(user.firstName, false), {
    reply_markup: KEYBOARDS.main,
    parse_mode: "HTML",
  });
  await ctx.answerCallbackQuery();
});

// --- Callback: Stats ---
composer.callbackQuery("menu_stats", async (ctx) => {
  const user = await getOrCreateUser(ctx);

  const referralCount = await prisma.user.count({
    where: { referredById: user.id },
  });

  const text =
    `📊 <b>Your Statistics</b>\n\n` +
    `👤 <b>Name:</b> ${user.firstName}\n` +
    `💰 <b>Coins:</b> ${user.coins}\n` +
    `🤝 <b>Invited Friends:</b> ${referralCount}\n\n` +
    `<i>Keep inviting to earn more!</i>`;

  await ctx.editMessageText(text, {
    reply_markup: KEYBOARDS.back,
    parse_mode: "HTML",
  });
  await ctx.answerCallbackQuery();
});

// --- Callback: Referral Link ---
composer.callbackQuery("menu_ref", async (ctx) => {
  const user = await getOrCreateUser(ctx);
  const botUsername = ctx.me.username;
  const refLink = `https://t.me/${botUsername}?start=ref_${user.id}`;

  const text =
    `🎁 <b>Invite Friends & Earn!</b>\n\n` +
    `Share your unique link below. For every friend who joins, you get <b>100 coins</b>!\n\n` +
    `👇 <b>Your Link:</b>\n` +
    `<code>${refLink}</code>`;

  await ctx.editMessageText(text, {
    reply_markup: KEYBOARDS.back,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
  await ctx.answerCallbackQuery("Here is your link! 🚀");
});

// --- Callback: Refresh ---
// Useful if coins update in background
composer.callbackQuery("menu_refresh", async (ctx) => {
  // Re-render main menu to update any dynamic text if needed
  // For now, we just acknowledge the tap to show responsiveness
  await ctx.answerCallbackQuery("Updated! ✅");
});

// --- Callback: About ---
composer.callbackQuery("menu_about", async (ctx) => {
  const text =
    `ℹ️ <b>About This Bot</b>\n\n` +
    `This bot helps you track coins and referrals.\n` +
    `Built with Grammy.js & Prisma.\n\n` +
    `v1.0.0`;

  await ctx.editMessageText(text, {
    reply_markup: KEYBOARDS.back,
    parse_mode: "HTML",
  });
  await ctx.answerCallbackQuery();
});

export default composer;

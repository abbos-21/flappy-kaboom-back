import { Context } from "grammy";
import { prisma } from "../../lib/prisma.js";

export async function getOrCreateUser(ctx: Context) {
  const tgId = ctx.from?.id;
  if (!tgId) throw new Error("No user id");

  let user = await prisma.user.findUnique({
    where: { telegramId: BigInt(tgId) },
  });

  if (!user) {
    // New user processing
    let referredById: number | undefined = undefined;

    // Check for referral payload in /start command
    if (ctx.match && typeof ctx.match === "string") {
      const match = ctx.match.trim();
      if (match.startsWith("ref_")) {
        const refIdStr = match.replace("ref_", "");
        const refId = Number(refIdStr);

        if (!isNaN(refId) && refId > 0) {
          const referrer = await prisma.user.findUnique({
            where: { id: refId },
          });
          if (referrer) referredById = refId;
        }
      }
    }

    user = await prisma.user.create({
      data: {
        telegramId: BigInt(tgId),
        username: ctx.from?.username,
        firstName: ctx.from?.first_name ?? "Unknown",
        lastName: ctx.from?.last_name,
        referredById,
      },
    });

    // Reward referrer
    if (referredById) {
      await prisma.user.update({
        where: { id: referredById },
        data: { coins: { increment: 100 }, totalCoins: { increment: 100 } },
      });

      // Notify referrer
      try {
        // Need to convert BigInt to string for Telegram API
        const referrerUser = await prisma.user.findUnique({
          where: { id: referredById },
        });
        if (referrerUser) {
          await ctx.api.sendMessage(
            referrerUser.telegramId.toString(),
            "🎉 <b>New Referral!</b>\nSomeone joined using your link. You earned +100 coins!",
            { parse_mode: "HTML" },
          );
        }
      } catch (err) {
        console.error("Failed to notify referrer:", err);
      }
    }
  }

  return user;
}

// src/bot/handlers/user.ts
import { Context } from "grammy";
import { prisma } from "../../lib/prisma.js";

export async function getOrCreateUser(ctx: Context) {
  const tgId = ctx.from?.id;
  if (!tgId) throw new Error("No user id");

  let user = await prisma.user.findUnique({
    where: { telegramId: BigInt(tgId) },
  });

  if (!user) {
    // New user → check if came via referral
    let referredById: number | undefined = undefined;

    if (ctx.match && typeof ctx.match === "string") {
      const match = ctx.match.trim();

      // We support: /start ref_123  or just /start 123
      if (match.startsWith("ref_")) {
        const refIdStr = match.replace("ref_", "");
        const refId = Number(refIdStr);
        if (!isNaN(refId) && refId > 0) {
          // Check referrer exists
          const referrer = await prisma.user.findUnique({
            where: { id: refId },
          });
          if (referrer) {
            referredById = refId;
          }
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

    // Optional: reward the referrer
    if (referredById) {
      await prisma.user.update({
        where: { id: referredById },
        data: {
          coins: { increment: 100 }, // example reward
          totalCoins: { increment: 100 },
        },
      });

      // Notify referrer (optional but nice)
      try {
        await ctx.api.sendMessage(
          referredById.toString(), // telegramId is BigInt, but sendMessage accepts string
          "🎉 You have a new referral! +100 coins",
        );
      } catch (err) {
        console.log("Cannot notify referrer:", err);
      }
    }
  }

  return user;
}

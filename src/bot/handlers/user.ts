import { Context } from "grammy";
import { prisma } from "../../lib/prisma.js";

export async function getOrCreateUser(ctx: Context) {
  const tgId = ctx.from?.id;
  if (!tgId) throw new Error("No user id");

  // 1. Try to find the user
  let user = await prisma.user.findUnique({
    where: { telegramId: BigInt(tgId) },
  });

  // 2. If not found, create new user
  if (!user) {
    let referredById: number | undefined = undefined;

    // Check for referral (e.g., /start ref_1)
    if (ctx.match && typeof ctx.match === "string") {
      const match = ctx.match.trim();
      if (match.startsWith("ref_")) {
        const refIdStr = match.replace("ref_", "");
        const refId = Number(refIdStr);

        if (!isNaN(refId) && refId > 0) {
          // Verify referrer exists in DB
          const referrerUser = await prisma.user.findUnique({
            where: { id: refId },
          });
          if (referrerUser) {
            referredById = refId;
          }
        }
      }
    }

    // Create the user
    user = await prisma.user.create({
      data: {
        telegramId: BigInt(tgId),
        username: ctx.from?.username,
        firstName: ctx.from?.first_name ?? "Unknown",
        lastName: ctx.from?.last_name,
        referredById,
      },
    });

    // 3. Process Reward & Notification (The Fix)
    if (referredById) {
      // Fetch the referrer again to get their TELEGRAM ID
      const referrer = await prisma.user.findUnique({
        where: { id: referredById },
      });

      if (referrer) {
        // A. Give coins
        await prisma.user.update({
          where: { id: referrer.id },
          data: {
            coins: { increment: 100 },
            totalCoins: { increment: 100 },
          },
        });

        // B. Send Notification (Fixed: Use telegramId, not database id)
        try {
          await ctx.api.sendMessage(
            referrer.telegramId.toString(),
            "🎉 <b>New Referral!</b>\nSomeone joined using your link. You earned +100 coins!",
            { parse_mode: "HTML" },
          );
        } catch (err) {
          console.error(`Could not notify referrer ${referrer.id}:`, err);
          // We swallow the error here so the new user isn't affected
        }
      }
    }
  }

  return user;
}

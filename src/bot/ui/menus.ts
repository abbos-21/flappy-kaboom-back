import { InlineKeyboard } from "grammy";

export const KEYBOARDS = {
  main: new InlineKeyboard()
    .text("📊 My Stats", "menu_stats")
    .text("🎁 Referral Link", "menu_ref")
    .row()
    .text("🔄 Refresh", "menu_refresh") // New Feature: Refresh data
    .text("ℹ️ About", "menu_about"),

  back: new InlineKeyboard().text("🔙 Back to Menu", "menu_main"),
};

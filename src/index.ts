// main file (e.g. index.ts or app.ts)
import { startServer } from "./server.js";
import { startBot } from "./bot/index.js";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  console.log("Starting application...");

  try {
    await Promise.allSettled([
      startServer().then(() => console.log("Server → online")),
      startBot().then(() => console.log("Bot    → online")),
    ]);

    console.log("Application is running");
  } catch (err) {
    console.error("Critical startup error:", err);
    process.exit(1);
  }
}

bootstrap();

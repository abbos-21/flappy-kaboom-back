import { startServer } from "./server.js";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

(async () => {
  try {
    await startServer();
  } catch (error) {
    console.error("Failed to start the server: ", error);
    process.exit(1);
  }
})();

import { startServer } from "./server.js";
(async () => {
    try {
        await startServer();
    }
    catch (error) {
        console.error("Failed to start the server: ", error);
        process.exit(1);
    }
})();

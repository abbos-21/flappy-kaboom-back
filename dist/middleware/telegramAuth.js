import { validate } from "@tma.js/init-data-node";
import { BOT_TOKEN } from "../config/env.js";
export function telegramAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ message: "Missing Authorization header" });
    const [type, initData] = authHeader.split(" ");
    if (type !== "tma" || !initData)
        return res.status(401).json({ message: "Invalid auth type" });
    try {
        validate(initData, BOT_TOKEN);
        const params = new URLSearchParams(initData);
        const user = params.get("user");
        if (!user) {
            return res.status(401).json({ message: "Invalid initData user" });
        }
        req.tgUser = JSON.parse(user);
        next();
    }
    catch (err) {
        return res.status(403).json({ message: "Invalid Telegram signature" });
    }
}

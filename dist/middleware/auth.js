import { validate } from "@tma.js/init-data-node";
import { BOT_TOKEN } from "../config/env.js";
export const authMiddleware = (req, res, next) => {
    const [type, data] = (req.headers.authorization || "").split(" ");
    if (type !== "tma" || !data)
        return res.status(401).send("Unauthorized");
    try {
        validate(data, BOT_TOKEN);
        const urlParams = new URLSearchParams(data);
        req.user = JSON.parse(urlParams.get("user"));
        next();
    }
    catch (e) {
        res.status(403).send("Invalid Signature");
    }
};

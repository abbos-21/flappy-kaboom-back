import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
export function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ message: "Missing Authorization header" });
    const [type, token] = authHeader.split(" ");
    if (type !== "Bearer" || !token)
        return res.status(401).json({ message: "Invalid auth format" });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    }
    catch {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
}

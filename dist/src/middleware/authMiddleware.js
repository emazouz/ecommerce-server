"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticateJwt = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateJwt = async (req, res, next) => {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
        return res.status(401).json({
            success: false,
            error: "Access token is missing",
        });
    }
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET is not defined in environment variables");
        }
        const decoded = jsonwebtoken_1.default.verify(accessToken, secret);
        const userPayload = decoded;
        req.user = {
            userId: userPayload.userId,
            email: userPayload.email,
            role: userPayload.role,
        };
        next();
    }
    catch (error) {
        console.error("❌ JWT verification failed:", error);
        return res.status(401).json({
            success: false,
            error: "Invalid or expired access token",
        });
    }
};
exports.authenticateJwt = authenticateJwt;
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "ADMIN") {
        next();
    }
    else {
        res.status(403).json({
            success: false,
            error: "Access denied! Admin access required",
        });
    }
};
exports.isAdmin = isAdmin;

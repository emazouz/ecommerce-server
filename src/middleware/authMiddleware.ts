import { NextFunction, Response, Request } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

interface MyTokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authenticateJwt = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const accessToken = req.cookies.accessToken;
  console.log("📦 Access Token:", accessToken);

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

    const decoded = jwt.verify(accessToken, secret);
    const userPayload = decoded as MyTokenPayload;

    req.user = {
      userId: userPayload.userId,
      email: userPayload.email,
      role: userPayload.role,
    };

    next();
  } catch (error) {
    console.error("❌ JWT verification failed:", error);
    return res.status(401).json({
      success: false,
      error: "Invalid or expired access token",
    });
  }
};

import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { sendResetEmail } from "../utils/email";

// find user by email
const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

// generate tokens
const generateTokens = (userId: string, email: string, role: string) => {
  const accessToken = jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" } // access token expires in 7 days
  );
  const refreshToken = uuidv4();
  return { accessToken, refreshToken };
};

// update refresh token
const updateRefreshToken = async (
  userId: string,
  refreshToken: string | null
) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken },
  });
};

// set auth cookies
const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction ? true : false,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction ? true : false,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

// --- Controllers ---

// register user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, username, termsAgreed } = req.body;

    // 1. validate inputs
    if (!email || !password || !username) {
      res
        .status(400)
        .json({ success: false, message: "Please fill all required fields" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
      return;
    }

    if (!termsAgreed) {
      res.status(400).json({
        success: false,
        message: "You must agree to the terms and conditions",
      });
      return;
    }

    // 2. check if user exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res
        .status(409)
        .json({ success: false, message: "This email is already registered" }); // 409 Conflict
      return;
    }

    // 3. hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. create user in database
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        role: "USER",
        termsAgreed: true,
      },
    });

    // 5. remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res
      .status(500)
      .json({ success: false, message: "An unexpected error occurred" });
  }
};

// login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, rememberMe } = req.body;

    // 1. validate inputs
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Please enter your email and password",
      });
      return;
    }

    // 2. find user by email
    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      }); // 401 Unauthorized
      return;
    }

    // 3. check if password is valid
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // 4. generate tokens
    const { accessToken, refreshToken } = generateTokens(
      user.id,
      user.email,
      user.role
    );

    // 5. update refresh token and remember token if requested
    const updateData: any = { refreshToken };

    if (rememberMe) {
      const rememberTokenExpiresAt = new Date();
      rememberTokenExpiresAt.setDate(rememberTokenExpiresAt.getDate() + 30); // 30 days

      updateData.rememberToken = true;
      updateData.rememberTokenExpiresAt = rememberTokenExpiresAt;
    } else {
      updateData.rememberToken = false;
      updateData.rememberTokenExpiresAt = null;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // 6. set auth cookies with remember me duration if requested
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? ("strict" as const)
          : ("lax" as const),
      path: "/",
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 30 days if remember me, else 24 hours
    };

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    // 7. send successful response with user data (without sensitive information)
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        termsAgreed: user.termsAgreed,
        rememberToken: user.rememberToken,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res
      .status(500)
      .json({ success: false, message: "An unexpected error occurred" });
  }
};

// refresh access token
export const refreshAccessToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const refreshToken = req.cookies.refreshToken;

  // 1. check if refresh token is provided
  if (!refreshToken) {
    res.status(401).json({
      success: false,
      message: "Access denied. Refresh token is not provided",
    });
    return;
  }

  try {
    // 2. find user by refresh token
    const user = await prisma.user.findFirst({
      where: { refreshToken },
    });

    if (!user) {
      // if refresh token is provided but is invalid (maybe it was already used or stolen)
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      res
        .status(403)
        .json({ success: false, message: "Refresh token is invalid" }); // 403 Forbidden
      return;
    }

    // 3. generate new tokens (with refresh token rotation)
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user.id,
      user.email,
      user.role
    );

    // 4. update refresh token in database
    await updateRefreshToken(user.id, newRefreshToken);

    setAuthCookies(res, accessToken, newRefreshToken);

    res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      accessToken, // can send new access token in response if needed
    });
  } catch (error) {
    console.error("Error refreshing access token:", error);
    res
      .status(500)
      .json({ success: false, message: "An unexpected error occurred" });
  }
};

// logout user
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    // 1. invalidate refresh token in database if it exists
    if (refreshToken) {
      const user = await prisma.user.findFirst({ where: { refreshToken } });
      if (user) {
        await updateRefreshToken(user.id, null);
      }
    }

    // 2. clear auth cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.error("Error logging out:", error);
    res
      .status(500)
      .json({ success: false, message: "An unexpected error occurred" });
  }
};

//  change password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // 1. check if token is provided
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };

    // 2. find user by id
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 3. check if old password is correct
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect old password" });
    }

    // 4. check if new password is valid
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    // 5. hash new password and update user password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Error changing password:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// forgot password
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    // 1. Validate email
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: "Invalid email format" });
      return;
    }

    // 2. find user by email
    const user = await findUserByEmail(email);
    if (!user) {
      // For security reasons, don't reveal if the email exists or not
      res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset link will be sent.",
      });
      return;
    }

    const newToken = uuidv4();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // 3. update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: newToken,
        resetTokenExpiresAt: expiresAt,
      },
    });

    // 4. send reset email
    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${newToken}`;
    try {
      await sendResetEmail(email, resetLink);
      res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset link will be sent.",
      });
    } catch (emailError) {
      // If email fails, clean up the reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: null,
          resetTokenExpiresAt: null,
        },
      });
      console.error("Error sending reset email:", emailError);
      res.status(500).json({
        success: false,
        message:
          "Failed to send reset email. Please try again later or contact support.",
      });
    }
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};

// reset password
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    // 1. find user by reset token
    const user = await prisma.user.findFirst({
      where: { resetToken: token },
    });

    if (!user) {
      res
        .status(404)
        .json({ success: false, message: "Invalid or expired token" });
      return;
    }

    // 2. check if reset token is expired
    if (user.resetTokenExpiresAt && user.resetTokenExpiresAt < new Date()) {
      res.status(400).json({ success: false, message: "Reset token expired" });
      return;
    }

    // 3. hash new password and update user password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    // 4. clear reset token and reset token expires at
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
  }
};

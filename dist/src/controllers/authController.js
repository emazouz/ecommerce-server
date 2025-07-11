"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailChange = exports.requestEmailChange = exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.logout = exports.refreshAccessToken = exports.login = exports.register = void 0;
const prisma_1 = require("../utils/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const email_1 = require("../utils/email");
const resetPassword_1 = require("../email/resetPassword");
const emailVerification_1 = require("../email/emailVerification");
// find user by email
const findUserByEmail = async (email) => {
    return prisma_1.prisma.user.findUnique({
        where: { email },
    });
};
// generate tokens
const generateTokens = (userId, email, role) => {
    const accessToken = jsonwebtoken_1.default.sign({ userId, email, role }, process.env.JWT_SECRET, { expiresIn: "7d" } // access token expires in 7 days
    );
    const refreshToken = (0, uuid_1.v4)();
    return { accessToken, refreshToken };
};
// update refresh token
const updateRefreshToken = async (userId, refreshToken) => {
    await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { refreshToken },
    });
};
// set auth cookies
const setAuthCookies = (res, accessToken, refreshToken) => {
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
const register = async (req, res) => {
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
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // 4. create user in database
        const user = await prisma_1.prisma.user.create({
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
    }
    catch (error) {
        console.error("Error registering user:", error);
        res
            .status(500)
            .json({ success: false, message: "An unexpected error occurred" });
    }
};
exports.register = register;
// login user
const login = async (req, res) => {
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
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }
        // 4. generate tokens
        const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
        // 5. update refresh token and remember token if requested
        const updateData = { refreshToken };
        if (rememberMe) {
            const rememberTokenExpiresAt = new Date();
            rememberTokenExpiresAt.setDate(rememberTokenExpiresAt.getDate() + 30); // 30 days
            updateData.rememberToken = true;
            updateData.rememberTokenExpiresAt = rememberTokenExpiresAt;
        }
        else {
            updateData.rememberToken = false;
            updateData.rememberTokenExpiresAt = null;
        }
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: updateData,
        });
        // 6. set auth cookies with remember me duration if requested
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production"
                ? "strict"
                : "lax",
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
    }
    catch (error) {
        console.error("Error logging in:", error);
        res
            .status(500)
            .json({ success: false, message: "An unexpected error occurred" });
    }
};
exports.login = login;
// refresh access token
const refreshAccessToken = async (req, res) => {
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
        const user = await prisma_1.prisma.user.findFirst({
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
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.email, user.role);
        // 4. update refresh token in database
        await updateRefreshToken(user.id, newRefreshToken);
        setAuthCookies(res, accessToken, newRefreshToken);
        res.status(200).json({
            success: true,
            message: "Access token refreshed successfully",
            accessToken, // can send new access token in response if needed
        });
    }
    catch (error) {
        console.error("Error refreshing access token:", error);
        res
            .status(500)
            .json({ success: false, message: "An unexpected error occurred" });
    }
};
exports.refreshAccessToken = refreshAccessToken;
// logout user
const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        // 1. invalidate refresh token in database if it exists
        if (refreshToken) {
            const user = await prisma_1.prisma.user.findFirst({ where: { refreshToken } });
            if (user) {
                await updateRefreshToken(user.id, null);
            }
        }
        // 2. clear auth cookies
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        res.status(200).json({ success: true, message: "Logout successful" });
    }
    catch (error) {
        console.error("Error logging out:", error);
        res
            .status(500)
            .json({ success: false, message: "An unexpected error occurred" });
    }
};
exports.logout = logout;
//  change password
const changePassword = async (req, res) => {
    try {
        const userId = req.user?.userId;
        // The middleware should ensure the user is authenticated, but this is a safeguard.
        if (!userId) {
            return res
                .status(401)
                .json({ success: false, message: "User not authenticated" });
        }
        const { oldPassword, newPassword } = req.body;
        // 1. Validate inputs
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Old password and new password are required",
            });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters",
            });
        }
        // 2. Find user by id
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
        });
        // This should not happen if the token is valid, but it's a good check.
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        // 3. Check if old password is correct
        const isMatch = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isMatch) {
            return res
                .status(400)
                .json({ success: false, message: "Incorrect old password" });
        }
        // 4. Hash new password and update user password
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });
        return res
            .status(200)
            .json({ success: true, message: "Password changed successfully" });
    }
    catch (err) {
        console.error("Error changing password:", err);
        // Handle potential JWT errors explicitly
        if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
};
exports.changePassword = changePassword;
// forgot password
const forgotPassword = async (req, res) => {
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
                message: "If an account exists with this email, a password reset link will be sent.",
            });
            return;
        }
        const newToken = (0, uuid_1.v4)();
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
        // 3. update user with reset token
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: newToken,
                resetTokenExpiresAt: expiresAt,
            },
        });
        // 4. send reset email
        const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${newToken}`;
        try {
            await (0, email_1.sendResetEmail)(email, (0, resetPassword_1.resetPasswordMessage)(resetLink));
            res.status(200).json({
                success: true,
                message: "If an account exists with this email, a password reset link will be sent.",
            });
        }
        catch (emailError) {
            // If email fails, clean up the reset token
            await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    resetToken: null,
                    resetTokenExpiresAt: null,
                },
            });
            console.error("Error sending reset email:", emailError);
            res.status(500).json({
                success: false,
                message: "Failed to send reset email. Please try again later or contact support.",
            });
        }
    }
    catch (error) {
        console.error("Error in forgot password:", error);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again later.",
        });
    }
};
exports.forgotPassword = forgotPassword;
// reset password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        // 1. find user by reset token
        const user = await prisma_1.prisma.user.findFirst({
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
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        // 4. clear reset token and reset token expires at
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });
        res
            .status(200)
            .json({ success: true, message: "Password reset successfully" });
    }
    catch (error) {
        console.error("Error resetting password:", error);
    }
};
exports.resetPassword = resetPassword;
// request email change
const requestEmailChange = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res
                .status(401)
                .json({ success: false, message: "User not authenticated" });
        }
        const { newEmail, currentPassword } = req.body;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!newEmail || !currentPassword) {
            return res.status(400).json({
                success: false,
                message: "Invalid request",
            });
        }
        if (!newEmail.includes("@") || !newEmail.includes(".")) {
            return res.status(400).json({
                success: false,
                message: "Invalid email address",
            });
        }
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        console.log(newEmail, user.email);
        if (newEmail === user.email) {
            return res.status(400).json({
                success: false,
                message: "New email cannot be the same as the current email",
            });
        }
        // 1. check to existing email
        const existingEmail = await prisma_1.prisma.user.findUnique({
            where: { email: newEmail },
        });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: "Email already in use",
            });
        }
        // 3. check if password is valid
        const isPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid password",
            });
        }
        // generate code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
        console.log(`Generated code for ${newEmail}: ${code}`);
        const verificationRecord = await prisma_1.prisma.emailVerification.upsert({
            where: { userId },
            update: {
                newEmail,
                code,
                expiresAt,
            },
            create: {
                userId,
                newEmail,
                code,
                expiresAt,
            },
        });
        console.log("Upserted verification record:", verificationRecord);
        try {
            await (0, email_1.sendResetEmail)(newEmail, (0, emailVerification_1.emailVerificationMessage)(code));
            res.status(200).json({
                success: true,
                message: "A verification code has been sent to your new email address.",
            });
        }
        catch (err) {
            console.error("Error sending email:", err);
            res.status(500).json({
                success: false,
                message: "Failed to send email verification code",
            });
        }
    }
    catch (err) {
        console.error("Error requesting email change:", err);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred",
        });
    }
};
exports.requestEmailChange = requestEmailChange;
// verify email change
const verifyEmailChange = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Verification code is required",
            });
        }
        const emailVerification = await prisma_1.prisma.emailVerification.findUnique({
            where: { code },
        });
        if (!emailVerification) {
            return res.status(404).json({
                success: false,
                message: "Invalid verification code",
            });
        }
        if (emailVerification.expiresAt < new Date()) {
            console.log("3. Verification code has expired.");
            // Clean up expired token
            await prisma_1.prisma.emailVerification.delete({
                where: { id: emailVerification.id },
            });
            return res.status(400).json({
                success: false,
                message: "Verification code expired",
            });
        }
        // Use a transaction to update user and delete verification record
        await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Update the user's email
            await tx.user.update({
                where: { id: emailVerification.userId },
                data: { email: emailVerification.newEmail },
            });
            // 2. Delete the verification record
            await tx.emailVerification.delete({
                where: { id: emailVerification.id },
            });
        });
        console.log("6. Transaction completed. Sending success response.");
        return res.status(200).json({
            success: true,
            message: "Email updated successfully",
        });
    }
    catch (err) {
        console.error("7. Error verifying email change:", err);
        res.status(500).json({
            success: false,
            message: "An unexpected error occurred",
        });
    }
};
exports.verifyEmailChange = verifyEmailChange;
// // update user information
// // username and avatar and gender and birthDate
// // address and phone and fullName
// export const updateUserInformation = async (
//   req: AuthenticatedRequest,
//   res: Response
// ) => {
//   try {
//     const userId = req.user?.userId;
//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         message: "User not authenticated",
//       });
//     }
//     const { username, gender, birthDate } = req.body;
//     const updateData: {
//       username?: string;
//       avatar?: string;
//       gender?: "MEN" | "WOMEN" | "UNISEX";
//       birthDate?: Date;
//     } = {};
//     if (username) {
//       updateData.username = username;
//     }
//     // The avatar URL is now in req.file.path thanks to multer-storage-cloudinary
//     if (req.file) {
//       updateData.avatar = req.file.path;
//     }
//     if (gender) {
//       if (!["MEN", "WOMEN", "UNISEX"].includes(gender)) {
//         return res
//           .status(400)
//           .json({ success: false, message: "Invalid gender value." });
//       }
//       updateData.gender = gender;
//     }
//     if (birthDate) {
//       updateData.birthDate = new Date(birthDate);
//     }
//     if (Object.keys(updateData).length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No fields to update.",
//       });
//     }
//     const updatedUser = await prisma.user.update({
//       where: { id: userId },
//       data: updateData,
//     });
//     return res.status(200).json({
//       success: true,
//       message: "User information updated successfully",
//       user: updatedUser,
//     });
//   } catch (err) {
//     console.error("Error updating user information:", err);
//     return res.status(500).json({
//       success: false,
//       message: "An unexpected error occurred.",
//     });
//   }
// };

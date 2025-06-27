import { Request, Response } from "express";
import { prisma } from "../server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

// دالة للتحقق من وجود مستخدم بنفس البريد الإلكتروني
const existingUser = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  return user;
};

// دالة لإنشاء رموز الوصول والتحديث
const generateToken = (UserId: string, email: string, role: string) => {
  const accessToken = jwt.sign(
    { UserId, email, role },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" } // صلاحية رمز الوصول: ساعة واحدة
  );

  const refreshToken = uuidv4(); // إنشاء رمز تحديث فريد

  return { accessToken, refreshToken };
};

// دالة لتحديث رمز التحديث في قاعدة البيانات للمستخدم
const updateRefreshToken = async (userId: string, refreshToken: string) => {
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      refreshToken: refreshToken,
    },
  });
};

// دالة لتعيين رموز الوصول والتحديث في ملفات تعريف الارتباط (cookies)
const setToken = (res: Response, accessToken: string, refreshToken: string) => {
  // تعيين رمز الوصول
  res.cookie("accessToken", accessToken, {
    httpOnly: true, // لا يمكن الوصول إليه من خلال JavaScript من جانب العميل
    secure: process.env.NODE_ENV === "production", // استخدم HTTPS في بيئة الإنتاج
    maxAge: 1000 * 60 * 60, // صلاحية: ساعة واحدة
  });
  // تعيين رمز التحديث
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000, // صلاحية: 7 أيام
  });
};

// دالة تسجيل مستخدم جديد
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    const userExists = await existingUser(email);

    // التحقق مما إذا كان المستخدم موجودًا بالفعل
    if (userExists) {
      res.status(400).json({
        success: false,
        message: "المستخدم موجود بالفعل",
      });
      return;
    }

    // تشفير كلمة المرور
    const hashPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashPassword,
        name,
        role: "USER",
      },
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء المستخدم بنجاح",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "خطأ داخلي في الخادم",
    });
  }
};

// دالة تسجيل دخول المستخدم
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await existingUser(email);

    // التحقق من وجود المستخدم
    if (!user) {
      res.status(400).json({
        success: false,
        error: "المستخدم غير موجود",
      });
      return;
    }

    // التحقق من صحة كلمة المرور
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(400).json({
        success: false,
        error: "كلمة المرور غير صحيحة",
      });
      return;
    }

    // إنشاء رموز الدخول
    const { accessToken, refreshToken } = generateToken(
      user.id,
      user.email,
      user.role
    );

    // تحديث رمز التحديث في قاعدة البيانات
    await updateRefreshToken(user.id, refreshToken);

    // تعيين الرموز في ملفات تعريف الارتباط
    setToken(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "خطأ داخلي في الخادم",
    });
  }
};

// دالة تحديث رمز الوصول باستخدام رمز التحديث
export const refreshAccessToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  // الحصول على رمز التحديث من ملفات تعريف الارتباط
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    res.status(401).json({
      success: false,
      error: "رمز التحديث غير موجود",
    });
    return;
  }

  try {
    // البحث عن مستخدم برمز التحديث المطابق
    const user = await prisma.user.findFirst({
      where: {
        refreshToken: refreshToken,
      },
    });

    // إذا لم يتم العثور على مستخدم، يكون الرمز غير صالح
    if (!user) {
      res.status(401).json({
        success: false,
        error: "رمز التحديث غير صالح",
      });
      return;
    }

    // إنشاء رموز جديدة
    const { accessToken, refreshToken: newRefreshToken } = generateToken(
      user.id,
      user.email,
      user.role
    );

    // تحديث رمز التحديث في قاعدة البيانات
    await updateRefreshToken(user.id, newRefreshToken);

    // تعيين الرموز الجديدة في ملفات تعريف الارتباط
    setToken(res, accessToken, newRefreshToken);

    res.status(200).json({
      success: true,
      message: "تم تحديث رمز الوصول بنجاح",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "خطأ داخلي في الخادم",
    });
  }
};

// دالة تسجيل الخروج
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // مسح ملفات تعريف الارتباط
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "تم تسجيل الخروج بنجاح",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "خطأ داخلي في الخادم",
    });
  }
};

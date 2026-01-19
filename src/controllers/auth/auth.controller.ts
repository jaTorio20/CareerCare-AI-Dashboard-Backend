import { Request, Response, NextFunction } from "express";
import { User } from "../../models/User";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "../../utils/getJwtSecret";
import { generateToken } from "../../utils/generateToken";
import crypto from "crypto";
import { sendVerificationEmail } from "../../services/auth/sendOtp.service";
import jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";
import {
  RegisterUserBody,
  ResendOtpBody,
  VerifyOtpBody,
  ForgotPasswordBody,
  ResetPasswordParams,
  ResetPasswordBody,
  LoginUserBody,
} from "../../routes/auth/auth.schema";

interface ResetPayload extends JwtPayload {
  userId: string;
}

// @route     POST /auth/register
// @description Register new user
export const register = async (
  req: Request<any, any, RegisterUserBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isVerified) {
        return res.status(200).json({
          message: "Account already exists but not verified. Please verify your email.",
          needsVerification: true,
        });
      }
      return res.status(409).json({ message: "User already exists" });
    }

    // Create user with isVerified = false
    const otp = crypto.randomInt(100000, 999999).toString();
    const user = await User.create({
      email,
      isVerified: false,
      otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send OTP via email
    await sendVerificationEmail({
      to: user.email,
      subject: "Verify your account",
      html: `
        <p>Your OTP is <strong>${otp}</strong> valid only for 10 minutes.</p>
        <p>Or click here to verify: 
          <a href="${process.env.FRONTEND_URL}/verify?email=${encodeURIComponent(user.email)}">
            Verify Account
          </a>
        </p>`,
    });

    res.status(201).json({
      message: "Registration successful. Please verify your email with the OTP sent.",
    });
  } catch (err) {
    next(err);
  }
};

// @route     POST /auth/resend-otp
// @description Resend OTP to unverified user
export const resendOtp = async (
  req: Request<any, any, ResendOtpBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user || user.isVerified) {
      // Security: generic response to avoid account enumeration
      return res.status(200).json({ message: "An OTP has been sent." });
    }

    // Optional: rate-limit resend
    if (user.lastOtpSentAt && Date.now() - user.lastOtpSentAt.getTime() < 60 * 1000) {
      return res.status(429).json({
        message: "Please wait before requesting another OTP",
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.lastOtpSentAt = new Date();
    await user.save();

    const baseUrl = `${process.env.FRONTEND_URL}/verify?email=${encodeURIComponent(user.email)}`;

    await sendVerificationEmail({
      to: user.email,
      subject: "Verify your account",
      html: `
        <p>Your OTP is <strong>${otp}</strong> valid only for 10 minutes</p>
        <p>Or click here to verify: 
          <a href="${baseUrl}">
            Verify Account
          </a>
        </p>`,
    });

    res.status(200).json({ message: "New OTP has been sent to your email." });
  } catch (err) {
    next(err);
  }
};

// @route     POST /auth/verify
// @description Verify OTP and complete registration
export const verifyOtp = async (
  req: Request<any, any, VerifyOtpBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, name, password, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isVerified) {
      return res.status(409).json({ message: "User already verified" });
    }

    // Normalize OTP before comparing
    const cleanOtp = otp?.trim();

    if (user.otp !== cleanOtp || !user.otpExpires || Date.now() > user.otpExpires.getTime()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark verified
    user.name = name;
    user.password = password;
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.lastOtpSentAt = undefined;
    await user.save();

    // Create Tokens
    const payload = { userId: user._id.toString() };
    const accessToken = await generateToken(payload, "15m");
    const refreshToken = await generateToken(payload, "30d");

    // Set refresh token in HTTP-Only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route     POST /auth/forgot-password
// @description Send password reset email
export const forgotPassword = async (
  req: Request<any, any, ForgotPasswordBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: "A reset link has been sent to your email." });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        message: "Account is not verified. Please verify before resetting password.",
      });
    }

    // Only verified users reach this point
    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, {
      expiresIn: "15m",
    });

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await sendVerificationEmail({
      to: user.email,
      subject: "Password Reset",
      html: `<p>Click <a href="${resetURL}">here</a> to reset your password. This link expires in 15 minutes.</p>`,
    });

    return res.status(200).json({ message: "Password reset email sent." });
  } catch (err) {
    next(err);
  }
};

// @route     GET /auth/reset-password/:token
// @description Validate reset token
export const validateResetToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { token } = req.params;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as ResetPayload;
    return res.status(200).json({ valid: true, userId: payload.userId, token });
  } catch (err) {
    next(err);
  }
};

// @route     POST /auth/reset-password/:token
// @description Reset password with token
export const resetPassword = async (
  req: Request<ResetPasswordParams, any, ResetPasswordBody>,
  res: Response,
  next: NextFunction
) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as ResetPayload;
    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Assign plain password, pre-save hook will hash it
    user.password = password;
    await user.save();

    return res.status(200).json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    next(err);
  }
};

// @route     POST /auth/login
// @description Authenticate user
export const login = async (
  req: Request<any, any, LoginUserBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    // Block unverified accounts
    if (!user.isVerified) {
      return res.status(401).json({
        message: "Account is not yet verified. Please check your email for OTP",
      });
    }

    // Google-only account (no password set)
    if (!user.password) {
      return res.status(400).json({
        message:
          "This account uses Google Sign-In. Please log in with Google. Or click forgot password.",
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    // Create Tokens
    const payload = { userId: user._id.toString() };
    const accessToken = await generateToken(payload, "15m");
    const refreshToken = await generateToken(payload, "30d");

    // Set refresh token in HTTP-Only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route     POST /auth/logout
// @description Logout user and clear refresh token
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  res.status(200).json({ message: "Logged out successfully!" });
};

// @route     POST /auth/refresh
// @description Generate new access token from refresh token
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;
    if (process.env.NODE_ENV === "development") {
      console.log("Refreshing token...");
    }

    if (!token) {
      res.status(401);
      return res.status(401).json({ message: "No refresh token" });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const newAccessToken = await generateToken({ userId: user._id.toString() }, "15m");

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    next(err);
  }
};

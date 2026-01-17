import express from "express";
import passport from "passport";
import { validate } from "../../middleware/validate";

// Rate Limiters
import {
  verifyOtpLimiter,
  forgotPasswordOtpLimiter,
  loginOtpLimiter,
  registerLimiter,
} from "../../middleware/rateLimit";

// Controllers - Full Stack Auth
import {
  register,
  resendOtp,
  verifyOtp,
  forgotPassword,
  validateResetToken,
  resetPassword,
  login,
  logout,
  refreshToken,
} from "../../controllers/auth/auth.controller";

// Controllers - Google OAuth
import {
  googleAuth,
  googleCallback,
} from "../../controllers/auth/googleOAuth.controller";

// Schemas
import {
  registerUserSchema,
  resendOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  loginUserSchema,
} from "./auth.schema";

const router = express.Router();

// ============================================
// FULL STACK AUTH ROUTES (/api/auth)
// ============================================

// @route          POST /api/auth/register
// @description    Register new user
// @access         Public
router.post("/register", registerLimiter, validate(registerUserSchema), register);

// @route          POST /api/auth/resend-otp
// @description    Resend OTP to unverified user
// @access         Public
router.post("/resend-otp", validate(resendOtpSchema), resendOtp);

// @route          POST /api/auth/verify
// @description    Verify OTP and complete registration
// @access         Public
router.post("/verify", verifyOtpLimiter, validate(verifyOtpSchema), verifyOtp);

// @route          POST /api/auth/forgot-password
// @description    Send password reset email
// @access         Public
router.post("/forgot-password", forgotPasswordOtpLimiter, validate(forgotPasswordSchema), forgotPassword);

// @route          GET /api/auth/reset-password/:token
// @description    Validate reset token
// @access         Public
router.get("/reset-password/:token", validateResetToken);

// @route          POST /api/auth/reset-password/:token
// @description    Reset password with token
// @access         Public
router.post("/reset-password/:token", validate(resetPasswordSchema), resetPassword);

// @route          POST /api/auth/login
// @description    Authenticate user
// @access         Public
router.post("/login", loginOtpLimiter, validate(loginUserSchema), login);

// @route          POST /api/auth/logout
// @description    Logout user and clear refresh token
// @access         Private
router.post("/logout", logout);

// @route          POST /api/auth/refresh
// @description    Generate new access token from refresh token
// @access         Public (Needs valid refresh token in cookie)
router.post("/refresh", refreshToken);

// ============================================
// GOOGLE OAUTH ROUTES (/api/auth)
// ============================================

// @route          GET /api/auth/google
// @description    Initiate Google OAuth flow
// @access         Public
router.get("/google", googleAuth);

// @route          GET /api/auth/google/callback
// @description    Handle Google OAuth callback
// @access         Public
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  googleCallback
);

export default router;
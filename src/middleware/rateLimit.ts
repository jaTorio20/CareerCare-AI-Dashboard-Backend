import rateLimit from "express-rate-limit";

// Limit to 5 verification attempts per IP every 15 minutes
export const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many verification attempts. Please try again later."
  },
});

export const forgotPasswordOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many email sent. Please try again later."
  },
});

export const loginOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again later."
  },
});

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 4,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many registration attempts from this IP. Please try again later."
  },
});

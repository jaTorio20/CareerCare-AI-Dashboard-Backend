import { z } from "zod";
import sanitizeHtml from "sanitize-html";

// Helper function to sanitize strings from HTML/XSS
export const sanitizeString = (value: string): string => {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
};

// Registration schema
export const registerUserSchema = z.object({
  body: z.object({
    email: z.email({ error: "Invalid email address" }).transform(sanitizeString),
  }),
});

// Resent OTP
export const resendOtpSchema = z.object({
  body: z.object({
    email: z.email({ error: "A valid email is required" }),
  }),
});

// Verify OTP
export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.email({ error: "A valid email is required" }),
    name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must not exceed 100 characters")
    .transform(sanitizeString),
    password: z.string().min(8, { error: "Password must be at least 8 characters" })
    .max(128, { error: "Password must not exceed 128 characters" }),
    otp: z.string().min(6, "OTP is required").max(6, "OTP must be 6 digits"),
  }),
});

// Forgot password
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.email({ error: "A valid email is required" }),
  }),
});

//  Reset password
export const resetPasswordSchema = z.object({
  params: z.object({
    token: z.string().min(1, {error: "Token is required"}),
  }),
  body: z.object({
    password: z.string()
    .min(8, { error: "Password must be at least 8 characters" })
    .max(128, { error: "Password must not exceed 128 characters" }),
  }),
});

// Login schema
export const loginUserSchema = z.object({
  body: z.object({
    email: z.email({ error: "Invalid email address" }).transform(sanitizeString),
    password: z.string().min(1, { error: "Password is required" }),
  }),
});

// Update profile schema
export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1, { error: "Name is required" }).transform(sanitizeString).optional(),
    email: z.email().transform(sanitizeString).optional(),
    password: z.string()
    .min(8, { error: "Password must be at least 8 characters" })
    .max(128, { error: "Password must not exceed 128 characters" })
    .optional(),
    avatarUrl: z.url({ error: "Invalid URL" }).optional(),
  }),
});

// Infer TypeScript types
export type RegisterUserBody = z.infer<typeof registerUserSchema>["body"];
export type ResendOtpBody = z.infer<typeof resendOtpSchema>["body"];
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>["body"];
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>["body"];
export type ResetPasswordParams = z.infer<typeof resetPasswordSchema>["params"];
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>["body"];
export type LoginUserBody = z.infer<typeof loginUserSchema>["body"];

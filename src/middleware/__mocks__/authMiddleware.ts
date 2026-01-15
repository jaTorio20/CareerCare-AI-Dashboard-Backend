import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { UserDocument } from "../../models/User";

export const mockUserId = new mongoose.Types.ObjectId();

export const createMockUser = (overrides?: Partial<UserDocument>): UserDocument => ({
  _id: new mongoose.Types.ObjectId(),
  name: "Mock User",
  email: "mock@example.com",
  role: "user",
  matchPassword: async (_: string) => true,
  ...(overrides || {}),
} as UserDocument);

//  toggle for test control
let shouldAuthenticate = true;

export const setAuthBehavior = (value: boolean) => {
  shouldAuthenticate = value;
};

export const protect = jest.fn(async (req: Request, res: Response, next: NextFunction) => {
  if (!shouldAuthenticate) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = createMockUser({ _id: mockUserId });
  next();
});

export const adminOnly = jest.fn((req: Request, res: Response, next: NextFunction) => {
  req.user = req.user || createMockUser({ role: "admin" });
  next();
});

import { jwtVerify } from "jose";
import dotenv from 'dotenv';
dotenv.config();
import { User } from "../models/User";
import { JWT_SECRET } from "../utils/getJwtSecret";
import { Request, Response, NextFunction } from "express";

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')){
      res.status(401);
      throw new Error('Not authorized, no token');
    }

    const token = authHeader.split(' ')[1];
    // since it's an accesToken, it extracts the token to get the userId
    const { payload } = await jwtVerify(token, JWT_SECRET);
    //it finds the userId by here
    const user = await User.findById(payload.userId).select('_id name email role');

    if(!user){
      res.status(401);
      throw new Error('User not found');
    };

    req.user = user;
    next();
  } catch (err) {
    // console.error(err);
    res.status(401);
    next(new Error('Not authorized, token failed'));
  }
}

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403);
    throw new Error("Admin access required");
  }
  next();
};
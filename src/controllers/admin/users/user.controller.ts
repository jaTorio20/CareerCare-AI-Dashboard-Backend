import { Request, Response, NextFunction } from "express";
import { User } from "../../../models/User";
import { createResponse } from "../../../utils/response.util";

// Get dashboard stats using aggregation
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: [{ $eq: ["$isActive", true] }, 1, 0]
            }
          }
        }
      }
    ]);

    const { totalUsers = 0, activeUsers = 0 } = stats[0] || {};

    res.json(
      createResponse(true, {
        totalUsers,
        activeUsers
      })
    );
  } catch (err) {
    next(err);
  }
};


// Updated getAllUsers with pagination and optimization
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const result = await User.aggregate([
      {
        $facet: {
          users: [
            { $skip: (Number(page) - 1) * Number(limit) },
            { $limit: Number(limit) },
            { $project: { password: 0 } } 
          ],
          totalCount: [{ $count: "count" }]
        }
      }
    ]);

    const users = result[0].users;
    const totalUsers = result[0].totalCount[0]?.count || 0;

    res.json(
      createResponse(true, {
        users,
        totalUsers,
        page: Number(page),
        totalPages: Math.ceil(totalUsers / Number(limit))
      })
    );
  } catch (err) {
    next(err);
  }
};


// Delete a user
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json(createResponse(false, null, "User not found"));
    }
    res.json(createResponse(true, null, "User deleted successfully"));
  } catch (err) {
    next(err);
  }
};

// Update user activity status
export const updateUserActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json(createResponse(false, null, "Invalid isActive value"));
    }

    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });

    if (!user) {
      return res.status(404).json(createResponse(false, null, "User not found"));
    }

    res.json(createResponse(true, user, "User activity status updated successfully"));
  } catch (err) {
    next(err);
  }
};
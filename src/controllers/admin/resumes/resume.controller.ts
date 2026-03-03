import { Request, Response, NextFunction } from "express";
import { StatisticsModel } from "../../../models/Statistics";
import { createResponse } from "../../../utils/response.util";

// Fetch total number of analyzed resumes from Statistics model
export const getAnalyzedResumesCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statistics = await StatisticsModel.findOne();

    if (!statistics) {
      return res.status(404).json(createResponse(false, null, "Statistics not found"));
    }

    res.json(
      createResponse(true, {
        analyzedResumesCount: statistics.analyzedResumesCount
      })
    );
  } catch (err) {
    next(err);
  }
};
import { Request, Response, NextFunction } from "express";
import { StatisticsModel } from "../../../models/Statistics";
import { createResponse } from "../../../utils/response.util";

// Fetch total number of generated cover letters from Statistics model
export const getGeneratedCoverLettersCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statistics = await StatisticsModel.findOne();

    if (!statistics) {
      return res.status(404).json(createResponse(false, null, "Statistics not found"));
    }

    res.json(
      createResponse(true, {
        generatedCoverLettersCount: statistics.generatedCoverLettersCount
      })
    );
  } catch (err) {
    next(err);
  }
};
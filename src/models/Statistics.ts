import mongoose, { Schema, InferSchemaType } from "mongoose";

const StatisticsSchema = new Schema(
  {
    analyzedResumesCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    // analyzedCoverLettersCount: {
    //   type: Number,
    //   required: true,
    //   default: 0,
    //   min: 0,
    // },
    // other metrics here as needed
  },
  {
    timestamps: true,
  }
);

export type Statistics = InferSchemaType<typeof StatisticsSchema>;

export const StatisticsModel =
  mongoose.models.Statistics || mongoose.model<Statistics>("Statistics", StatisticsSchema);
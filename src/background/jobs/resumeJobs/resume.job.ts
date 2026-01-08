import { parseFile } from "../../../services/fileService";
import { analyzeResume } from "../../../services/aiService";
import { ResumeModel } from "../../../models/Resume";
import { v2 as cloudinary } from "cloudinary";

export async function handleResumeAnalysisJob(data: any) {
  const { resumeId, fileBuffer, mimetype, } = data;

  const resume = await ResumeModel.findById(resumeId);

  if (!resume || !resume.isTemp) return;

  const buffer = Buffer.from(fileBuffer, "base64");

  try {
      // Parse resume
    const resumeText = await parseFile({
      buffer,
      mimetype,
      originalname: resume.originalName,
    });

    // AI analysis
    const analysis = await analyzeResume(resumeText, resume.jobDescription);
    resume.analysis = analysis;
    await resume.save();
  } catch (err: any) {
    // delete Cloudinary file immediately
    const tempResume = await ResumeModel.findById(resumeId);
    if (tempResume?.publicId) {
      await cloudinary.uploader.destroy(tempResume.publicId, { resource_type: "raw" });
      await tempResume.deleteOne();
    }   

  }
}

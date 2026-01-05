import { parseFile } from "../../../services/fileService";
import { analyzeResume } from "../../../services/aiService";
import { ResumeModel } from "../../../models/Resume";

export async function handleResumeAnalysisJob(data: any) {
  const {
    userId,
    fileBuffer,
    mimetype,
    originalName,
    cloudinary,
    jobDescription,
  } = data;

  const buffer = Buffer.from(fileBuffer, "base64");

  // Parse resume
  const resumeText = await parseFile({
    buffer,
    mimetype,
    originalname: originalName,
  });

  // AI analysis
  const analysis = await analyzeResume(resumeText, jobDescription);

  // Save TEMP record
  await ResumeModel.create({
    userId,
    resumeFile: cloudinary.url,
    publicId: cloudinary.publicId,
    originalName,
    jobDescription,
    analysis,
    isTemp: true,
  });
}

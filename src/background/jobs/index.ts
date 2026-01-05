import { handleResumeAnalysisJob } from "./resumeJobs/resume.job"

export const jobHandlers: Record<string, (data: any) => Promise<void>> = {
  "resume-analysis": handleResumeAnalysisJob,
};

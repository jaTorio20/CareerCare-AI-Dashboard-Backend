import { handleResumeAnalysisJob } from "./resumeJobs/resume.job"
import { handleReminderJob } from "./jobApplication/reminder.job"

export const jobHandlers: Record<string, (data: any) => Promise<void>> = {
  "resume-analysis": handleResumeAnalysisJob,
  "send-reminder": handleReminderJob,
};

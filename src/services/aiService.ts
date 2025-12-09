import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeResume(resumeText: string, jobDescription?: string) {
  
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = jobDescription
    ? `You are an ATS resume analyzer.
       Resume: ${resumeText}
       Job Description: ${jobDescription}

       Return ONLY valid JSON with the following fields:
       {
         "atsFriendly": boolean,
         "atsSuggestions": string[],
         "jobFitPercentage": number,
         "jobFitSuggestions": string[]
       }

       Do not include code fences, markdown, or any text outside the JSON.`
    : `You are an ATS resume analyzer.
       Resume: ${resumeText}

       Return ONLY valid JSON with the following fields:
       {
         "atsFriendly": boolean,
         "atsSuggestions": string[]
       }

       Do not include code fences, markdown, or any text outside the JSON.`;

  const result = await model.generateContent(prompt);
  let text = result.response.text();

  // Clean up common Gemini formatting issues
  text = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
  const parsed = JSON.parse(text)

  // Normalize shape
  return {
    atsFriendly: parsed.atsFriendly ?? false,
    atsSuggestions: parsed.atsSuggestions ?? [],
    jobFitPercentage: parsed.jobFitPercentage ?? 0,
    jobFitSuggestions: parsed.jobFitSuggestions ?? [],
  }
  } catch (err) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Gemini did not return valid JSON");
  }
}

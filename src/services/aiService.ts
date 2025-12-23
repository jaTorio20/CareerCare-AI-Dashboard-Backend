import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeResume(resumeText: string, jobDescription?: string) {
  
  const model = client.getGenerativeModel({ model: `${process.env.GEMINI_MODEL}` });

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
         "atsSuggestions": string[],
          "jobFitPercentage": number
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


export async function generateCoverLetter(jobDescription: string, jobTitle: string, companyName: string, userDetails?: string) {
  type CoverLetterResponse = { generatedLetter: string };
    const model = client.getGenerativeModel({ model: `${process.env.GEMINI_MODEL}` });
    const prompt = userDetails 
      ? `You are a professional career assistant.
          Using the job description and my personal details, write a tailored cover letter for the job application.
          At the very top of the cover letter, include ONLY my personal details block (name, address, email, phone, LinkedIn, GitHub, Portfolio, Date).
          
          - Each detail must be wrapped in its own <p> tag so TipTap renders them as separate lines.
          - Do NOT include company details (Hiring Manager, company name, company address) in the personal details block.
          - Email and phone MUST always be included. If not provided, use safe placeholders:
            email@example.com
            +63 XXX XXX XXXX
          - Use realistic placeholders for other missing fields (e.g., "linkedin.com/in/example", "github.com/example", "portfolio.example.com").
          - Personal Details and the Body should only use one <p> per line, to avoid over enter spacing.

          Job Description: ${jobDescription}
          Job Company Name: ${companyName}
          Job Position: ${jobTitle}
          My Details: ${userDetails}

          Return ONLY valid JSON with the following fields:
          {
            "generatedLetter": string
          }
          
          Do not include code fences, markdown, or any text outside the JSON.`
      : `You are a professional career assistant.
          Using the job description, write a tailored cover letter for the job application.
          At the very top of the cover letter, invent ONLY a professional personal details block (name, address, email, phone, LinkedIn, GitHub, Portfolio, Date).
          
          - Each detail must be wrapped in its own <p> tag so TipTap renders them as separate lines.
          - Do NOT include company details (Hiring Manager, company name, company address) in the personal details block.
          - Email and phone MUST always be included using safe placeholders if not available:
            email@example.com
            +63 XXX XXX XXXX
          - Use realistic placeholders for other missing fields (e.g., "linkedin.com/in/example", "github.com/example", "portfolio.example.com").
          - Personal Details and the Body should only use one <p> per line, to avoid over enter spacing.

          Job Description: ${jobDescription}
          Company Name: ${companyName}          
          Job Position: ${jobTitle}


          Return ONLY valid JSON with the following fields:
          {
            "generatedLetter": string
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
  const parsed = JSON.parse(text);

    // Validate shape
  if (typeof parsed.generatedLetter !== "string") {
    throw new Error("Invalid response: generatedLetter must be a string");
  }

  // Normalize shape
  return {
    generatedLetter: parsed.generatedLetter ?? ""
  } as CoverLetterResponse;
  } catch (err) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Gemini did not return valid JSON");
  }
}


export interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

export async function callAIModel({
  prompt,
  context,
  history = [],
}: {
  prompt: string;
  context?: { jobTitle?: string; companyName?: string; topic?: string; difficulty?: string };
  history?: ChatMessage[];
}) {
  try {
    const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-pro" });

  // Handle trivial filler locally 
    const trivial = ["okay", "sure", "no problem", "uh", "hmm"];
    if (trivial.some(word => prompt.toLowerCase().includes(word))) {
      return "Got it, let's continue.";
    } 

   // Build structured prompt 
    let fullPrompt = `You are a supportive interviewer. If the candidate says casual filler, acknowledge politely and continue the interview.\n\n`;
    
    if (context) {
      fullPrompt += `Interview Context:\nJob Title: ${context.jobTitle}\nCompany: ${context.companyName}\nTopic: ${context.topic}\nDifficulty: ${context.difficulty}\n\n`;
    }
    if (history.length) {
      fullPrompt += "Conversation so far:\n";
      history.forEach((msg) => {
        fullPrompt += `${msg.role === "user" ? "Candidate" : "AI"}: ${msg.text}\n`;
      });
      fullPrompt += "\n";
    }
    fullPrompt += `Candidate: ${prompt}\nAI:`; // user’s latest input + cue for AI reply

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    return text;
  } catch (err: any) {
    console.error("AI generation error:", err);
    throw new Error("Failed to generate AI response");
  }
}



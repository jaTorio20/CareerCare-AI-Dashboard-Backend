import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeResume(resumeText: string, jobDescription?: string) {
  
  const model = client.getGenerativeModel({ model: `${process.env.GEMINI_MODEL}` });

  const prompt = jobDescription
    ? `You are an ATS (Applicant Tracking System) resume analyzer.
       Resume: ${resumeText}
       Job Description: ${jobDescription}

       Evaluate:
      - Resume formatting and structure for ATS parsing
      - Keyword matching against the job description
      - Missing or weak keywords
      - Overall ATS compatibility

       Return ONLY valid JSON with the following format:
      
      {
        "atsScore": number, // 0-100 based on formatting and structure
        "formatIssues": string[],
        "keywordMatchPercentage": number, // 0-100
        "missingKeywords": string[],
        "strengthKeywords": string[],
        "improvementSuggestions": [
          {
            "priority": "high" | "medium" | "low",
            "message": string
          }
        ]
      }

       Do not include code fences, markdown, or any text outside the JSON.`
    : `
      You are an ATS (Applicant Tracking System) resume analyzer.
       Resume: ${resumeText}

       Evaluate:
      - ATS readability and structure
      - Formatting issues that may break parsing
      - Keyword clarity and section labeling

       Return ONLY valid JSON with the following fields:
      {
        "atsScore": number, // 0-100
        "formatIssues": string[],
        "improvementSuggestions": [
          {
            "priority": "high" | "medium" | "low",
            "message": string
          }
        ]
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
    atsScore: parsed.atsScore ?? 0,
    formatIssues: parsed.formatIssues ?? [],
    keywordMatchPercentage: parsed.keywordMatchPercentage ?? 0,
    missingKeywords: parsed.missingKeywords ?? [],
    strengthKeywords: parsed.strengthKeywords ?? [],
    improvementSuggestions: parsed.improvementSuggestions ?? [],
  }
  } catch (err: any) {
     throw new Error("Gemini did not return valid JSON");
    // throw normalizeErrorAI(err);
  }
}


export async function generateCoverLetter(jobDescription: string, jobTitle: string, companyName: string, userDetails?: string) {
  type CoverLetterResponse = { generatedLetter: string };
    const model = client.getGenerativeModel({ model: `${process.env.GEMINI_MODEL}` });
      const prompt = userDetails 
        ? `You are a professional career assistant.
      Using the job description and my personal details, write a professional, tailored cover letter for a job application.

      Instructions:
      - At the very top, include ONLY my personal details: Name, Address, Email, Phone, LinkedIn, GitHub, Portfolio, Date.
        - Each detail must be on its own line (single newline, no extra spacing).
        - Do NOT include company or hiring manager details in this block.
        - If Email or Phone is missing, use safe placeholders:
          email@example.com
          +63 XXX XXX XXXX
        - For other missing fields, use realistic placeholders (LinkedIn, GitHub, Portfolio).
      - Below the personal details block, write the cover letter body:
        - Start with "Dear Hiring Manager," on its own line.
        - Opening paragraph: express interest and fit for the role.
        - Middle paragraph(s): highlight 2-3 relevant skills, achievements, or experience.
        - Closing paragraph: thank the reader, mention your resume, express interest in discussing further.
      - Each paragraph in the body must be separated by a single newline.
      - Avoid extra empty lines between paragraphs.
      - Return ONLY valid JSON with the following structure:

      {
        "generatedLetter": "string"
      }

      Do not include markdown, HTML tags, code fences, or any text outside the JSON.

      Job Description: ${jobDescription}
      Company Name: ${companyName}
      Job Position: ${jobTitle}
      My Details: ${userDetails}`
      : `You are a professional career assistant.
      Using the job description, write a professional, tailored cover letter for a job application.
      Invent a professional personal details block at the top (Name, Address, Email, Phone, LinkedIn, GitHub, Portfolio, Date).

      Instructions:
      - Personal details block: each detail on its own line (single newline).
      - Cover letter body: start with "Dear Hiring Manager," on its own line.
        - Opening paragraph: express interest and fit for the role.
        - Middle paragraph(s): highlight 2-3 relevant skills, achievements, or experience.
        - Closing paragraph: thank the reader, mention resume, express interest in discussing further.
      - Avoid extra empty lines between paragraphs.
      - Use realistic placeholders if fields are missing.
      - Return ONLY valid JSON:

      {
        "generatedLetter": "string"
      }

      Do not include markdown, HTML tags, code fences, or any text outside the JSON.

      Job Description: ${jobDescription}
      Company Name: ${companyName}
      Job Position: ${jobTitle}`;





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
    // console.error("Failed to parse Gemini response:", text);
    throw new Error("Gemini did not return valid JSON");
    // throw normalizeErrorAI(err);
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



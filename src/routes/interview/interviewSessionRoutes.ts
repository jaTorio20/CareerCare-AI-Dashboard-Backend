import express, {Request, Response, NextFunction} from "express";
import { InterviewSessionModel } from "../../models/Interview/InterviewSession.model";
import { protect } from "../../middleware/authMiddleware";
import { InterviewMessageModel } from "../../models/Interview/InterviewMessage";
import { callAIModel } from "../../services/aiService";
import { transcribeWithWhisper } from "../../services/whisper";
import { storage } from "../../middleware/uploadMiddleware"; //just a temporary storage
import multer from "multer";
import fs from "fs"

const upload = multer({ storage });

const router = express.Router();

router.post('/sessions', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { jobTitle, companyName, topic, difficulty } = req.body;

    const interviewSession = new InterviewSessionModel({
      userId: req.user._id,          // tie session to logged-in user
      jobTitle,
      companyName,
      topic,
      difficulty: difficulty || "none", // default if not provided
      status: "in-progress",
      startedAt: new Date(),
    });

    await interviewSession.save();
    res.status(201).json(interviewSession);
  } catch (err) {
    next(err);
  }
});

// Get all sessions for the logged-in user
router.get("/sessions", protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessions = await InterviewSessionModel.find({ userId: req.user._id }).sort({
      startedAt: -1, // newest first
    });

    res.json(sessions);
  } catch (err) {
    console.error("Fetch sessions error:", err);
    next(err);
  }
});

// it gets the value from InterviewSessionModel
router.post("/sessions/:id/chat", protect, upload.single("audio"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("Multer file:", req.file); // should show filename, path, mimetype
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { text } = req.body;
    const sessionId = req.params.id;

    let transcription = text;

    if (req.file) { 
      const audioPath = req.file.path;
      console.log("Audio path:", audioPath); 
      if (!fs.existsSync(audioPath)){ 
        console.error("File not found:", audioPath);
      } else {
        transcription = await transcribeWithWhisper(audioPath); 
        console.log("Whisper transcription:", transcription); 
      } 
    }

    // Save user message
    const userMessage = new InterviewMessageModel({
      sessionId,
      role: "user",
      text: transcription ?? "",
      audioUrl: req.file ? req.file.filename : undefined,
      // createdAt: new Date(),
    });
    await userMessage.save();

    const session = await InterviewSessionModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Build history in correct type
    const historyDocs = await InterviewMessageModel.find({ sessionId }).sort({
      createdAt: 1,
    });
    const history = historyDocs.map((m) => ({
      role: (m.role ?? "user") as "user" | "ai", // default to "user" if null
      text: m.text ?? "", // ensure string
    }));

    // Generate AI reply
    const aiText = await callAIModel({
      prompt: transcription?.trim() ? transcription : "[unrecognized speech]", // the candidate’s latest input
      context: {
        jobTitle: session.jobTitle ?? undefined,
        companyName: session.companyName ?? undefined,
        topic: session.topic ?? undefined,
        difficulty: session.difficulty ?? undefined,
      },
      history,
    });
    const aiMessage = new InterviewMessageModel({
      sessionId,
      role: "ai",
      text: aiText,
      createdAt: new Date(),
    });
    await aiMessage.save();

    res.status(201).json({ userMessage, aiMessage });
  } catch (err) {;
    next(err);
  }
});

router.get("/sessions/:id/messages", protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const sessionId = req.params.id;
    const messages = await InterviewMessageModel.find({ sessionId }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    next(err);
  }
});

export default router;


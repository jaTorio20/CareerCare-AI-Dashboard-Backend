import express, {Request, Response, NextFunction} from "express";
import { InterviewSessionModel } from "../../models/Interview/InterviewSession.model";
import { protect } from "../../middleware/authMiddleware";
import { InterviewMessageModel } from "../../models/Interview/InterviewMessage";
import { callAIModel } from "../../services/aiService";
import { transcribeWithWhisper } from "../../services/whisper";

import { getAudioSignedUrl } from "../../services/backblaze";
import { upload } from "../../middleware/uploadMiddleware";
import { uploadAudioToB2 } from "../../services/backblaze";


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
router.post(
  "/sessions/:id/chat",
  protect,
  upload.single("audio"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

      const { text } = req.body;
      const sessionId = req.params.id;

      let transcription = text;
     let userMessage: InstanceType<typeof InterviewMessageModel>;

      if (req.file) {
        try {
          const key = await uploadAudioToB2(req.file);
          const transcription = await transcribeWithWhisper(req.file.buffer);

          userMessage = new InterviewMessageModel({
            sessionId,
            role: "user",
            text: transcription ?? "",
            audioUrl: key,
          });
        } catch (err) {
          console.error("Audio processing failed:", err);
          userMessage = new InterviewMessageModel({
            sessionId,
            role: "user",
            text: "[audio upload failed]",
          });
        }
      } else {
        userMessage = new InterviewMessageModel({
          sessionId,
          role: "user",
          text: text ?? "",
        });
      }
      await userMessage.save();


      const session = await InterviewSessionModel.findById(sessionId);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const historyDocs = await InterviewMessageModel.find({ sessionId }).sort({ createdAt: 1 });
      const history = historyDocs.map((m) => ({
        role: (m.role ?? "user") as "user" | "ai",
        text: m.text ?? "",
      }));

      const aiText = await callAIModel({
        prompt: transcription?.trim() ? transcription : "[unrecognized speech]",
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
      });
      await aiMessage.save();

      console.log("Returning:", { userMessage, aiMessage });
      res.status(201).json({ userMessage, aiMessage });
    } catch (err) {
      next(err);
    }
  }
);



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

router.get("/sessions/:id/audio/:key", protect, async (req: Request, res: Response, next: NextFunction) => { 
  try {
   const { key } = req.params; 
   const signedUrl = await getAudioSignedUrl(key); 
   res.json({ url: signedUrl }); 
  } catch (err) { 
    next(err); 
  } 
});

export default router;


import express, {Request, Response, NextFunction} from "express";
import { InterviewSessionModel } from "../../models/Interview/InterviewSession.model";
import { protect } from "../../middleware/authMiddleware";
import { InterviewMessageModel } from "../../models/Interview/InterviewMessage";
import { callAIModel } from "../../services/aiService";
import { transcribeWithWhisper } from "../../services/whisper";

import { getAudioSignedUrl } from "../../services/backblaze";
import { upload } from "../../middleware/uploadMiddleware";
import { uploadAudioToB2 } from "../../services/backblaze";

import { deleteAudioFromB2 } from "../../services/backblaze";

// VALIDATOR
import { validate } from "../../middleware/validate";
import { createInterviewSessionSchema, createInterviewMessageSchema, deleteInterviewSessionSchema } from "./interviewSession.schema";
import { CreateInterviewSessionBody, CreateInterviewMessageBody, CreateInterviewMessageParams, DeleteInterviewSessionParams } from "./interviewSession.schema";

const router = express.Router();

router.post('/sessions', protect, 
  validate(createInterviewSessionSchema),
  async (req: Request<any, any, CreateInterviewSessionBody >, res: Response, next: NextFunction) => {
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
  validate(createInterviewMessageSchema),
  async (req: Request<CreateInterviewMessageParams, any, CreateInterviewMessageBody>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const { text } = req.body;
    const { id: sessionId } = req.params;

    let transcription = text;
    let userMessage: InstanceType<typeof InterviewMessageModel>;

    if (req.file) {
      try {
        const key = await uploadAudioToB2(req.file);
        transcription = await transcribeWithWhisper(req.file.buffer);

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

    let aiText: string;

    try {
      aiText = await callAIModel({
      prompt: transcription?.trim() ? transcription : "[unrecognized speech]",
      context: {
        jobTitle: session.jobTitle ?? undefined,
        companyName: session.companyName ?? undefined,
        topic: session.topic ?? undefined,
        difficulty: session.difficulty ?? undefined,
      },
      history,
    });
    } catch (err: any) {
      console.error("AI call failed:", err); 
      if (err?.status === 429) { 
        aiText = "I'm unable to provide a detailed answer right now, but let's continue the conversation."; 
      } else { 
        aiText = "Sorry, something went wrong generating a response."; 
      }
    }

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

router.delete("/sessions/:id", protect, 
  validate(deleteInterviewSessionSchema),
  async (req: Request<DeleteInterviewSessionParams, any, any>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Fetch messages BEFORE deleting the session
    const messages = await InterviewMessageModel.find({ sessionId: id });
    
    // Extract audioUrls before messages are deleted
    const audioUrls = messages
      .map((msg) => msg.audioUrl)
      .filter((url): url is string => Boolean(url));

    // Delete the session
    const session = await InterviewSessionModel.findOneAndDelete({ _id: id });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Delete all audio files from Backblaze using the stored audioUrls
    const failedDeletes: string[] = [];

    await Promise.all(
      audioUrls.map(async (audioUrl) => {
        try {
          await deleteAudioFromB2(audioUrl);
        } catch (err) {
          console.error(`Failed to delete audio ${audioUrl}:`, err);
          failedDeletes.push(audioUrl);
        }
      })
    );

    if (failedDeletes.length) {
      console.warn("Some audio files could not be deleted:", failedDeletes);
    }

    res.json({ message: "Session delete" });
  } catch (err) {
    next(err);
  }
});


export default router;


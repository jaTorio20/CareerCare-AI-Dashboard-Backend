import { Request, Response, NextFunction } from "express";
import { CreateInterviewMessageBody, CreateInterviewMessageParams, CreateInterviewSessionBody, DeleteInterviewSessionParams } from "../../routes/interview/interviewSession.schema";
import { InterviewSessionModel } from "../../models/Interview/InterviewSession.model";
import { InterviewMessageModel } from "../../models/Interview/InterviewMessage";
import { deleteAudioFromB2, getAudioSignedUrl, uploadAudioToB2 } from "../../services/backblaze";
import { transcribeWithWhisper } from "../../services/whisper";
import { callAIModel } from "../../services/aiService";

// @route     POST /api/interview/sessions
// @desc      Create a new interview session
export const createInterviewSession =
async (req: Request<any, any, CreateInterviewSessionBody >, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { jobTitle, companyName, topic, difficulty } = req.body;
    const interviewSession = new InterviewSessionModel({
      userId: req.user._id, 
      jobTitle,
      companyName,
      topic,
      difficulty: difficulty || "none",
      status: "in-progress",
      startedAt: new Date(),
    });

    await interviewSession.save();
    res.status(201).json(interviewSession);
  } catch (err) {
    next(err);
  }
}

// @route     GET /api/interview/sessions
// @desc      Get all interview sessions for the authenticated user
export const getInterviewSessions =
async (req: Request, res: Response, next: NextFunction) => {
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
}

// @route     POST /api/interview/sessions/:id/chat
// @desc      Create a new interview message (text or audio) in a session
export const createInterviewMessage =
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

// @route     GET /api/interview/sessions/:id/messages
// @desc      Get all messages for a specific interview session
export const getInterviewMessages =
async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const sessionId = req.params.id;
    const messages = await InterviewMessageModel.find({ sessionId }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    next(err);
  }
};

// @route     GET /api/interview/sessions/:id/audio/:key
// @desc      Get a signed URL for an audio file in a session
export const getInterviewAudioSignedUrl =
async (req: Request, res: Response, next: NextFunction) => { 
  try {
   const { key } = req.params; 
   const signedUrl = await getAudioSignedUrl(key); 
   res.json({ url: signedUrl }); 
  } catch (err) { 
    next(err); 
  } 
}

// @route     DELETE /api/interview/sessions/:id
// @desc      Delete an interview session and its associated audio files
export const deleteInterviewSession =
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
}
import express from "express";
import { protect } from "../../middleware/authMiddleware";
import { upload } from "../../middleware/uploadMiddleware";
import { createInterviewMessage, createInterviewSession, deleteInterviewSession, 
  getInterviewAudioSignedUrl, getInterviewMessages, getInterviewSessions
 } from "../../controllers/interview/interviewSession.controller";

// VALIDATION
import { validate } from "../../middleware/validate";
import { createInterviewSessionSchema, createInterviewMessageSchema, 
  deleteInterviewSessionSchema } from "./interviewSession.schema";

const router = express.Router();

// INTERVIEW SESSION ROUTES (/api/interview)
router.post('/sessions', protect, 
  validate(createInterviewSessionSchema), createInterviewSession);

router.get("/sessions", protect, getInterviewSessions);

router.post( "/sessions/:id/chat", protect, upload.single("audio"), 
  validate(createInterviewMessageSchema), createInterviewMessage);
  
router.get("/sessions/:id/messages", protect, getInterviewMessages);

router.get("/sessions/:id/audio/:key", protect, getInterviewAudioSignedUrl);

router.delete("/sessions/:id", protect, 
  validate(deleteInterviewSessionSchema), deleteInterviewSession);


export default router;


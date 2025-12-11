import expres, {  Request, Response, NextFunction } from 'express';
import { generateCoverLetter } from '../services/aiService';
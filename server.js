import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import cors from 'cors';  
import Test from './models/Test.js';
import { errorHandler } from './middleware/errorHandler.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to the database
connectDB();


// CORS Configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || 8000,
  credentials: true //for allowing to send header value
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/test', async (req, res) => {
  try {
    const { name } = req.body;
    const newTest = new Test({ name });
    await newTest.save();
    res.status(201).json(newTest);
  } catch (err) {
    console.error("Failed to create test",err);
  }
});

//404 Fallback
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
})

app.use(errorHandler);


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import cors from 'cors'; 
import { errorHandler } from './middleware/errorHandler';
import testRoute from './routes/testRoute';
import analyzeRoutes from './routes/analyzeRoutes';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to the database
connectDB();


// CORS Configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || `http://localhost:3000`, // Adjust as needed
  credentials: true //for allowing to send header value
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/test', testRoute);
app.use('/api/resumes', analyzeRoutes);

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
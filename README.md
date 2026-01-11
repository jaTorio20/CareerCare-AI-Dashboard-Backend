# CareerCare Backend

CareerCare Backend is a Node.js/Express API server that powers an AI-driven career assistance platform. It provides resume analysis, cover letter generation, job application tracking, and AI-powered interview practice features.

## What This Application Does

CareerCare helps job seekers by:
- **Resume Analysis**: Analyzes resumes against job descriptions using AI to provide ATS scores, keyword matching, and improvement suggestions
- **Cover Letter Generation**: Uses AI (Google Gemini) to generate personalized cover letters based on job descriptions and user details
- **Job Application Tracking**: Allows users to track their job applications with status, notes, and resume attachments
- **AI Interview Practice**: Provides real-time interview practice sessions with speech-to-text transcription and AI-powered responses

## How It Works

### Architecture Overview

The backend is built with Express.js and follows a modular route-based architecture. Key components include:

- **API Routes** (`src/routes/`): Handle HTTP requests for different features
- **Services** (`src/services/`): Business logic and external API integrations (AI, file storage)
- **Models** (`src/models/`): MongoDB schemas for data storage
- **Middleware** (`src/middleware/`): Authentication, validation, error handling, and logging
- **Background Workers** (`src/background/`): Async job processing using Redis queues (BullMQ)

### Main Features Breakdown

#### 1. Resume Analysis (`src/routes/resumes/`)
- Users upload a resume file (PDF or Word document)
- Resume text is extracted using PDF parsing or mammoth.js
- AI analyzes the resume against provided job description
- Results include ATS score, keyword matches, format issues, and improvement suggestions
- Analysis runs asynchronously via background workers for better performance

#### 2. Cover Letter Generation (`src/routes/coverLetter/`)
- Users provide job description, job title, and company name
- Optional user details can be included
- Google Gemini AI generates personalized cover letters
- Users can edit generated letters using a rich text editor (TipTap)
- Letters are saved and can be exported as Word documents

#### 3. Job Application Tracking (`src/routes/jobApplication/`)
- Users create application entries with company name, job title, status, location, salary range, and notes
- Resume files can be attached and stored in Cloudinary
- Applications can be viewed, updated, and deleted
- Supports filtering and search functionality

#### 4. Interview Practice (`src/routes/interview/`)
- Users create interview sessions with job details and difficulty level
- Audio recordings are uploaded to Backblaze B2 cloud storage
- Speech-to-text transcription is done using Whisper AI
- Google Gemini AI provides interview questions and feedback
- Conversation history is maintained for context-aware responses

#### 5. Authentication (`src/routes/auth/`)
- JWT-based authentication with access and refresh tokens
- Google OAuth 2.0 support for social login
- Password hashing using bcrypt
- Token refresh mechanism for extended sessions

### Key Technologies

- **Database**: MongoDB with Mongoose ODM
- **Queue System**: Redis with BullMQ for background jobs
- **File Storage**: Cloudinary (resumes), Backblaze B2 (audio files)
- **AI Services**: Google Gemini AI (text generation), Whisper (speech-to-text)
- **Authentication**: JWT tokens, Passport.js for OAuth
- **Validation**: Zod schemas for request validation
- **Logging**: Pino logger for structured logging

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB database
- Redis server (for background jobs)
- Accounts for:
  - Google Cloud (for Gemini AI and OAuth)
  - Cloudinary (for resume storage)
  - Backblaze B2 (for audio storage)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/careercare

# Redis (for job queues)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Cloudinary (for resume storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Backblaze B2 (for audio storage)
B2_KEY_ID=your-b2-key-id
B2_APP_KEY=your-b2-app-key
B2_BUCKET=your-bucket-name

# Frontend URL (for CORS)
ALLOWED_ORIGINS=http://localhost:3000

# Whisper API (optional, if using external service)
WHISPER_API_URL=your-whisper-api-url
```

3. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:5000` (or the PORT specified in your `.env` file).

### Production Build

1. Build TypeScript to JavaScript:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## API Endpoints

The API is organized into the following route groups:

- `/api/auth` - Authentication (login, register, OAuth, token refresh)
- `/api/resumes` - Resume management and analysis
- `/api/resumes/analyze` - Resume analysis jobs
- `/api/cover-letter` - Cover letter generation and management
- `/api/job-application` - Job application tracking
- `/api/interview` - Interview practice sessions

All protected routes require a valid JWT token in the Authorization header: `Bearer <token>`

## Background Jobs

The application uses BullMQ with Redis to process heavy tasks asynchronously:
- Resume analysis jobs run in the background to avoid blocking the API
- Jobs are processed by workers defined in `src/background/workers/`
- Start the worker process separately: `npm run worker` (if configured)

## Cron Jobs

Scheduled cleanup tasks run automatically:
- Temporary resume files are cleaned up periodically (configured in `src/cronJobs/cleanupTempResumes.ts`)

## Error Handling

All errors are caught by a centralized error handler middleware (`src/middleware/errorHandler.ts`) that:
- Logs errors using Pino logger
- Returns appropriate HTTP status codes
- Provides error messages to clients (in development) or generic messages (in production)

## Security Features

- Helmet.js for security headers
- CORS configuration for allowed origins
- Rate limiting on authentication routes
- Input validation using Zod schemas
- SQL injection protection via HPP middleware
- JWT token-based authentication
- Password hashing with bcrypt

## Logging

The application uses Pino for structured logging. Logs include:
- HTTP requests and responses
- Database operations
- Background job processing
- Error tracking

Logs are formatted for development (pretty print) and JSON for production.

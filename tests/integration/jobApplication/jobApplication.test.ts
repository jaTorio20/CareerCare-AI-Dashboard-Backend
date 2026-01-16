jest.mock("../../../src/middleware/authMiddleware"); // uses __mocks__/authMiddleware.ts
jest.mock("../../../src/services/cloudinaryService"); // uses __mocks__/cloudinaryService.ts
jest.mock("../../../src/services/fileService");

import { parseFile } from "../../../src/services/fileService";
import request from "supertest";
import app from "../../../src/app";
import { JobApplicationModel } from "../../../src/models/JobApplication";
import mongoose from "mongoose";

const { setAuthBehavior, mockUserId } = jest.requireMock("../../../src/middleware/authMiddleware");

// Helper to create a job application directly in DB
const createTestApplication = async (overrides = {}) => {
  const application = new JobApplicationModel({
    userId: mockUserId,
    companyName: "Test Company",
    jobTitle: "Test Developer",
    status: "applied",
    location: "remote",
    ...overrides,
  });
  await application.save();
  return application;
};

beforeEach(async () => {
  jest.clearAllMocks();
  await JobApplicationModel.deleteMany({});
  setAuthBehavior(true);
});

// @route          POST /api/job-application
// @description    Create a new job application entry
// @access         Private
describe("POST /api/job-application", () => {
  it("creates a job application with valid data (no file)", async () => {
    const res = await request(app)
      .post("/api/job-application")
      .send({ companyName: "Microsoft", jobTitle: "Backend Developer" });

    expect(res.status).toBe(201);
    expect(res.body.companyName).toBe("Microsoft");
    expect(res.body.jobTitle).toBe("Backend Developer");
    expect(res.body.userId).toBe(mockUserId.toString());
  });

  it("creates a job application with all optional fields", async () => {
    const res = await request(app)
      .post("/api/job-application")
      .send({
        companyName: "Amazon",
        jobTitle: "Cloud Engineer",
        jobDescription: "Build scalable cloud solutions",
        status: "interview",
        location: "hybrid",
        notes: "Second round scheduled",
        salaryRange: "$150k-$200k",
      });

    expect(res.status).toBe(201);
    expect(res.body.companyName).toBe("Amazon");
    expect(res.body.status).toBe("interview");
    expect(res.body.location).toBe("hybrid");
    expect(res.body.notes).toBe("Second round scheduled");
  });

  it("creates a job application with a valid PDF file", async () => {
    const pdfBuffer = Buffer.from("%PDF-1.4 dummy PDF content");

    const res = await request(app)
      .post("/api/job-application")
      .attach("resumeFile", pdfBuffer, "resume.pdf")
      .field("companyName", "Google")
      .field("jobTitle", "Frontend Developer");

    expect(res.status).toBe(201);
    expect(res.body.companyName).toBe("Google");
    expect(res.body.jobTitle).toBe("Frontend Developer");
    expect(res.body.resumeFile).toBeDefined();
  });

  it("returns 400 for unsupported file type", async () => {
    (parseFile as jest.Mock).mockRejectedValueOnce(
      new Error("Unsupported file type")
    );
    const txtBuffer = Buffer.from("dummy text content");

    const res = await request(app)
      .post("/api/job-application")
      .attach("resumeFile", txtBuffer, {
        filename: "resume.txt",
        contentType: "text/plain",
      })
      .field("companyName", "Microsoft")
      .field("jobTitle", "Backend Developer");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Unsupported file type");
  });

  it("returns 401 if user is not authenticated", async () => {
    setAuthBehavior(false);

    const res = await request(app)
      .post("/api/job-application")
      .send({ companyName: "Netflix", jobTitle: "Engineer" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 400 if companyName or jobTitle are missing (Zod error)", async () => {
    const res = await request(app)
      .post("/api/job-application")
      .send({ companyName: "Microsoft" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errors");
    expect(res.body.errors[0].path).toBe("body.jobTitle");
  });
});

// @route          GET /api/job-application
// @description    List all job applications for the authenticated user
// @access         Private
describe("GET /api/job-application", () => {
  it("returns empty array when no applications exist", async () => {
    const res = await request(app).get("/api/job-application");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.nextCursor).toBeNull();
  });

  it("returns user's job applications", async () => {
    await createTestApplication({ companyName: "Company A", jobTitle: "Dev A" });
    await createTestApplication({ companyName: "Company B", jobTitle: "Dev B" });

    const res = await request(app).get("/api/job-application");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("supports pagination with limit parameter", async () => {
    // Create 5 applications
    for (let i = 1; i <= 5; i++) {
      await createTestApplication({ companyName: `Company ${i}`, jobTitle: `Dev ${i}` });
    }

    const res = await request(app).get("/api/job-application?limit=2");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.nextCursor).toBeDefined();
  });

  it("supports cursor-based pagination", async () => {
    for (let i = 1; i <= 5; i++) {
      await createTestApplication({ companyName: `Company ${i}`, jobTitle: `Dev ${i}` });
    }

    const firstPage = await request(app).get("/api/job-application?limit=2");
    expect(firstPage.body.data).toHaveLength(2);
    expect(firstPage.body.nextCursor).toBeDefined();

    const cursor = firstPage.body.nextCursor;
    const secondPage = await request(app).get(`/api/job-application?limit=2&cursor=${cursor}`);
    expect(secondPage.body.data.length).toBeGreaterThanOrEqual(1);
    
    const firstPageIds = firstPage.body.data.map((a: any) => a._id);
    const secondPageIds = secondPage.body.data.map((a: any) => a._id);
    const overlap = firstPageIds.filter((id: string) => secondPageIds.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it("supports search by company name", async () => {
    await createTestApplication({ companyName: "Google", jobTitle: "Engineer" });
    await createTestApplication({ companyName: "Microsoft", jobTitle: "Developer" });

    const res = await request(app).get("/api/job-application?search=Google");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].companyName).toBe("Google");
  });

  it("supports search by job title", async () => {
    await createTestApplication({ companyName: "Company A", jobTitle: "Frontend Developer" });
    await createTestApplication({ companyName: "Company B", jobTitle: "Backend Engineer" });

    const res = await request(app).get("/api/job-application?search=Frontend");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].jobTitle).toBe("Frontend Developer");
  });

  it("returns 401 if user is not authenticated", async () => {
    setAuthBehavior(false);

    const res = await request(app).get("/api/job-application");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });
});

// @route          GET /api/job-application/:id
// @description    Get a single job application by ID
// @access         Private
describe("GET /api/job-application/:id", () => {
  it("returns a single job application by ID", async () => {
    const application = await createTestApplication({ companyName: "Meta" });

    const res = await request(app).get(`/api/job-application/${application._id}`);

    expect(res.status).toBe(200);
    expect(res.body.companyName).toBe("Meta");
    expect(res.body._id).toBe(application._id.toString());
  });

  it("returns 404 for non-existent application", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).get(`/api/job-application/${fakeId}`);

    expect(res.status).toBe(404);
  });

  it("returns 401 if user is not authenticated", async () => {
    setAuthBehavior(false);
    const application = await createTestApplication();

    const res = await request(app).get(`/api/job-application/${application._id}`);

    expect(res.status).toBe(401);
  });
});

// @route          PUT /api/job-application/:id
// @description    Update a job application by ID
// @access         Private
describe("PUT /api/job-application/:id", () => {
  it("updates a job application successfully", async () => {
    const application = await createTestApplication({ companyName: "Old Company" });

    const res = await request(app)
      .put(`/api/job-application/${application._id}`)
      .send({
        companyName: "New Company",
        jobTitle: "Senior Developer",
        status: "interview",
      });

    expect(res.status).toBe(200);
    expect(res.body.companyName).toBe("New Company");
    expect(res.body.jobTitle).toBe("Senior Developer");
    expect(res.body.status).toBe("interview");
  });

  it("updates only provided fields", async () => {
    const application = await createTestApplication({
      companyName: "Original",
      jobTitle: "Developer",
      notes: "Initial notes",
    });

    const res = await request(app)
      .put(`/api/job-application/${application._id}`)
      .send({
        companyName: "Original",
        jobTitle: "Developer",
        status: "offer",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("offer");
    expect(res.body.notes).toBe("Initial notes");
  });

  it("updates job application with new resume file", async () => {
    const application = await createTestApplication();
    const pdfBuffer = Buffer.from("%PDF-1.4 new resume content");

    const res = await request(app)
      .put(`/api/job-application/${application._id}`)
      .attach("resumeFile", pdfBuffer, "new-resume.pdf")
      .field("companyName", "Updated Company")
      .field("jobTitle", "Updated Title");

    expect(res.status).toBe(200);
    expect(res.body.resumeFile).toBeDefined();
    expect(res.body.originalName).toBe("new-resume.pdf");
  });

  it("returns 404 for non-existent application", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .put(`/api/job-application/${fakeId}`)
      .send({ companyName: "Test", jobTitle: "Test" });

    expect(res.status).toBe(404);
  });

  it("returns 403 when updating another user's application", async () => {
    const otherUserId = new mongoose.Types.ObjectId();
    const application = await createTestApplication({ userId: otherUserId });

    const res = await request(app)
      .put(`/api/job-application/${application._id}`)
      .send({ companyName: "Hacked", jobTitle: "Hacker" });

    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid ObjectId", async () => {
    const res = await request(app)
      .put("/api/job-application/invalid-id")
      .send({ companyName: "Test", jobTitle: "Test" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errors");
  });

  it("returns 401 if user is not authenticated", async () => {
    setAuthBehavior(false);
    const application = await createTestApplication();

    const res = await request(app)
      .put(`/api/job-application/${application._id}`)
      .send({ companyName: "Test", jobTitle: "Test" });

    expect(res.status).toBe(401);
  });
});

// @route          DELETE /api/job-application/:id
// @description    Delete a job application by ID
// @access         Private
describe("DELETE /api/job-application/:id", () => {
  it("deletes a job application successfully", async () => {
    const application = await createTestApplication();

    const res = await request(app).delete(`/api/job-application/${application._id}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Job Application deleted successfully");

    // Verify deletion
    const deleted = await JobApplicationModel.findById(application._id);
    expect(deleted).toBeNull();
  });

  it("returns 404 for non-existent application", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).delete(`/api/job-application/${fakeId}`);

    expect(res.status).toBe(404);
  });

  it("returns 403 when deleting another user's application", async () => {
    const otherUserId = new mongoose.Types.ObjectId();
    const application = await createTestApplication({ userId: otherUserId });

    const res = await request(app).delete(`/api/job-application/${application._id}`);

    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid ObjectId", async () => {
    const res = await request(app).delete("/api/job-application/invalid-id");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errors");
  });

  it("returns 401 if user is not authenticated", async () => {
    setAuthBehavior(false);
    const application = await createTestApplication();

    const res = await request(app).delete(`/api/job-application/${application._id}`);

    expect(res.status).toBe(401);
  });
});

// @route          GET /api/job-application/:id/download
// @description    Download resume file for a job application
// @access         Private
describe("GET /api/job-application/:id/download", () => {
  it("returns 404 when application has no resume file", async () => {
    const application = await createTestApplication(); // no resumeFile

    const res = await request(app).get(`/api/job-application/${application._id}/download`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Resume file not found");
  });

  it("returns 404 for non-existent application", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app).get(`/api/job-application/${fakeId}/download`);

    expect(res.status).toBe(404);
  });

  it("returns 403 when downloading another user's resume", async () => {
    const otherUserId = new mongoose.Types.ObjectId();
    const application = await createTestApplication({
      userId: otherUserId,
      resumeFile: "https://example.com/resume.pdf",
      originalName: "resume.pdf",
    });

    const res = await request(app).get(`/api/job-application/${application._id}/download`);

    expect(res.status).toBe(403);
  });

  it("returns 401 if user is not authenticated", async () => {
    setAuthBehavior(false);
    const application = await createTestApplication({
      resumeFile: "https://example.com/resume.pdf",
    });

    const res = await request(app).get(`/api/job-application/${application._id}/download`);

    expect(res.status).toBe(401);
  });
});

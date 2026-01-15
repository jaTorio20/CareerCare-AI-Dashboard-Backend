jest.mock("../../../src/middleware/authMiddleware"); // uses __mocks__/authMiddleware.ts
jest.mock("../../../src/services/cloudinaryService"); // uses __mocks__/cloudinaryService.ts
jest.mock("../../../src/services/fileService");

import { parseFile } from "../../../src/services/fileService";
import request from "supertest";
import app from "../../../src/app";
import { JobApplicationModel } from "../../../src/models/JobApplication";

const { setAuthBehavior, mockUserId } = jest.requireMock("../../../src/middleware/authMiddleware");

beforeEach(async () => {
  jest.clearAllMocks();
  await JobApplicationModel.deleteMany({});
  setAuthBehavior(true);
});

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
        contentType: "text/plain" // <-- important
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

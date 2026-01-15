import request from "supertest";
import app from "../../../src/app";

const { setAuthBehavior } = jest.requireMock("src/middleware/authMiddleware");

describe("POST /api/job-application - Auth", () => {
  it("returns 401 when no token is provided", async () => {
    setAuthBehavior(true); 
    const res = await request(app)
      .post("/api/job-application")
      .send({
        companyName: "Netflix",
        jobTitle: "Engineer",
      });

    expect(res.status).toBe(401);
  });
});

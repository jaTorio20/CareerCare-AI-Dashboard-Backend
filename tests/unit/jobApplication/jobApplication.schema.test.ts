import { 
  createJobApplicationSchema, 
  updateJobApplicationSchema, 
  deleteJobApplicationSchema 
} from "../../../src/routes/jobApplication/jobApplication.schema";
import mongoose from "mongoose";

describe("JobApplication Zod Schemas", () => {
  // @route          POST /api/job-application
  // @description    Validates request body for creating a new job application
  // @access         Private
  describe("createJobApplicationSchema", () => {
    it("validates with required fields only", () => {
      const data = {
        body: {
          companyName: "Google",
          jobTitle: "Software Engineer",
        },
      };

      const result = createJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("validates with all optional fields", () => {
      const data = {
        body: {
          companyName: "Amazon",
          jobTitle: "Cloud Architect",
          jobDescription: "Design and implement cloud solutions",
          status: "interview",
          location: "hybrid",
          notes: "Had phone screen",
          salaryRange: "$180k-$220k",
        },
      };

      const result = createJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("fails when companyName is missing", () => {
      const data = {
        body: {
          jobTitle: "Developer",
        },
      };

      const result = createJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("companyName");
      }
    });

    it("fails when jobTitle is missing", () => {
      const data = {
        body: {
          companyName: "Microsoft",
        },
      };

      const result = createJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("jobTitle");
      }
    });

    it("fails when companyName is empty string", () => {
      const data = {
        body: {
          companyName: "",
          jobTitle: "Developer",
        },
      };

      const result = createJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("validates status enum values", () => {
      const validStatuses = ["applied", "interview", "offer", "rejected", "accepted"];
      
      for (const status of validStatuses) {
        const data = {
          body: {
            companyName: "Test",
            jobTitle: "Test",
            status,
          },
        };
        const result = createJobApplicationSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it("fails with invalid status value", () => {
      const data = {
        body: {
          companyName: "Test",
          jobTitle: "Test",
          status: "pending", // invalid
        },
      };

      const result = createJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("validates location enum values", () => {
      const validLocations = ["remote", "onsite", "hybrid"];
      
      for (const location of validLocations) {
        const data = {
          body: {
            companyName: "Test",
            jobTitle: "Test",
            location,
          },
        };
        const result = createJobApplicationSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it("fails with invalid location value", () => {
      const data = {
        body: {
          companyName: "Test",
          jobTitle: "Test",
          location: "anywhere", // invalid
        },
      };

      const result = createJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("fails when jobDescription exceeds 4000 characters", () => {
      const data = {
        body: {
          companyName: "Test",
          jobTitle: "Test",
          jobDescription: "a".repeat(4001),
        },
      };

      const result = createJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // @route          DELETE /api/job-application/:id
  // @description    Validates request params for deleting a job application
  // @access         Private
  describe("deleteJobApplicationSchema", () => {
    it("validates with valid ObjectId", () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const data = {
        params: {
          id: validId,
        },
      };

      const result = deleteJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("fails with invalid ObjectId", () => {
      const data = {
        params: {
          id: "invalid-id",
        },
      };

      const result = deleteJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid Job Application ID");
      }
    });

    it("fails with missing id", () => {
      const data = {
        params: {},
      };

      const result = deleteJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // @route          PUT /api/job-application/:id
  // @description    Validates request params and body for updating a job application
  // @access         Private
  describe("updateJobApplicationSchema", () => {
    const validId = new mongoose.Types.ObjectId().toString();

    it("validates with valid params and body", () => {
      const data = {
        params: { id: validId },
        body: {
          companyName: "Updated Company",
          jobTitle: "Updated Title",
        },
      };

      const result = updateJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("validates with partial body (all fields optional)", () => {
      const data = {
        params: { id: validId },
        body: {
          status: "offer",
        },
      };

      const result = updateJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("validates with empty body", () => {
      const data = {
        params: { id: validId },
        body: {},
      };

      const result = updateJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("fails with invalid ObjectId in params", () => {
      const data = {
        params: { id: "not-valid" },
        body: { companyName: "Test" },
      };

      const result = updateJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("fails with invalid status in body", () => {
      const data = {
        params: { id: validId },
        body: {
          status: "invalid-status",
        },
      };

      const result = updateJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("fails with invalid location in body", () => {
      const data = {
        params: { id: validId },
        body: {
          location: "invalid-location",
        },
      };

      const result = updateJobApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

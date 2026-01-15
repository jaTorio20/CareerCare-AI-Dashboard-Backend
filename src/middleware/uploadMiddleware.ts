import multer from "multer";
import { Request, Response, NextFunction } from "express";

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
      const err: any = new Error("Unsupported file type");
      err.code = "UNSUPPORTED_FILE";
      return cb(err);
    }

    cb(null, true);
  },
});

export const uploadSingle = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware.single(fieldName)(req, res, (err: any) => {
      if (err) {
        if (err.code === "UNSUPPORTED_FILE") {
          return res.status(400).json({ error: "Unsupported file type" });
        }
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File too large" });
        }
        return next(err);
      }
      next();
    });
  };
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

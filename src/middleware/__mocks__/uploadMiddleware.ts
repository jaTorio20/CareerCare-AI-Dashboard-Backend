// src/middleware/__mocks__/uploadMiddleware.ts
import { Readable } from "stream";

const files = {
  pdf: {
    originalname: "resume.pdf",
    mimetype: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 dummy PDF content"),
  },
  doc: {
    originalname: "resume.doc",
    mimetype: "application/msword",
    buffer: Buffer.from("Dummy DOC content"),
  },
  docx: {
    originalname: "resume.docx",
    mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: Buffer.from("Dummy DOCX content"),
  },
  txt: {
    originalname: "resume.txt",
    mimetype: "text/plain",
    buffer: Buffer.from("Dummy TXT content"),
  },
};

const allowedTypes = ["pdf", "doc", "docx"];

export default {
  single: (fieldName: string, type: "pdf" | "doc" | "docx" | "txt" = "pdf") =>
    (req: any, _res: any, next: any) => {
      const file = files[type];

      // Only attach req.file if it's allowed
      if (allowedTypes.includes(type)) {
        req.file = {
          fieldname: fieldName,
          originalname: file.originalname,
          mimetype: file.mimetype,
          buffer: file.buffer,
          stream: Readable.from(file.buffer),
          size: file.buffer.length,
          destination: "",
          filename: file.originalname,
          path: "",
          encoding: "7bit",
        };
      } else {
        req.file = undefined; // simulate unsupported file
      }

      next();
    },
};

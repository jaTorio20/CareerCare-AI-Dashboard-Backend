import mammoth from "mammoth";
import {PDFParse} from "pdf-parse";
import { ParsedFileInput } from "../types/file.types";

export async function parseFile(file: ParsedFileInput): Promise<string> {
  if (!file || !file.buffer) {
    throw new Error("No file buffer provided");
  }

  const mimeType = file.mimetype;

  if (mimeType === "application/pdf") {
    const convertData = new Uint8Array(file.buffer); // Convert Buffer to Uint8Array
    const data = new PDFParse(convertData);
    const result = await data.getText({});
    return result.text;
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

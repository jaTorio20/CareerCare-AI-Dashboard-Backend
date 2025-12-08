import pdfParse from "pdf-parse";
import { extractRawText } from "mammoth";

export async function parseFile(file: Express.Multer.File): Promise<string> {
  if (!file || !file.buffer) {
    throw new Error("No file buffer provided");
  }

  const mimeType = file.mimetype;

  if (mimeType === "application/pdf") {
    const data = await pdfParse(file.buffer);
    return data.text;
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const result = await extractRawText({ buffer: file.buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

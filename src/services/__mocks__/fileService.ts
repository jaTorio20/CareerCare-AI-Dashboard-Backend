export const parseFile = jest.fn(async (file) => {
  if (!file || !file.buffer) {
    throw new Error("No file buffer provided");
  }

  const mimeType = file.mimetype;

  if (mimeType === "application/pdf") {
    return "Mocked PDF text content";
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return "Mocked Word text content";
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
});

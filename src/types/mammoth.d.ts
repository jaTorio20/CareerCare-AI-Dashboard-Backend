declare module "mammoth" {
  interface MammothResult {
    value: string; // extracted text
    messages: { type: string; message: string }[];
  }

  export function extractRawText(input: {
    buffer: Buffer;
  }): Promise<MammothResult>;
}

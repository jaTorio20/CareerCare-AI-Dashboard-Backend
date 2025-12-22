import fs from "fs";
import { Client } from "@gradio/client";


export async function transcribeWithWhisper(audioPath: string) {
  // Connect to your Hugging Face Space
  const client = await Client.connect("jTorio30/speech-to-text");

  // Convert local file into a Blob
  const fileBlob = new Blob([fs.readFileSync(audioPath)], { type: "audio/wav" });

  // Call the custom API endpoint `/transcribe`
  const result = await client.predict("/transcribe", {
    audio_path: fileBlob,
  });

  console.log("Whisper response:", result.data);
  const data = result.data as any[]; 
  return data?.[0] ?? "";
}


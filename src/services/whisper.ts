import fs from "fs";
import { Client } from "@gradio/client";


export async function transcribeWithWhisper(audioBuffer: Buffer) {
  const uint8 = new Uint8Array(audioBuffer);
  const arrayBuffer: ArrayBuffer = uint8.buffer;

  // Create Blob from ArrayBuffer 
  const fileBlob = new Blob([arrayBuffer], { type: "audio/wav" }); 
  const client = await Client.connect("jTorio30/speech-to-text"); 
  const result = await client.predict("/transcribe", { audio_path: fileBlob, });

  console.log("Whisper response:", result.data);
  const data = result.data as any[]; 
  return data?.[0] ?? "";
}


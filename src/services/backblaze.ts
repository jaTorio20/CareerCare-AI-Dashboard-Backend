import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import { Readable } from "stream";

export const s3 = new S3Client({
  region: "us-east-005",
  endpoint: "https://s3.us-east-005.backblazeb2.com",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APP_KEY!,
  },
});

export async function uploadAudioToB2(file: Express.Multer.File) {
  const key = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.B2_BUCKET!,
      Key: key,
      Body: file.buffer, // pass buffer directly
      ContentType: file.mimetype,
      ContentLength: file.size, // explicitly set length
    })
  );


  return key;
}


export async function getAudioSignedUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.B2_BUCKET!,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn: 300 });
}

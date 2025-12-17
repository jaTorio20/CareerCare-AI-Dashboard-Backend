import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import path from "path";
import { v4 as uuidv4 } from "uuid";


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export function uploadToCloudinary(fileBuffer: Buffer, folderName = "resumes"): Promise<any> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { 
        resource_type: "raw", 
        folder: folderName
      }, // raw = for PDFs/DOCX
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
}

export function uploadToCloudinaryJobApplication(
  fileBuffer: Buffer,
  originalName: string,
  folderName = "resumes/jobApplication"
): Promise<any> {
  return new Promise((resolve, reject) => {
    const uniqueId = uuidv4();
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw", // raw = for PDFs/DOCX
        folder: folderName,
        use_filename: true,
        unique_filename: false,
        public_id: `${uniqueId}_${Date.now()}_${originalName}`
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
}
export const uploadToCloudinary = jest.fn((fileBuffer: Buffer, folderName?: string) =>
  Promise.resolve({
    secure_url: "https://mocked.cloudinary.com/fake.pdf",
    public_id: "mocked_public_id",
  })
);

export const uploadToCloudinaryJobApplication = jest.fn(
  (fileBuffer: Buffer, originalName: string, folderName?: string) =>
    Promise.resolve({
      secure_url: `https://mocked.cloudinary.com/${originalName}`,
      public_id: `mocked_public_id_${originalName}`,
    })
);

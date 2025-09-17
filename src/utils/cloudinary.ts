import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryUpload = async (
	file: Buffer
): Promise<UploadApiResponse> => {
	if (!file || file.length === 0) {
		throw new Error("File buffer is empty or invalid");
	}
	const base64String = `data:image/jpeg;base64,${file.toString("base64")}`;

	try {
		const result = await cloudinary.uploader.upload(base64String, {
			folder: "evidence",
		});
		return result;
	} catch (error) {
		console.error("Cloudinary upload failed:", error);
		throw new Error("Failed to upload file to Cloudinary.");
	}
};

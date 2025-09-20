import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
	url: string;
	public_id: string;
}

export class CloudinaryService {
	/**
	 * Upload an image buffer to Cloudinary
	 */
	static async uploadImage(
		buffer: Buffer,
		folder: string = 'products'
	): Promise<UploadResult> {
		return new Promise((resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						folder,
						resource_type: 'image',
						transformation: [
							{ width: 800, height: 800, crop: 'limit' },
							{ quality: 'auto' },
							{ fetch_format: 'auto' },
						],
					},
					(error, result) => {
						if (error) {
							reject(error);
						} else if (result) {
							resolve({
								url: result.secure_url,
								public_id: result.public_id,
							});
						} else {
							reject(new Error('Upload failed'));
						}
					}
				)
				.end(buffer);
		});
	}

	/**
	 * Delete an image from Cloudinary
	 */
	static async deleteImage(publicId: string): Promise<void> {
		try {
			await cloudinary.uploader.destroy(publicId);
		} catch (error) {
			console.error('Error deleting image from Cloudinary:', error);
			// Don't throw error as this is not critical
		}
	}

	/**
	 * Extract public_id from Cloudinary URL
	 */
	static extractPublicId(url: string): string | null {
		const match = url.match(/\/([^\/]+)\.[^\/]+$/);
		return match ? match[1] : null;
	}
}

// Legacy function from main branch for compatibility
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

export default CloudinaryService;

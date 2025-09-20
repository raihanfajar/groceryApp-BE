import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { CloudinaryService } from '../utils/cloudinary';
import { ApiError } from '../utils/ApiError';

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
	storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB limit
	},
	fileFilter: (req, file, cb) => {
		// Only allow image files
		if (file.mimetype.startsWith('image/')) {
			cb(null, true);
		} else {
			cb(new Error('Only image files are allowed'));
		}
	},
});

// Middleware to handle multiple image uploads
export const uploadProductImages = upload.fields([
	{ name: 'picture1', maxCount: 1 },
	{ name: 'picture2', maxCount: 1 },
	{ name: 'picture3', maxCount: 1 },
	{ name: 'picture4', maxCount: 1 },
]);

// Middleware to upload images to Cloudinary and add URLs to req.body
export const processProductImages = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const files = req.files as { [fieldname: string]: Express.Multer.File[] };

		if (files) {
			const uploadPromises: Promise<void>[] = [];

			// Process each image field
			for (const fieldName of [
				'picture1',
				'picture2',
				'picture3',
				'picture4',
			]) {
				if (files[fieldName] && files[fieldName][0]) {
					const file = files[fieldName][0];

					uploadPromises.push(
						CloudinaryService.uploadImage(file.buffer, 'products').then(
							(result) => {
								req.body[fieldName] = result.url;
							}
						)
					);
				}
			}

			// Wait for all uploads to complete
			await Promise.all(uploadPromises);
		}

		next();
	} catch (error) {
		console.error('Error processing images:', error);
		next(new ApiError(500, 'Error uploading images'));
	}
};

export default { uploadProductImages, processProductImages };

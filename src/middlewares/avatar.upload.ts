import { Request } from 'express';
import multer from 'multer';

const avatarFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    // accept only jpg/jpeg/png/gif
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only .jpg, .jpeg, .png, .gif allowed'));
    }
    cb(null, true);
};

export const uploadAvatar = multer({
    limits: { fileSize: 1024 * 1024 }, // 1 MB
    fileFilter: avatarFilter,
    storage: multer.memoryStorage(), // keep file in RAM → pass buffer to Cloudinary
}).single('avatar'); // <input name="avatar"> or Postman form-key "avatar"
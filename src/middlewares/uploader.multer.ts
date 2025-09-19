import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import path from "path";
import { v4 as uuidv4 } from "uuid"; // Menggunakan UUID untuk nama file unik
import fs from "fs";
import { ApiError } from "../utils/ApiError";


// Lebih baik path tujuan diambil dari env variable
const UPLOAD_DIRECTORY = process.env.UPLOAD_DIR!;

export const uploaderMulter = (
  acceptedMimeTypes: string[],
  storageType: "disk" | "memory" = "memory", // Default ke memory jika tidak dispesifikasikan
  fileSizeLimit: number = 1000000 // 1MB
) => {
  // Pastikan direktori tujuan ada jika menggunakan disk storage
  if (storageType === "disk" && !fs.existsSync(UPLOAD_DIRECTORY)) {
    fs.mkdirSync(UPLOAD_DIRECTORY, { recursive: true });
  }

  const storage =
    storageType === "disk"
      ? multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, UPLOAD_DIRECTORY);
        },
        filename: (req, file, cb) => {
          // IMPROVEMENT: Menggunakan path.extname untuk ekstensi yang andal
          const fileExtension = path.extname(file.originalname);
          // IMPROVEMENT: Menggunakan UUID untuk nama yang benar-benar unik
          const uniqueFilename = `${uuidv4()}${fileExtension}`;
          cb(null, uniqueFilename);
        },
      })
      : multer.memoryStorage();

  const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    // Mengecek tipe utama, misal 'image' dari 'image/jpeg'
    const mimeType = file.mimetype.split("/")[0];

    if (!acceptedMimeTypes.includes(mimeType)) {
      // FIX: Tambahkan return agar callback tidak dipanggil dua kali
      return cb(
        new ApiError(
          415,
          `File type '${mimeType}' is not accepted.`
        )
      );
    }
    // Jika tipe file diterima
    cb(null, true);
  };

  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: fileSizeLimit },
  });
};
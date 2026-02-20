import multer from "multer";

/**
 * Multer configuration for acne image uploads
 * - Stores files in memory for direct streaming to ML API
 * - Validates JPG/JPEG format only
 * - Maximum 10MB file size per image
 * - Maximum 6 files (one per body area)
 */

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Only allow JPG/JPEG files
  const allowedMimes = ["image/jpeg", "image/jpg"];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG/JPEG images are allowed"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10 // Maximum 6 body areas
  }
});

export default upload;

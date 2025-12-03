const multer = require('multer');
const path = require('path');
const fs = require('fs');

// This function ensures a directory exists; if not, Multer will fail.
// We'll use it to create album-specific folders later.
function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Multer disk storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Basic version: all uploads go to /uploads
    const uploadPath = path.join(__dirname, '..', '..', 'uploads');
    ensureDirExists(uploadPath);
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    // Create a unique filename
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});

// Optional: limit file size or filter file types
const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
});

module.exports = upload;

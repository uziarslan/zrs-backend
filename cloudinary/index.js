const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary with a 10-minute timeout
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
  timeout: 600000, // Timeout in milliseconds (10 minutes)
});

// Configure Cloudinary Storage with Image Compression and Resizing
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "ZRS CAR TRADING", // Folder name in Cloudinary
    allowedFormats: ["jpeg", "png", "jpg"], // Allowed image formats
    public_id: (req, file) => `${Date.now()}-${file.originalname}`, // Unique public ID for each file
    transformation: [
      {
        quality: "auto:low",
      },
    ],
  },
});

module.exports = {
  cloudinary,
  storage,
};

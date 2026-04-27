const { cloudinary } = require("../cloudinary");

const deleteImageFromCloudinary = async (filename) => {
  try {
    await cloudinary.uploader.destroy(filename);
  } catch (error) {
    console.error(`Failed to delete image ${filename} from Cloudinary:`, error);
    throw error;
  }
};

const cleanupUploadedImages = async (filenames) => {
  if (!Array.isArray(filenames) || filenames.length === 0) return;

  const errors = [];
  for (const filename of filenames) {
    try {
      await deleteImageFromCloudinary(filename);
    } catch (error) {
      errors.push({ filename, error: error.message });
    }
  }

  if (errors.length > 0) {
    console.error("Failed to cleanup some images:", errors);
  }
};

module.exports = {
  deleteImageFromCloudinary,
  cleanupUploadedImages,
};

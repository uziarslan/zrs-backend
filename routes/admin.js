const express = require("express");
const wrapAsync = require("../utils/wrapAsync");
const { protect } = require("../middlewares/authMiddleware");
const {
  registerAdmin,
  adminLogin,
  getAdmin,
  deleteImg,
  updateManufacturer,
  createManufacturer,
  createVehicleType,
  getVehicleTypes,
  updateVehicleType,
  deleteVehicleType,
  getVehicleTrims,
  createVehicleTrim,
  updateVehicleTrim,
  deleteVehicleTrim,
  createCar,
  getAllCars,
  updateCar,
  deleteCar,
  getContactUs,
  createContactUs,
  getTestDrives,
  createBlog,
  getAllBlogs,
  editBlog,
  deleteBlog,
  getBuyNowCars,
  unsubscribeUser,
  updateLogoOrder,
  getImageStatus,
  getCloudinarySignature,
} = require("../controllers/admin");

const router = express();

// Auth
router.post("/admin/signup", wrapAsync(registerAdmin));
router.post("/admin/login", wrapAsync(adminLogin));
router.get("/admin", protect, wrapAsync(getAdmin));

// Cloudinary signature for direct browser uploads
router.get("/cloudinary-signature", protect, wrapAsync(getCloudinarySignature));

// Manufacturers — image is uploaded directly from browser to Cloudinary,
// the JSON body just carries { brandName, logo: { path, filename } }
router.delete("/delete-logo", protect, wrapAsync(deleteImg));
router.put("/update-manufacturer/:editId", protect, wrapAsync(updateManufacturer));
router.post("/create-manufacturer", protect, wrapAsync(createManufacturer));
router.post("/update-logo-order", protect, wrapAsync(updateLogoOrder));

// Vehicle types
router.post("/create-vehicle-type", protect, wrapAsync(createVehicleType));
router.get("/fetch-vehicle-types", wrapAsync(getVehicleTypes));
router.put("/update-vehicle-type/:id", protect, wrapAsync(updateVehicleType));
router.delete("/delete-vehicle-type/:id", protect, wrapAsync(deleteVehicleType));

// Vehicle trims
router.get("/fetch-vehicle-trims", protect, wrapAsync(getVehicleTrims));
router.post("/create-vehicle-trim", protect, wrapAsync(createVehicleTrim));
router.put("/update-vehicle-trim/:id", protect, wrapAsync(updateVehicleTrim));
router.delete("/delete-vehicle-trim/:id", protect, wrapAsync(deleteVehicleTrim));

// Cars — JSON only; the browser uploads images straight to Cloudinary first
router.post("/cars", protect, wrapAsync(createCar));
router.get("/cars", protect, wrapAsync(getAllCars));
router.put("/:id", protect, wrapAsync(updateCar));
router.delete("/:id", protect, wrapAsync(deleteCar));

// Customer submissions
router.get("/contact-us", protect, wrapAsync(getContactUs));
router.post("/contact-us", wrapAsync(createContactUs));
router.get("/test-drives", wrapAsync(getTestDrives));
router.get("/buy-car", wrapAsync(getBuyNowCars));

// Blogs
router.post("/blogs", protect, wrapAsync(createBlog));
router.get("/blogs", wrapAsync(getAllBlogs));
router.put("/blogs/:id", protect, wrapAsync(editBlog));
router.delete("/blogs/:id", protect, wrapAsync(deleteBlog));

router.get("/unsubscribe/:id", wrapAsync(unsubscribeUser));

// Polling endpoint kept for backward-compat — no longer used by the new flow
router.get("/upload-status/:type/:id", wrapAsync(getImageStatus));

module.exports = router;

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
} = require("../controllers/admin");
const multer = require("multer");
const { storage } = require("../cloudinary");
const upload = multer({ storage });

const router = express();

// Handling and saving the admin credentials
router.post("/admin/signup", wrapAsync(registerAdmin));

// Fetching and verify user request
router.post("/admin/login", wrapAsync(adminLogin));

// Fetching User for frontend
router.get("/admin", protect, wrapAsync(getAdmin));

// Delete Img from Cloudinary
router.delete("/delete-logo", protect, wrapAsync(deleteImg));

// Editing Manufature info and uploading the images to cloudinary if any
router.put(
  "/update-manufacturer/:editId",
  upload.single("logo"),
  wrapAsync(updateManufacturer)
);

// Creating the Manufacturer
router.post(
  "/create-manufacturer",
  protect,
  upload.single("logo"),
  wrapAsync(createManufacturer)
);

// Creating a vehicle type after creating a manufacturer
router.post("/create-vehicle-type", protect, wrapAsync(createVehicleType));

// Fetch all vehicle types
router.get("/fetch-vehicle-types", wrapAsync(getVehicleTypes));

// Update an existing vehicle type
router.put("/update-vehicle-type/:id", protect, wrapAsync(updateVehicleType));

// Delete a vehicle type
router.delete(
  "/delete-vehicle-type/:id",
  protect,
  wrapAsync(deleteVehicleType)
);

// Fetch vehicle Trim
router.get("/fetch-vehicle-trims", protect, wrapAsync(getVehicleTrims));

// Create vehicle trim
router.post("/create-vehicle-trim", protect, wrapAsync(createVehicleTrim));

// Edit Vehicle Trim
router.put("/update-vehicle-trim/:id", protect, wrapAsync(updateVehicleTrim));

// Delete the Vehicle Trim
router.delete(
  "/delete-vehicle-trim/:id",
  protect,
  wrapAsync(deleteVehicleTrim)
);

// Car creation
router.post("/cars", upload.array("images"), wrapAsync(createCar));

// Fetching all cars
router.get("/cars", protect, wrapAsync(getAllCars));

// Update a car (including image management)
router.put(
  "/:id",
  upload.array("images"), // Handle multiple image uploads via middleware
  wrapAsync(updateCar)
);

// Delete a car (including its images)
router.delete("/:id", wrapAsync(deleteCar));

// Router to fetch contact us data
router.get("/contact-us", protect, wrapAsync(getContactUs));

// Add this line
router.post("/contact-us", wrapAsync(createContactUs));

// Fetch test drive data
router.get("/test-drives", wrapAsync(getTestDrives)); // Add this line


// Create a blog post
router.post("/blogs", protect, upload.single("image"), wrapAsync(createBlog));

// Get all blog posts
router.get("/blogs", wrapAsync(getAllBlogs)); // Public access to fetch all blogs

// Edit a blog post
router.put("/blogs/:id", protect, upload.single("image"), wrapAsync(editBlog));

// Delete a blog post
router.delete("/blogs/:id", protect, wrapAsync(deleteBlog));

module.exports = router;

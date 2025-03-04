const express = require("express");
const wrapAsync = require("../utils/wrapAsync");
const {
  fetchLogos,
  fetchCars,
  getCar,
  getFilteredCars,
  getCarCompanies,
  createSellCar,
  createFinanceEligibility,
  getFinanceEligibility,
  getSellCarFormData,
  createTestDrive,
  getSingleBlog,
  getLatestBlogs,
  subscribeUser
} = require("../controllers/homepage");

const multer = require("multer");
const { storage } = require("../cloudinary");
const upload = multer({ storage });

const router = express();

// Fetch all the logos for homepage
router.get("/fetch-logos", wrapAsync(fetchLogos));

// fetch cars based on the query params
router.get("/cars/featured", wrapAsync(fetchCars));

// Fetch all the cars
router.get("/cars/test-drive", wrapAsync(fetchCars));

// post the test drive form data
router.post("/test-drive", wrapAsync(createTestDrive));

// Fetch a single car
router.get("/car/:id", wrapAsync(getCar));

// Fetch all companies
router.get("/companies", wrapAsync(getCarCompanies));

// Fetch all the cars for the filter's page
router.get("/cars/filter", wrapAsync(getFilteredCars));

// Sell Car form Submission
router.post("/sell-car", upload.array("images"), wrapAsync(createSellCar));

// Fetch the sell car form data
router.get("/sell-car", wrapAsync(getSellCarFormData));

// Finance Form Submiition
router.post("/finance-eligibility", wrapAsync(createFinanceEligibility));

// Get Finance Eligibility Documents
router.get("/finance-eligibility", wrapAsync(getFinanceEligibility));

// Fetch latest blogs
router.get('/blogs/latest', wrapAsync(getLatestBlogs));

// Fetch a single blog
router.get('/blogs/:id', wrapAsync(getSingleBlog));


// Handle the subscribe emails
router.post("/subscribe", wrapAsync(subscribeUser));



module.exports = router;

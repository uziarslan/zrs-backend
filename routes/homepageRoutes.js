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
} = require("../controllers/homepage");

const multer = require("multer");
const { storage } = require("../cloudinary");
const upload = multer({ storage });

const router = express();

// Fetch all the logos for homepage
router.get("/fetch-logos", wrapAsync(fetchLogos));

// fetch cars based on the query params
router.get("/cars/featured", wrapAsync(fetchCars));

// Fetch a single car
router.get("/car/:id", wrapAsync(getCar));

// Fetch all companies
router.get("/companies", wrapAsync(getCarCompanies));

// Fetch all the cars for the filter's page
router.get("/cars/filter", wrapAsync(getFilteredCars));

// Sell Car form Submission
router.post("/sell-car", upload.array("images"), wrapAsync(createSellCar));

// Finance Form Submiition
router.post("/finance-eligibility", wrapAsync(createFinanceEligibility));

// Get Finance Eligibility Documents
router.get("/finance-eligibility", wrapAsync(getFinanceEligibility));

module.exports = router;

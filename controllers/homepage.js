const mongoose = require("mongoose");
const Manufacturer = mongoose.model("Manufacturer");
const Car = mongoose.model("Car");
const SellCar = mongoose.model("SellCar");
const FinanceEligibility = mongoose.model("FinanceEligibility");
const TestDrive = mongoose.model("TestDrive");
const Blog = mongoose.model("Blog");
const Subscribe = mongoose.model("Subscribe");
const BuyCar = mongoose.model("BuyCar");

const fetchLogos = async (req, res) => {
  try {
    // Fetch all manufacturers with their brandName and logo, sorted by updatedAt
    const manufacturers = await Manufacturer.find({}, "brandName logo")
      .sort({ order: 1 })
      .lean();

    res.status(200).json({ logos: manufacturers });
  } catch (error) {
    console.error("Error fetching logos:", error);
    res.status(500).json({ error: "Failed to fetch logos" });
  }
};

const fetchCars = async (req, res) => {
  const { featured, testDrive } = req.query;

  let cars;
  if (featured) {
    cars = await Car.find({ featured: featured })
      .populate("manufacturerId")
      .populate("vehicleTypeId")
      .populate("trimId");
  } else if (testDrive) {
    cars = await Car.find({ testDrive: "yes" })
      .populate("manufacturerId")
      .populate("vehicleTypeId")
      .populate("trimId");
  }

  if (!cars) return res.status(400).json({ error: "Invalid Search" });

  res.status(200).json(cars);
};

const getCar = async (req, res) => {
  const { id } = req.params;

  const car = await Car.findById(id)
    .populate("manufacturerId")
    .populate("vehicleTypeId")
    .populate("trimId");

  if (!car) return res.status(404).json({ error: "No such car found." });

  res.status(200).json(car);
};

// Fetch all the cars using filters
const getFilteredCars = async (req, res) => {
  try {
    const {
      mileage,
      yearBuilt,
      monthlyInstallment,
      companies,
      bodyTypes,
      availableNow,
      vehicleType,
      title,
    } = req.query;

    let query = {};

    // Return all cars if no filters are provided
    if (
      !mileage &&
      !yearBuilt &&
      !monthlyInstallment &&
      !companies &&
      !bodyTypes &&
      !availableNow &&
      !vehicleType &&
      !title
    ) {
      const cars = await Car.find({})
        .populate("manufacturerId")
        .populate("vehicleTypeId")
        .populate("trimId")
        .lean();
      return res.json({ cars });
    }

    // Other Filters (unchanged)
    if (mileage) {
      const [minMileage, maxMileage] = mileage
        .split(",")
        .map((m) => parseInt(m) || 0);
      if (!isNaN(minMileage) && !isNaN(maxMileage)) {
        query.$expr = query.$expr || { $and: [] };
        query.$expr.$and.push({
          $and: [
            {
              $gte: [
                {
                  $toInt: { $arrayElemAt: [{ $split: ["$mileage", " "] }, 0] },
                },
                minMileage,
              ],
            },
            {
              $lte: [
                {
                  $toInt: { $arrayElemAt: [{ $split: ["$mileage", " "] }, 0] },
                },
                maxMileage,
              ],
            },
          ],
        });
      }
    }

    if (yearBuilt) {
      const [minYear, maxYear] = yearBuilt
        .split(",")
        .map((y) => parseInt(y) || 0);
      if (!isNaN(minYear) && !isNaN(maxYear)) {
        query.$expr = query.$expr || { $and: [] };
        query.$expr.$and.push(
          { $gte: [{ $toInt: "$year" }, minYear] },
          { $lte: [{ $toInt: "$year" }, maxYear] }
        );
      }
    }

    if (monthlyInstallment) {
      const [minInstallment, maxInstallment] = monthlyInstallment
        .split(",")
        .map((m) => parseInt(m) || 0);
      if (!isNaN(minInstallment) && !isNaN(maxInstallment)) {
        query.originalPrice = {
          $gte: minInstallment * 12,
          $lte: maxInstallment * 12,
        };
      }
    }

    if (companies) {
      const companyArray = companies.split(",").filter(Boolean);
      if (companyArray.length > 0) {
        const manufacturers = await Manufacturer.find({
          brandName: {
            $in: companyArray.map((c) => new RegExp(`^${c}$`, "i")),
          },
        }).select("_id");
        const manufacturerIds = manufacturers.map((m) => m._id);
        query.manufacturerId = { $in: manufacturerIds };
      }
    }

    if (bodyTypes) {
      const bodyTypeArray = bodyTypes.split(",").filter(Boolean);
      if (bodyTypeArray.length > 0) {
        query.bodyType = {
          $in: bodyTypeArray.map((t) => new RegExp(`^${t}$`, "i")),
        };
      }
    }

    if (vehicleType) {
      query.vehicleTypeId = vehicleType;
    }

    if (availableNow === "true") {
      query.saleStatus = "for-sale";
    }

    // Fetch all cars matching other filters first
    let cars = await Car.find(query)
      .populate("manufacturerId")
      .populate("vehicleTypeId")
      .populate("trimId")
      .lean();

    // Apply title filter post-query if provided
    if (title) {
      const titleLower = title.toLowerCase();
      cars = cars.filter((car) => {
        const constructedTitle = `${car.manufacturerId?.brandName || ""} ${car.vehicleTypeId?.modelName || ""
          } ${car.trimId?.trimName || ""}`.toLowerCase();
        const carTitle = car.title ? car.title.toLowerCase() : "";
        return (
          (carTitle && carTitle.includes(titleLower)) ||
          constructedTitle.includes(titleLower)
        );
      });
    }

    res.json({ cars });
  } catch (error) {
    console.error("Error filtering cars:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getCarCompanies = async (req, res) => {
  const manufacturer = await Manufacturer.find({});
  res.json(manufacturer);
};

const createSellCar = async (req, res) => {
  try {
    // Extract text fields from req.body
    const {
      manufacturer,
      vehicleType,
      year,
      mileage,
      price,
      origin,
      emirates,
      tradeIn,
      fullName,
      mobileNumber,
      email,
      description,
    } = req.body;

    // Map Cloudinary-uploaded images to schema format (req.files from middleware)
    const images = req.files.map((file) => ({
      path: file.path, // Cloudinary URL
      filename: file.filename, // Cloudinary public ID
    }));

    // Create new SellCar document
    const sellCar = new SellCar({
      manufacturer,
      vehicleType,
      year,
      mileage,
      price,
      origin,
      emirates,
      tradeIn,
      fullName,
      mobileNumber,
      email,
      description,
      images,
    });

    // Save to MongoDB
    await sellCar.save();
    res
      .status(201)
      .json({ message: "Car listing created successfully", sellCar });
  } catch (error) {
    console.error("Error creating sell car listing:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const createFinanceEligibility = async (req, res) => {
  try {
    const {
      manufacturer,
      vehicleType, // Changed from model
      fullName,
      mobileNumber,
      email,
      salary,
      hasExistingLoans,
    } = req.body;

    // Create new FinanceEligibility document
    const financeEntry = new FinanceEligibility({
      manufacturer,
      vehicleType,
      fullName,
      mobileNumber,
      email,
      salary,
      hasExistingLoans,
    });

    // Save to MongoDB
    await financeEntry.save();
    res.status(201).json({
      message: "Finance eligibility submitted successfully",
      financeEntry,
    });
  } catch (error) {
    console.error("Error creating finance eligibility:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getFinanceEligibility = async (req, res) => {
  try {
    const financeData = await FinanceEligibility.find().lean();
    res.json(financeData);
  } catch (error) {
    console.error("Error fetching finance eligibility data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getSellCarFormData = async (req, res) => {
  const sellCarFormData = await SellCar.find().lean();
  res.json(sellCarFormData);
};

const createTestDrive = async (req, res) => {
  try {
    const { fullName, email, mobileNumber, date, time, carId } = req.body;

    // Create new TestDrive document
    const testDrive = new TestDrive({
      fullName,
      email,
      mobileNumber,
      date,
      time,
      carId,
    });

    // Save to MongoDB
    await testDrive.save();
    res.status(201).json({
      message: "Test drive request submitted successfully",
      testDrive,
    });
  } catch (error) {
    console.error("Error creating test drive request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const createBuyCar = async (req, res) => {
  try {
    const { firstName, lastName, mobileNumber, email, carId } = req.body;

    // Create new TestDrive document
    const buycar = new BuyCar({
      firstName,
      lastName,
      email,
      mobileNumber,
      carId
    });

    // Save to MongoDB
    await buycar.save();
    res.status(201).json({
      message: "Buy car request submitted successfully",
      buycar,
    });
  } catch (error) {
    console.error("Error creating Buy car request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

const getSingleBlog = async (req, res) => {
  const { id } = req.params;

  const blog = await Blog.findById(id).populate("postedBy", "name");

  if (!blog) return res.status(404).json({ error: "No such blog found." });

  res.status(200).json(blog);
}

// controllers/blogController.js
const getLatestBlogs = async (req, res) => {
  const limit = parseInt(req.query.limit) || 4;

  const blogs = await Blog.find({})
    .sort({ createdAt: -1 }) // Sort descending (newest first)
    .limit(limit)
    .select('title createdAt') // Only return title and createdAt
    .lean(); // Return plain JS objects to avoid Mongoose document overhead

  if (!blogs || blogs.length === 0) {
    return res.status(404).json({ message: 'No blogs found' });
  }

  res.json(blogs);
};


const subscribeUser = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  const subscribe = await Subscribe.find({ email });

  if (subscribe.length > 0) {
    return res.status(400).json({ error: "Email already subscribed" });
  }

  const newSubscribe = new Subscribe({ email });
  await newSubscribe.save();

  res.status(201).json({ success: "Subscribed successfully" });
}


module.exports = {
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
  subscribeUser,
  createBuyCar
};

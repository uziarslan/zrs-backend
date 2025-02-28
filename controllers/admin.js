const mongoose = require("mongoose");
const Admin = mongoose.model("Admin");
const Manufacturer = mongoose.model("Manufacturer");
const VehicleType = mongoose.model("VehicleType");
const VehicleTrim = mongoose.model("VehicleTrim");
const TestDrive = require("../models/testDrive");
const Car = mongoose.model("Car");
const ContactUs = require("../models/contactus");
const jwt = require("jsonwebtoken");
const agenda = require("../middlewares/agenda");
const { MailtrapClient } = require("mailtrap");

// Mailtrap Integration
const TOKEN = process.env.MAIL_TRAP_TOKEN;
const client = new MailtrapClient({ token: TOKEN });
const sender = {
  email: "info@unionmade.net",
  name: "Union Made Apparel",
};

const jwt_secret = process.env.JWT_SECRET;

const generateToken = (id) => {
  return jwt.sign({ id }, jwt_secret, {
    expiresIn: "30d",
  });
};

const registerAdmin = async (req, res) => {
  const { username, password } = req.body;

  const foundAdmin = await Admin.findOne({ username });

  if (foundAdmin)
    return res
      .status(500)
      .json({ error: "Email already in use. Try differnt one." });

  if (!username) return res.status(500).json({ error: "Email is required." });

  if (!password)
    return res.status(500).json({ error: "Password is required." });

  const admin = await Admin.create({
    ...req.body,
  });

  res.status(201).json({
    token: generateToken(admin._id),
    success: "Email has been registered",
  });
};

const adminLogin = async (req, res) => {
  const { username, password } = req.body;

  const admin = await Admin.findOne({ username });

  if (!admin)
    return res.status(400).json({ error: "Invalid email or password" });

  if (await admin.matchPassword(password)) {
    return res.status(201).json({
      token: generateToken(admin._id),
    });
  }
  return res.status(400).json({ error: "Invalid email or password" });
};

const getAdmin = async (req, res) => {
  const admin = await Admin.findById(req.user.id).select("-password");

  if (!admin) {
    return res.status(400).json({ error: "Invalid admin" });
  }

  res.json(admin);
};

const deleteImg = async (req, res) => {
  const { _id, filename } = req.query;
  if (filename) {
    const manufacturer = await Manufacturer.findById(_id);
    if (!manufacturer) {
      return res.status(404).json({ error: "Manufacturer not found" });
    }

    // Since we're dealing with a single logo, we don't need to filter an array
    if (manufacturer.logo && manufacturer.logo.filename === filename) {
      // If the logo exists and its filename matches, set it to null
      manufacturer.logo = null;
    } else {
      // If the logo doesn't match or doesn't exist, inform the user
      return res
        .status(400)
        .json({ error: "Logo not found or does not match" });
    }

    await manufacturer.save();
    // Schedule the deletion of the file from Cloudinary
    await agenda.now("deleteFileFromCloudinary", { filename });
    res.status(200).json({ success: "Logo deleted successfully" });
  } else {
    res.status(400).json({ error: "Filename is required" });
  }
};

const updateManufacturer = async (req, res, next) => {
  const { editId } = req.params;
  const { brandName } = req.body;
  let logo = req.file ? req.file : null;

  // First, find the manufacturer to check its current logo status
  const manufacturer = await Manufacturer.findById(editId);

  // If the manufacturer was not found
  if (!manufacturer) {
    return res.status(404).json({ error: "Manufacturer not found" });
  }

  // Check if there's no logo or if the logo is being removed (empty logo)
  if (
    (!manufacturer.logo ||
      (!manufacturer.logo.path && !manufacturer.logo.filename)) &&
    !logo
  ) {
    return res.status(400).json({
      error: "A logo image is required when there is no existing logo",
    });
  }

  // Update the manufacturer
  const updatedManufacturer = await Manufacturer.findByIdAndUpdate(
    editId,
    {
      brandName: brandName,
      logo: logo
        ? {
            path: logo.path,
            filename: logo.filename,
          }
        : manufacturer.logo, // If no new logo is provided, keep the current one
    },
    { new: true, runValidators: true }
  );

  // Send back the updated manufacturer
  res.status(200).json({
    success: "Manufacturer updated successfully",
    manufacturer: updatedManufacturer,
  });
};

const createManufacturer = async (req, res) => {
  const { brandName } = req.body;

  if (!brandName || !req.file) {
    return res
      .status(400)
      .json({ error: "Manufacturer name and logo are required" });
  }

  const newManufacturer = new Manufacturer({
    brandName,
    logo: {
      filename: req.file.filename,
      path: req.file.path,
    },
  });

  await newManufacturer.save();
  res.status(201).json({ success: "Brand created successfully." });
};

const createVehicleType = async (req, res) => {
  try {
    const { manufacturer, modelName } = req.body;

    // Validate required fields
    if (!manufacturer || !modelName) {
      return res
        .status(400)
        .json({ error: "Manufacturer and model name are required" });
    }

    // Check if the manufacturer exists
    const existingManufacturer = await Manufacturer.findById(manufacturer);
    if (!existingManufacturer) {
      return res.status(404).json({ error: "Manufacturer not found" });
    }

    // Create the vehicle type
    const vehicleType = await VehicleType.create({
      manufacturer,
      modelName,
    });

    res.status(201).json({
      success: "Vehicle type created successfully",
      vehicleType,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create vehicle type" });
  }
};

const getVehicleTypes = async (req, res) => {
  const vehicleTypes = await VehicleType.find()
    .populate("manufacturer")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    vehicleTypes,
  });
};

const updateVehicleType = async (req, res) => {
  const { manufacturer, modelName } = req.body;
  const { id } = req.params;

  if (!manufacturer || !modelName) {
    throw new Error("Manufacturer and model name are required");
  }

  const existingManufacturer = await Manufacturer.findById(manufacturer);
  if (!existingManufacturer) {
    throw new Error("Manufacturer not found");
  }

  const vehicleType = await VehicleType.findByIdAndUpdate(
    id,
    { manufacturer, modelName },
    { new: true, runValidators: true }
  );

  if (!vehicleType) {
    throw new Error("Vehicle type not found");
  }

  res.status(200).json({
    success: "Vehicle type updated successfully",
    vehicleType,
  });
};

const deleteVehicleType = async (req, res) => {
  const { id } = req.params;

  const vehicleType = await VehicleType.findByIdAndDelete(id);
  if (!vehicleType) {
    throw new Error("Vehicle type not found");
  }

  res.status(200).json({
    success: "Vehicle type deleted successfully",
  });
};

// Fetch all vehicle trims
const getVehicleTrims = async (req, res) => {
  try {
    const trims = await VehicleTrim.find()
      .populate("vehicleType")
      .sort({ createdAt: -1 });
    res.status(200).json({ trims });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vehicle trims" });
  }
};

// Create a new vehicle trim
const createVehicleTrim = async (req, res) => {
  try {
    const { vehicleType, trimName, specifications } = req.body;

    // Validate vehicle type exists
    const vehicleTypeExists = await VehicleType.findById(vehicleType);
    if (!vehicleTypeExists) {
      return res.status(400).json({ error: "Vehicle type not found" });
    }

    const trim = new VehicleTrim({
      vehicleType,
      trimName,
      specifications: specifications.filter((spec) => spec.trim()),
    });

    await trim.save();
    res
      .status(201)
      .json({ message: "Vehicle trim created successfully", trim });
  } catch (error) {
    res.status(500).json({ error: "Failed to create vehicle trim" });
  }
};

// Update a vehicle trim
const updateVehicleTrim = async (req, res) => {
  try {
    const { vehicleType, trimName, specifications } = req.body;

    // Validate vehicle type exists
    const vehicleTypeExists = await VehicleType.findById(vehicleType);
    if (!vehicleTypeExists) {
      return res.status(400).json({ error: "Vehicle type not found" });
    }

    const updatedTrim = await VehicleTrim.findByIdAndUpdate(
      req.params.id,
      {
        vehicleType,
        trimName,
        specifications: specifications.filter((spec) => spec.trim()),
      },
      { new: true, runValidators: true }
    );

    if (!updatedTrim) {
      return res.status(404).json({ error: "Vehicle trim not found" });
    }

    res.status(200).json({
      message: "Vehicle trim updated successfully",
      trim: updatedTrim,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update vehicle trim" });
  }
};

// Delete a vehicle trim
const deleteVehicleTrim = async (req, res) => {
  try {
    const trim = await VehicleTrim.findByIdAndDelete(req.params.id);
    if (!trim) {
      return res.status(404).json({ error: "Vehicle trim not found" });
    }
    res.status(200).json({ message: "Vehicle trim deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete vehicle trim" });
  }
};

const createCar = async (req, res) => {
  // Transform uploaded files into { filename, path } objects
  const imageData = req.files
    ? req.files.map((file) => ({
        filename: file.filename,
        path: file.path,
      }))
    : [];

  // Parse specifications if it's a string
  let specifications = req.body.specifications;
  if (typeof specifications === "string") {
    specifications = JSON.parse(specifications);
  }

  // Create car object
  const carData = {
    ...req.body,
    specifications,
    images: imageData,
  };

  const car = new Car(carData);
  await car.save();

  res.status(201).json({
    success: true,
    message: "Car created successfully",
    data: car,
  });
};

const getAllCars = async (req, res) => {
  const cars = await Car.find()
    .populate("manufacturerId", "brandName logo") // Include logo for display
    .populate("vehicleTypeId", "modelName")
    .populate("trimId", "trimName")
    .lean();

  res.status(200).json({
    success: true,
    data: cars,
  });
};

// Update car with image management (use middleware-uploaded images, schedule deletion for existing)
const updateCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ error: "Car not found" });

    // Parse request data
    const {
      deletedImageFilenames: deletedFilenamesRaw,
      existingImages: existingImagesRaw,
      specifications: specificationsRaw,
      ...rest
    } = req.body;

    // Parse specifications
    let specifications = {};
    try {
      specifications = specificationsRaw ? JSON.parse(specificationsRaw) : {};
    } catch (error) {
      return res.status(400).json({ error: "Invalid specifications format" });
    }

    // Parse deleted filenames and existing images
    const deletedImageFilenames = deletedFilenamesRaw
      ? JSON.parse(deletedFilenamesRaw)
      : [];
    const existingImages = existingImagesRaw
      ? JSON.parse(existingImagesRaw)
      : [];

    // Process new uploaded images
    const newImages =
      req.files?.map((file) => ({
        filename: file.filename, // Should be the Cloudinary public_id
        path: file.path,
      })) || [];

    // Delete images from Cloudinary
    if (deletedImageFilenames.length > 0) {
      await Promise.all(
        deletedImageFilenames.map((filename) =>
          agenda.now("deleteFileFromCloudinary", { filename })
        )
      );
    }

    // Combine existing (filtered) and new images
    const updatedImages = [
      ...existingImages.filter(
        (img) => !deletedImageFilenames.includes(img.filename)
      ),
      ...newImages,
    ];

    // Prepare update data
    const updateData = {
      ...rest,
      specifications,
      images: updatedImages,
      originalPrice: parseFloat(rest.originalPrice),
      discountedPrice: rest.discountedPrice
        ? parseFloat(rest.discountedPrice)
        : null,
    };

    // Update the car
    const updatedCar = await Car.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: updatedCar });
  } catch (err) {
    console.error("Error in updateCar:", err.message, err.stack);
    res.status(500).json({ error: "Failed to update car" });
  }
};

// Delete car (including all images from Cloudinary via agenda)
const deleteCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ error: "Car not found" });

    // Delete all images using filename as public_id
    if (car.images?.length > 0) {
      await Promise.all(
        car.images.map((img) =>
          agenda.now("deleteFileFromCloudinary", { filename: img.filename })
        )
      );
    }

    await Car.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Car deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete car" });
  }
};

const getContactUs = async (req, res) => {
  try {
    const contactUsData = await ContactUs.find();
    res.status(200).json(contactUsData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contact us data" });
  }
};

const createContactUs = async (req, res) => {
  try {
    const { firstName, lastName, email, mobileNumber, message } = req.body;

    const newContactUs = new ContactUs({
      firstName,
      lastName,
      email,
      mobileNumber,
      message,
    });

    await newContactUs.save();
    res.status(201).json({ message: "Contact form submitted successfully", newContactUs });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit contact form" });
  }
};

const getTestDrives = async (req, res) => {
  try {
    const testDrives = await TestDrive.find().populate({
      path: 'carId',
      populate: [
        { path: 'manufacturerId', select: 'brandName' },
        { path: 'vehicleTypeId', select: 'modelName' }
      ]
    });
    res.status(200).json(testDrives);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch test drive data" });
  }
};

module.exports = {
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
  getTestDrives, // Add this line
};

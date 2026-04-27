const mongoose = require("mongoose");
const Admin = mongoose.model("Admin");
const Manufacturer = mongoose.model("Manufacturer");
const VehicleType = mongoose.model("VehicleType");
const VehicleTrim = mongoose.model("VehicleTrim");
const Blog = mongoose.model("Blog");
const BuyCar = mongoose.model("BuyCar");
const Subscribe = mongoose.model("Subscribe");
const TestDrive = require("../models/testDrive");
const Car = mongoose.model("Car");
const ContactUs = require("../models/contactus");
const jwt = require("jsonwebtoken");
const agenda = require("../middlewares/agenda");
const { cloudinary } = require("../cloudinary");

const CLOUDINARY_FOLDER = "ZRS CAR TRADING";

// Issues a short-lived signature so the browser can upload directly to Cloudinary.
const getCloudinarySignature = async (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: CLOUDINARY_FOLDER },
    process.env.CLOUDINARY_SECRET
  );
  res.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder: CLOUDINARY_FOLDER,
  });
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

// Accepts an already-uploaded Cloudinary asset in req.body.logo.
// Shape: { brandName, logo?: { path, filename } }
const updateManufacturer = async (req, res) => {
  const { editId } = req.params;
  const { brandName, logo: newLogo } = req.body;

  try {
    const manufacturer = await Manufacturer.findById(editId);
    if (!manufacturer) {
      if (newLogo?.filename) {
        cloudinary.uploader.destroy(newLogo.filename).catch(() => {});
      }
      return res.status(404).json({ error: "Manufacturer not found" });
    }

    if ((!manufacturer.logo || (!manufacturer.logo.path && !manufacturer.logo.filename)) && !newLogo) {
      return res.status(400).json({
        error: "A logo image is required when there is no existing logo",
      });
    }

    const oldFilename = manufacturer.logo?.filename;

    const update = { brandName, imageStatus: "done", imageError: null };
    if (newLogo) update.logo = { path: newLogo.path, filename: newLogo.filename };

    const updated = await Manufacturer.findByIdAndUpdate(editId, update, {
      new: true,
      runValidators: true,
    });

    if (newLogo && oldFilename && oldFilename !== newLogo.filename) {
      agenda.now("deleteFileFromCloudinary", { filename: oldFilename }).catch(() => {});
    }

    res.status(200).json({
      success: "Manufacturer updated successfully",
      manufacturer: updated,
    });
  } catch (error) {
    if (req.body?.logo?.filename) {
      cloudinary.uploader.destroy(req.body.logo.filename).catch(() => {});
    }
    console.error("Error updating manufacturer:", error);
    res.status(500).json({ error: "Failed to update manufacturer" });
  }
};

const createManufacturer = async (req, res) => {
  const { brandName, logo } = req.body;

  if (!brandName || !logo?.path || !logo?.filename) {
    if (logo?.filename) cloudinary.uploader.destroy(logo.filename).catch(() => {});
    return res.status(400).json({ error: "Brand name and logo are required" });
  }

  try {
    const newManufacturer = new Manufacturer({
      brandName,
      logo: { path: logo.path, filename: logo.filename },
      imageStatus: "done",
    });
    await newManufacturer.save();

    res.status(201).json({
      success: "Brand created successfully.",
      manufacturer: newManufacturer,
    });
  } catch (error) {
    cloudinary.uploader.destroy(logo.filename).catch(() => {});
    console.error("Error creating manufacturer:", error);
    res.status(500).json({ error: "Failed to create manufacturer" });
  }
};

const updateLogoOrder = async (req, res) => {
  const { newOrder } = req.body;

  if (!Array.isArray(newOrder)) {
    return res.status(400).json({ error: "Invalid newOrder" });
  }

  try {
    const updates = newOrder.map((id, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $set: { order: index } }, // Set explicit order
      },
    }));

    await Manufacturer.bulkWrite(updates);
    res.status(200).json({ message: "Logo order updated" });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
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

// Accepts pre-uploaded image refs in req.body.images: [{ path, filename }, ...]
const createCar = async (req, res) => {
  const incomingImages = Array.isArray(req.body.images) ? req.body.images : [];
  try {
    let specifications = req.body.specifications;
    if (typeof specifications === "string") specifications = JSON.parse(specifications);

    const car = new Car({
      ...req.body,
      specifications,
      images: incomingImages
        .filter((i) => i?.path && i?.filename)
        .map((i) => ({ path: i.path, filename: i.filename })),
      imageStatus: "done",
    });
    await car.save();

    res.status(201).json({
      success: true,
      message: "Car created successfully",
      data: car,
    });
  } catch (error) {
    // Roll back the images the browser already uploaded
    incomingImages.forEach((i) => {
      if (i?.filename) cloudinary.uploader.destroy(i.filename).catch(() => {});
    });
    console.error("Error creating car:", error);
    res.status(500).json({ error: "Failed to create car" });
  }
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

// Body shape: {
//   ...carFields,
//   specifications: object | json-string,
//   existingImages: [{ path, filename }, ...],
//   newImages: [{ path, filename }, ...],
//   deletedImageFilenames: [filename, ...],
// }
const updateCar = async (req, res) => {
  const incomingNewImages = Array.isArray(req.body.newImages) ? req.body.newImages : [];

  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      incomingNewImages.forEach((i) => {
        if (i?.filename) cloudinary.uploader.destroy(i.filename).catch(() => {});
      });
      return res.status(404).json({ error: "Car not found" });
    }

    const {
      deletedImageFilenames: deletedFilenamesRaw,
      existingImages: existingImagesRaw,
      specifications: specificationsRaw,
      newImages: _ignoredNewImages, // already pulled into incomingNewImages
      ...rest
    } = req.body;

    let specifications = {};
    try {
      specifications =
        typeof specificationsRaw === "string"
          ? JSON.parse(specificationsRaw)
          : specificationsRaw || {};
    } catch {
      incomingNewImages.forEach((i) => {
        if (i?.filename) cloudinary.uploader.destroy(i.filename).catch(() => {});
      });
      return res.status(400).json({ error: "Invalid specifications format" });
    }

    const deletedImageFilenames = Array.isArray(deletedFilenamesRaw)
      ? deletedFilenamesRaw
      : deletedFilenamesRaw
      ? JSON.parse(deletedFilenamesRaw)
      : [];
    const existingImages = Array.isArray(existingImagesRaw)
      ? existingImagesRaw
      : existingImagesRaw
      ? JSON.parse(existingImagesRaw)
      : [];

    // Schedule Cloudinary deletion for removed images
    deletedImageFilenames.forEach((filename) => {
      agenda.now("deleteFileFromCloudinary", { filename }).catch(() => {});
    });

    const updatedImages = [
      ...existingImages.filter((img) => !deletedImageFilenames.includes(img.filename)),
      ...incomingNewImages
        .filter((i) => i?.path && i?.filename)
        .map((i) => ({ path: i.path, filename: i.filename })),
    ];

    const updateData = {
      ...rest,
      specifications,
      images: updatedImages,
      originalPrice: parseFloat(rest.originalPrice),
      discountedPrice: rest.discountedPrice ? parseFloat(rest.discountedPrice) : null,
      imageStatus: "done",
      imageError: null,
    };

    const updatedCar = await Car.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: updatedCar });
  } catch (err) {
    incomingNewImages.forEach((i) => {
      if (i?.filename) cloudinary.uploader.destroy(i.filename).catch(() => {});
    });
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


const getBuyNowCars = async (req, res) => {
  try {
    const buycar = await BuyCar.find().populate({
      path: 'carId',
      populate: [
        { path: 'manufacturerId', select: 'brandName' },
        { path: 'vehicleTypeId', select: 'modelName' }
      ]
    });
    res.status(200).json(buycar)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch buy car drive data" });
  }
}


// Body shape: { title, description, image: { path, filename } }
const createBlog = async (req, res) => {
  const { title, description, image } = req.body;
  const adminId = req.user.id;

  if (!title || !description) {
    if (image?.filename) cloudinary.uploader.destroy(image.filename).catch(() => {});
    return res.status(400).json({ error: "Title and description are required" });
  }
  if (!image?.path || !image?.filename) {
    return res.status(400).json({ error: "Thumbnail image is required" });
  }

  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      cloudinary.uploader.destroy(image.filename).catch(() => {});
      return res.status(404).json({ error: "Admin not found" });
    }

    const blog = new Blog({
      title,
      description,
      image: { path: image.path, filename: image.filename },
      postedBy: adminId,
      imageStatus: "done",
    });
    await blog.save();

    // Notify subscribers — runs in the background, no need to block the response
    try {
      const subscribers = await Subscribe.find({ subscribed: true });
      for (const subs of subscribers) {
        agenda.now("sendBlogPostEmail", {
          recipientEmail: subs.email,
          blogImage: blog.image.path,
          blogTitle: blog.title,
          blogDescription: blog.description,
          blogUrl: `${process.env.DOMAIN_FRONTEND}/blog/${blog._id}`,
          unsubscribeUrl: `${process.env.DOMAIN_FRONTEND}/unsubscribe/${subs._id}`,
        });
      }
    } catch (e) {
      console.error("Failed to enqueue subscriber emails:", e.message);
    }

    res.status(201).json({ success: "Blog created successfully", blog });
  } catch (error) {
    cloudinary.uploader.destroy(image.filename).catch(() => {});
    console.error("Error creating blog:", error);
    res.status(500).json({ error: "Failed to create blog" });
  }
};

// Fetch all blogs
const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().populate("postedBy", "name");
    res.status(200).json({ blogs });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
};

// Body shape: { title?, description?, image?: { path, filename } }
const editBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image } = req.body;

    const blog = await Blog.findById(id);
    if (!blog) {
      if (image?.filename) cloudinary.uploader.destroy(image.filename).catch(() => {});
      return res.status(404).json({ error: "Blog not found" });
    }
    if (blog.postedBy.toString() !== req.user.id) {
      if (image?.filename) cloudinary.uploader.destroy(image.filename).catch(() => {});
      return res.status(403).json({ error: "Unauthorized" });
    }

    const oldFilename = blog.image?.filename;

    blog.title = title || blog.title;
    blog.description = description || blog.description;
    if (image?.path && image?.filename) {
      blog.image = { path: image.path, filename: image.filename };
      blog.imageStatus = "done";
      blog.imageError = null;
    }

    const updatedBlog = await blog.save();

    // Clean up the previous image once the new one is saved
    if (image?.filename && oldFilename && oldFilename !== image.filename) {
      agenda.now("deleteFileFromCloudinary", { filename: oldFilename }).catch(() => {});
    }

    const populatedBlog = await Blog.findById(updatedBlog._id).populate("postedBy", "name");
    res.status(200).json({ message: "Blog updated", blog: populatedBlog });
  } catch (error) {
    if (req.body?.image?.filename) {
      cloudinary.uploader.destroy(req.body.image.filename).catch(() => {});
    }
    console.error("Error updating blog:", error);
    res.status(500).json({ error: "Failed to update blog" });
  }
};

// Delete a blog
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Check if the user is the author (admin)
    if (blog.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Schedule deletion of the image from Cloudinary
    if (blog.image && blog.image.filename) {
      await agenda.now("deleteFileFromCloudinary", { filename: blog.image.filename });
    }

    await blog.deleteOne();
    res.status(200).json({ success: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({ error: "Failed to delete blog" });
  }
};

const unsubscribeUser = async (req, res) => {
  const { id } = req.params
  await Subscribe.findByIdAndUpdate(id, { subscribed: false })
  res.status(200).json({ success: "Successfully unsubscribed user" })
}

// Returns just the image-related fields for a resource — used by the frontend
// poller while a background upload job is running.
const getImageStatus = async (req, res) => {
  const { type, id } = req.params;
  let doc = null;
  try {
    if (type === "manufacturer") {
      doc = await Manufacturer.findById(id, "logo imageStatus imageError").lean();
    } else if (type === "blog") {
      doc = await Blog.findById(id, "image imageStatus imageError").lean();
    } else if (type === "car") {
      doc = await Car.findById(id, "images imageStatus imageError").lean();
    } else {
      return res.status(400).json({ error: "Unknown resource type" });
    }
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({
      imageStatus: doc.imageStatus || "done",
      imageError: doc.imageError || null,
      logo: doc.logo,
      image: doc.image,
      images: doc.images,
    });
  } catch (err) {
    console.error("getImageStatus failed:", err);
    res.status(500).json({ error: "Failed to fetch status" });
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
};

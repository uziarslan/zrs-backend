const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  path: { type: String, required: true },
});

const carSchema = new mongoose.Schema({
  manufacturerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Manufacturer",
    required: true,
  },
  vehicleTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VehicleType",
    required: true,
  },
  trimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VehicleTrim",
    required: true,
  },
  title: { type: String },
  originalPrice: { type: Number, required: true },
  fuelType: {
    type: String,
    enum: [
      "gasoline",
      "diesel",
      "electric",
      "hybrid",
      "plug-in-hybrid",
      "cng",
      "lpg",
      "ethanol",
      "hydrogen",
    ],
    default: "gasoline",
  },
  mileage: { type: String },
  year: { type: String },
  exteriorColor: { type: String },
  warranty: {
    type: String,
    enum: ["Available", "Not available"],
    default: "Available",
  },
  door: { type: Number },
  origin: {
    type: String,
    enum: ["gcc", "us", "eu", "cad", "korean", "others"],
    default: "gcc",
  },
  transmission: {
    type: String,
    enum: ["manual", "automatic", "cvt", "dual-clutch"],
    default: "manual",
  },
  bodyType: {
    type: String,
    enum: [
      "sedan",
      "hatchback",
      "suv",
      "coupe",
      "convertible",
      "sport",
      "crossover suv",
    ],
    default: "sedan",
  },
  engine: { type: String },
  testDrive: {
    type: String,
    enum: ["yes", "no"],
    default: "yes",
  },
  featured: {
    type: String,
    enum: ["yes", "no"],
    default: "no",
  },
  saleStatus: {
    type: String,
    enum: ["for-sale", "sold", ""],
    default: "",
  },
  discountedPrice: { type: Number },
  servicePackage: {
    type: String,
    enum: ["Available", "Not available"],
    default: "Available",
  },
  specifications: { type: Map, of: Boolean },
  description: { type: String },
  images: [imageSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Car", carSchema);

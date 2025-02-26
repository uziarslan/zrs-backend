const mongoose = require("mongoose");

const sellCarSchema = new mongoose.Schema(
  {
    manufacturer: { type: String, required: true, trim: true },
    vehicleType: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    mileage: { type: String, required: true, trim: true },
    price: { type: String, required: true, trim: true },
    origin: {
      type: String,
      required: true,
      enum: ["gcc", "US", "EU", "CAD", "Korean", "Others"],
    },
    emirates: {
      type: String,
      required: true,
      enum: ["dubai", "abu dhabi", "sharjah"],
    },
    tradeIn: { type: String, enum: ["yes", "no", ""], default: "" },
    fullName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    images: [
      {
        path: { type: String, required: true },
        filename: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SellCar", sellCarSchema);

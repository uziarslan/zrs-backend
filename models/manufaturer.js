const mongoose = require("mongoose");

const manufacturerSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    logo: {
      path: String,
      filename: String,
    },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Manufacturer", manufacturerSchema);

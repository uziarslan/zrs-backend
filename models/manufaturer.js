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
    imageStatus: {
      type: String,
      enum: ["pending", "done", "failed"],
      default: "done",
    },
    imageError: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Manufacturer", manufacturerSchema);

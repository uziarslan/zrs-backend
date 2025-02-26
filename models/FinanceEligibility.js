const mongoose = require("mongoose");

const financeEligibilitySchema = new mongoose.Schema(
  {
    manufacturer: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleType: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    salary: {
      type: String,
      required: true,
      trim: true,
    },
    hasExistingLoans: {
      type: String,
      required: true,
      enum: ["yes", "no"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("FinanceEligibility", financeEligibilitySchema);

const mongoose = require("mongoose");

const vehicleTrimSchema = new mongoose.Schema(
  {
    vehicleType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleType",
      required: true,
    },
    trimName: {
      type: String,
      required: true,
      trim: true,
    },
    specifications: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("VehicleTrim", vehicleTrimSchema);

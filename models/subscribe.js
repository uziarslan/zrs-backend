const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const subscribeSchema = new Schema(
    {
        email: {
            type: String,
            required: [true, "Email is required"],
            trim: true,
        },
    },
    { timestamps: true } // Adds createdAt and updatedAt automatically
);


module.exports = mongoose.model("Subscribe", subscribeSchema);
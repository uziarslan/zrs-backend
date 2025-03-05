const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const buyCarSchema = new Schema({
    email: {
        type: String,
        required: true,
    },
    mobileNumber: {
        type: String,
        required: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true
    },
    carId: {
        type: Schema.Types.ObjectId,
        ref: "Car",
        required: true,
    },
});

module.exports = mongoose.model("BuyCar", buyCarSchema);
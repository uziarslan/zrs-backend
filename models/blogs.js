const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const blogSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            maxlength: [200, "Title cannot exceed 200 characters"],
        },
        description: {
            type: String,
            required: [true, "Description is required"],
        },
        image: {
            filename: String,
            path: String,
        },
        postedBy: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            required: [true, "Admin ID is required"],
        },
    },
    { timestamps: true } // Adds createdAt and updatedAt automatically
);

const Blog = mongoose.model("Blog", blogSchema);

module.exports = Blog;
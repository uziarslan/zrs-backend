const Agenda = require("agenda");
const fs = require("fs");
const mongoose = require("mongoose");
const wrapAsync = require("../utils/wrapAsync");
const { MailerSend, EmailParams, Sender } = require("mailersend");
const { cloudinary } = require("../cloudinary");

const mailerSend = new MailerSend({
  apiKey: process.env.MAILER_SEND_API,
});
const mailerSendSender = new Sender(
  "test@trial-3zxk54v923zgjy6v.mlsender.net",
  "ZRS Car Trading"
);

const agenda = new Agenda({ db: { address: process.env.MONGODB_URI } });

/* ----- Helpers ----- */

const safeUnlink = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("Failed to delete temp file", filePath, err);
    }
  });
};

const uploadOneToCloudinary = (filePath) =>
  cloudinary.uploader.upload(filePath, {
    folder: "ZRS CAR TRADING",
    resource_type: "image",
    transformation: [{ quality: "auto:low" }],
  });

const setModelStatus = async (modelName, id, payload) => {
  const Model = mongoose.model(modelName);
  await Model.findByIdAndUpdate(id, payload, { runValidators: false });
};

/* ----- Email job (existing) ----- */

agenda.define(
  "sendBlogPostEmail",
  wrapAsync(async (job) => {
    const {
      recipientEmail,
      blogImage,
      blogTitle,
      blogDescription,
      blogUrl,
      unsubscribeUrl,
    } = job.attrs.data;

    const emailParams = new EmailParams()
      .setFrom(mailerSendSender)
      .setTo([{ email: recipientEmail }])
      .setSubject("New Blog Post Alert!")
      .setTemplateId(process.env.MAILERSEND_TEMPLATE_ID)
      .setPersonalization([
        {
          email: recipientEmail,
          data: {
            blog_image: blogImage,
            blog_title: blogTitle,
            blog_description: blogDescription,
            blog_url: blogUrl,
            unsubscribe_url: unsubscribeUrl,
          },
        },
      ]);

    try {
      await mailerSend.email.send(emailParams);
    } catch (error) {
      console.error("Error sending blog post email:", error);
      throw error;
    }
  })
);

/* ----- Cloudinary delete job (was being called but never defined) ----- */

agenda.define("deleteFileFromCloudinary", async (job) => {
  const { filename } = job.attrs.data || {};
  if (!filename) return;
  try {
    await cloudinary.uploader.destroy(filename);
  } catch (err) {
    console.error("Cloudinary delete failed for", filename, err.message);
  }
});

/* ----- Manufacturer logo upload ----- */

agenda.define("uploadManufacturerLogo", async (job) => {
  const { manufacturerId, filePath, oldFilename } = job.attrs.data;
  try {
    const result = await uploadOneToCloudinary(filePath);
    await setModelStatus("Manufacturer", manufacturerId, {
      logo: { path: result.secure_url, filename: result.public_id },
      imageStatus: "done",
      imageError: null,
    });
    if (oldFilename) {
      cloudinary.uploader.destroy(oldFilename).catch((e) =>
        console.error("Failed to delete old logo", oldFilename, e.message)
      );
    }
  } catch (err) {
    console.error("uploadManufacturerLogo failed:", err);
    await setModelStatus("Manufacturer", manufacturerId, {
      imageStatus: "failed",
      imageError: err.message || "Upload failed",
    });
  } finally {
    safeUnlink(filePath);
  }
});

/* ----- Blog cover upload ----- */

agenda.define("uploadBlogImage", async (job) => {
  const { blogId, filePath, oldFilename, notifySubscribers } = job.attrs.data;
  try {
    const result = await uploadOneToCloudinary(filePath);
    await setModelStatus("Blog", blogId, {
      image: { path: result.secure_url, filename: result.public_id },
      imageStatus: "done",
      imageError: null,
    });
    if (oldFilename) {
      cloudinary.uploader.destroy(oldFilename).catch((e) =>
        console.error("Failed to delete old blog image", oldFilename, e.message)
      );
    }

    // Fan out subscriber notifications now that the image URL is real
    if (notifySubscribers) {
      try {
        const Blog = mongoose.model("Blog");
        const Subscribe = mongoose.model("Subscribe");
        const blog = await Blog.findById(blogId);
        const subscribers = await Subscribe.find({ subscribed: true });
        if (blog && subscribers.length) {
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
        }
      } catch (e) {
        console.error("Failed to enqueue subscriber emails:", e.message);
      }
    }
  } catch (err) {
    console.error("uploadBlogImage failed:", err);
    await setModelStatus("Blog", blogId, {
      imageStatus: "failed",
      imageError: err.message || "Upload failed",
    });
  } finally {
    safeUnlink(filePath);
  }
});

/* ----- Car images upload (multiple) ----- */

agenda.define("uploadCarImages", async (job) => {
  const { carId, files = [], appendMode = false, oldFilenames = [] } = job.attrs.data;
  try {
    const uploaded = [];
    for (const f of files) {
      try {
        const result = await uploadOneToCloudinary(f.path);
        uploaded.push({ path: result.secure_url, filename: result.public_id });
      } catch (e) {
        console.error("Single image upload failed:", e.message);
      } finally {
        safeUnlink(f.path);
      }
    }

    const Car = mongoose.model("Car");
    const car = await Car.findById(carId);
    if (!car) {
      // Car was deleted while uploading — clean up everything we uploaded
      uploaded.forEach((u) =>
        cloudinary.uploader.destroy(u.filename).catch(() => {})
      );
      return;
    }

    if (appendMode) {
      car.images = [...(car.images || []), ...uploaded];
    } else {
      car.images = uploaded;
    }
    car.imageStatus = "done";
    car.imageError = null;
    await car.save();

    // Clean up replaced images
    oldFilenames.forEach((fn) => {
      cloudinary.uploader.destroy(fn).catch(() => {});
    });
  } catch (err) {
    console.error("uploadCarImages failed:", err);
    await setModelStatus("Car", carId, {
      imageStatus: "failed",
      imageError: err.message || "Upload failed",
    });
    files.forEach((f) => safeUnlink(f.path));
  }
});

module.exports = agenda;

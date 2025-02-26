const mongoose = require("mongoose");
const Agenda = require("agenda");
const { uploader } = require("cloudinary").v2;
const wrapAsync = require("../utils/wrapAsync");
const { MailtrapClient } = require("mailtrap");

const TOKEN = process.env.MAIL_TRAP_TOKEN;
const client = new MailtrapClient({ token: TOKEN });
const sender = {
  email: "info@unionmade.net",
  name: "Union Made Apparel",
};

const agenda = new Agenda({ db: { address: process.env.MONGODB_URI } });

agenda.define(
  "deleteFileFromCloudinary",
  wrapAsync(async (job) => {
    const { filename } = job.attrs.data;

    try {
      await new Promise((resolve, reject) => {
        uploader.destroy(
          filename,
          { resource_type: "image" },
          (error, result) => {
            if (error) {
              console.error(`Error deleting file from Cloudinary: ${error}`);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
      });
    } catch (error) {
      console.error(`Failed to delete file with publicId ${publicId}:`, error);
    }
  })
);

agenda.define("auto-refund-script", async (job) => {
  console.log("Running job: auto-refund-script");

  const expiredProducts = await Product.find({
    endTime: { $lte: new Date() },
    stage: "Mockup",
  });

  for (const product of expiredProducts) {
    const funded = parseInt(product.funded);
    const minQty = parseInt(product.minQty);
    const orderIds = product.orders;

    if (funded < minQty && product.expired === false) {
      console.log(`Processing refunds for product: ${product._id}`);
      for (const orderId of orderIds) {
        const order = await Order.findOne({
          _id: orderId,
          "paymentMethod.paymentStatus": "hold",
        })
          .populate("user")
          .populate("product");
        if (!order) continue;

        try {
          if (order.paymentMethod.type === "stripe") {
            const refund = await stripe.refunds.create({
              charge: order.paymentMethod.chargeId,
            });
            order.paymentMethod.paymentStatus =
              refund.status === "succeeded" ? "refunded" : "hold";
          } else if (order.paymentMethod.type === "credits") {
            await User.findByIdAndUpdate(
              order.user,
              {
                $inc: { credits: order.totalAmount },
              },
              { new: true }
            );
            order.paymentMethod.paymentStatus = "refunded";
          }

          const notifi = new Notifi({
            to: order.user._id,
            title: "Order Refunded",
            description: `An automatic refund has been applied to your order because the minimum quantity requirement for a product was not met. The payment has been reversed to your original payment method ("${order.paymentMethod.type}"). The refunded amount is ${order.totalAmount}.`,
          });

          await notifi.save();

          client.send({
            from: sender,
            to: [
              {
                email: order.user.username,
              },
            ],
            template_uuid: "a780f975-5e06-4c05-a58f-e4b7445db811",
            template_variables: {
              user: order.user,
              productImage: order.product.images[0].path,
              order,
            },
          });

          await order.save();
        } catch (error) {
          console.error("Error processing refund:", error);
        }
      }
    } else if (funded >= minQty && product.expired === false) {
      product.stage = "Pre-production";

      for (const orderId of orderIds) {
        const order = await Order.findOne({
          _id: orderId,
          "paymentMethod.paymentStatus": "hold",
        })
          .populate("user")
          .populate("product");

        if (!order) continue;

        const notifi = new Notifi({
          to: order.user._id,
          title: `Product stage updated`,
          description: `Product stage of an order is updated to "${product.stage}"`,
        });

        await notifi.save();

        client.send({
          from: sender,
          to: [
            {
              email: order.user.username,
            },
          ],
          template_uuid: "2929bdb6-071e-43b4-8bd1-1ea53e8e5b46",
          template_variables: {
            user: order.user,
            product,
            productImage: order.product.images[0].path,
            order,
          },
        });
      }
      console.log(
        `Product ${product._id} met the minimum funding, moving to Pre-production.`
      );
    }
    product.expired = true;
    await product.save();
  }
});

agenda.define("check-expired-products", async (job) => {
  console.log("Running job: check-expired-products");

  const expiredProducts = await Product.find({
    endTime: { $lte: new Date() },
    expired: true,
  });

  for (const product of expiredProducts) {
    const orderIds = product.orders;

    for (const orderId of orderIds) {
      const order = await Order.findOne({
        _id: orderId,
        "paymentMethod.paymentStatus": "hold",
      })
        .populate("user")
        .populate("product");

      if (!order) continue;
      console.log(`Processing refunds for product: ${product._id}`);
      if (order.paymentMethod.type === "stripe") {
        const refund = await stripe.refunds.create({
          charge: order.paymentMethod.chargeId,
        });
        order.paymentMethod.paymentStatus =
          refund.status === "succeeded" ? "refunded" : "hold";
      } else if (order.paymentMethod.type === "credits") {
        await User.findByIdAndUpdate(
          order.user._id,
          {
            $inc: { credits: order.totalAmount },
          },
          { new: true }
        );
        order.paymentMethod.paymentStatus = "refunded";
      }
      const notifi = new Notifi({
        to: order.user,
        title: "Order Refunded",
        description: `Refund has been applied to your order because the item you ordered is discontinued. The payment has been reversed to your original payment method ("${order.paymentMethod.type}"). The refunded amount is ${order.totalAmount}.`,
      });

      client.send({
        from: sender,
        to: [
          {
            email: order.user.username,
          },
        ],
        template_uuid: "a5a245d4-669d-4ddf-88b0-8672b40a49f0",
        template_variables: {
          user: order.user,
          productImage: order.product.images[0].path,
          order,
        },
      });

      await notifi.save();
      await order.save();
    }
  }
});

module.exports = agenda;

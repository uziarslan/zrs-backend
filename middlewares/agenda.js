const Agenda = require("agenda");
const wrapAsync = require("../utils/wrapAsync");
const { MailerSend, EmailParams, Sender } = require("mailersend");

const mailerSend = new MailerSend({
  apiKey: process.env.MAILER_SEND_API, // Add this to your .env file
});
const mailerSendSender = new Sender("test@trial-3zxk54v923zgjy6v.mlsender.net", "ZRS Car Trading");

const agenda = new Agenda({ db: { address: process.env.MONGODB_URI } });

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
      .setTo([{ email: recipientEmail }]) // Only email, no name
      .setSubject("New Blog Post Alert!")
      .setTemplateId(process.env.MAILERSEND_TEMPLATE_ID) // Add this to your .env file
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
      const response = await mailerSend.email.send(emailParams);
      console.log("Blog post email sent successfully:", response);
    } catch (error) {
      console.error("Error sending blog post email:", error);
      throw error; // Re-throw to let Agenda handle retries if configured
    }
  })
);

module.exports = agenda;

import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export const verifyEmailTransporter = async () => {
  try {
    await transporter.verify();
    console.log("✅ Email service connected (Gmail SMTP)");
  } catch (error) {
    console.error("❌ Email service failed:", error.message);
    throw error; // 🔥 DO NOT swallow
  }
};

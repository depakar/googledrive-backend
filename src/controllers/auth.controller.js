import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { generateActivationToken } from "../utils/generateToken.js";
import { sendEmail } from "../utils/sendEmail.js";

/* ============================
   REGISTER USER
============================ */
export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // 1️⃣ Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Create inactive user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      isActive: false,
    });

    // 4️⃣ Generate activation token
    const token = generateActivationToken(user._id);

    // 5️⃣ FRONTEND activation link
    const activationLink = `${process.env.CLIENT_URL}/activate/${token}`;

    // 6️⃣ Send activation email
    await sendEmail({
      to: user.email,
      subject: "Activate your account",
      html: `
        <h2>Welcome to Google Drive Clone</h2>
        <p>Please click the link below to activate your account:</p>
        <a href="${activationLink}">${activationLink}</a>
      `,
    });

    res.status(201).json({
      message: "Registration successful. Check your email to activate account.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================
   VERIFY ACCOUNT
============================ */
export const verifyAccount = async (req, res) => {
  try {
    const { token } = req.params;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({ message: "Invalid token" });
    }

    user.isActive = true;
    await user.save();

    res.json({ message: "Account activated successfully" });
  } catch (error) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

/* ============================
   LOGIN USER
============================ */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 2️⃣ Check activation
    if (!user.isActive) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

    // 3️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 4️⃣ Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================
   FORGOT PASSWORD
============================ */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 1️⃣ Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // 2️⃣ Hash token & expiry
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    // 3️⃣ FRONTEND reset link
    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // 4️⃣ Send email
    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html: `
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    res.json({
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ============================
   RESET PASSWORD
============================ */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

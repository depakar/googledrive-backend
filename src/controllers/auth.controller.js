import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import { generateActivationToken } from "../utils/generateActivationToken.js";

/* ===============================
   REGISTER USER
================================ */
export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      isActive: false,
    });

    const activationToken = generateActivationToken(user._id);
    const activationUrl = `${process.env.CLIENT_URL}/verify/${activationToken}`;

    // 🔥 Email should NEVER crash registration
    try {
      await sendEmail({
        to: email,
        subject: "Activate your account",
        html: `
          <h2>Welcome ${firstName} 👋</h2>
          <p>Click below to activate your account:</p>
          <a href="${activationUrl}">${activationUrl}</a>
          <p>This link expires in 15 minutes.</p>
        `,
      });
    } catch (e) {
      console.error("Activation email failed:", e.message);
    }

    return res.status(201).json({
      message: "Registration successful. Please check your email to activate.",
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({ message: "User already exists" });
    }

    return res.status(500).json({ message: "Registration failed" });
  }
};

/* ===============================
   VERIFY ACCOUNT
================================ */
export const verifyAccount = async (req, res) => {
  try {
    const { token } = req.params;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.redirect(
        `${process.env.CLIENT_URL}/login?error=user-not-found`
      );
    }

    // 🔥 FORCE ACTIVATE
    if (!user.isActive) {
      user.isActive = true;
      await user.save();
    }

    return res.redirect(
      `${process.env.CLIENT_URL}/login?success=activated`
    );
  } catch (error) {
    return res.redirect(
      `${process.env.CLIENT_URL}/login?error=invalid-link`
    );
  }
};




/* ===============================
   LOGIN USER
================================ */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Please activate your account first.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
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
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Login failed" });
  }
};

/* ===============================
   FORGOT PASSWORD
================================ */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // 🔥 Email should NOT crash flow
    try {
      await sendEmail({
        to: email,
        subject: "Reset your password",
        html: `
          <h2>Password Reset</h2>
          <p>Click below to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link expires in 1 hour.</p>
        `,
      });
    } catch (e) {
      console.error("Reset email failed:", e.message);
    }

    return res.json({
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Failed to process request" });
  }
};

/* ===============================
   RESET PASSWORD
================================ */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
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

    return res.json({
      message: "Password reset successful! You can now login.",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Reset token has expired" });
    }

    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Password reset failed" });
  }
};

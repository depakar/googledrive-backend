import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import { generateActivationToken } from "../utils/generateActivationToken.js";

/**
 * ===============================
 * REGISTER USER
 * ===============================
 */
export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (isActive: false by default)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      isActive: false,
    });

    // Generate activation token
    const activationToken = generateActivationToken(user._id);

    // ✅ FIXED: Changed URL to /activate to match frontend route
    const activationUrl = `${process.env.CLIENT_URL}/activate/${activationToken}`;

    await sendEmail({
      to: email,
      subject: "Activate Your Account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome ${firstName}!</h2>
          <p>Thank you for registering. Please activate your account by clicking the button below:</p>
          <a href="${activationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Activate Account
          </a>
          <p>Or copy this link:</p>
          <p style="word-break: break-all; color: #666;">${activationUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 15 minutes.</p>
        </div>
      `,
    });

    res.status(201).json({
      message: "Registration successful! Please check your email to activate your account.",
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * ===============================
 * VERIFY ACCOUNT
 * ===============================
 */
export const verifyAccount = async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isActive) {
      return res.status(400).json({ message: "Account already activated" });
    }

    // Activate user
    user.isActive = true;
    await user.save();

    res.json({ message: "Account activated successfully! You can now login." });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Activation link has expired" });
    }
    console.error("VERIFY ERROR:", error);
    res.status(500).json({ message: "Invalid or expired token" });
  }
};

/**
 * ===============================
 * LOGIN USER
 * ===============================
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ 
        message: "Please activate your account first. Check your email for activation link." 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
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
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * ===============================
 * FORGOT PASSWORD
 * ===============================
 */
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

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await sendEmail({
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>You requested a password reset. Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Reset Password
          </a>
          <p>Or copy this link:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: "Password reset link sent to your email" });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * ===============================
 * RESET PASSWORD
 * ===============================
 */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful! You can now login." });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Reset token has expired" });
    }
    console.error("RESET PASSWORD ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};
import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const OTP_EXPIRY_TIME = 5 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_dev_only";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const generateOTP = () =>
  crypto.randomInt(100000, 999999).toString();

const generateUserId = () =>
  `USR-${uuidv4()}`;

const safeSendMail = async (options) => {
  try {
    await transporter.sendMail(options);
  } catch (err) {
    console.error("Mail Error:", err.message);
  }
};

export const register = async (req, res) => {
  try {
    const { username, email, password, retype_password } = req.body || {};

    if (!username || !email || !password || !retype_password)
      return res.status(400).json({ message: "All fields are required" });

    if (password !== retype_password)
      return res.status(400).json({ message: "Passwords do not match" });

    if (password.length < MIN_PASSWORD_LENGTH)
      return res.status(400).json({ message: "Password too short" });

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await User.create({
      userId: generateUserId(),
      username,
      email,
      password: hashedPassword,
      otp: hashedOtp,
      otpExpiry: new Date(Date.now() + OTP_EXPIRY_TIME)
    });

    await safeSendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Verify Your Account",
      html: `<h3>Your OTP is ${otp}</h3><p>Valid for 5 minutes</p>`
    });

    return res.status(200).json({ message: "OTP sent to email" });

  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({ message: "Registration failed" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    const user = await User.findOne({ email });

    if (!user || !user.otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (!user.otpExpiry || user.otpExpiry.getTime() < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    const valid = await bcrypt.compare(otp, user.otp);
    if (!valid)
      return res.status(400).json({ message: "Invalid OTP" });

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    await safeSendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Welcome to AcneAI",
      html: `<h2>Welcome ${user.username}</h2>`
    });

    return res.status(200).json({ message: "Account verified" });

  } catch (err) {
    console.error("Verify Error:", err);
    return res.status(500).json({ message: "Verification failed" });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email)
      return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.isVerified)
      return res.status(400).json({ message: "Account already verified" });

    if (user.otpExpiry && user.otpExpiry.getTime() > Date.now())
      return res.status(400).json({ message: "OTP still valid" });

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.otp = hashedOtp;
    user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_TIME);

    await user.save();

    await safeSendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Resend OTP",
      html: `<h3>Your new OTP is ${otp}</h3><p>Valid for 5 minutes</p>`
    });

    return res.status(200).json({ message: "OTP resent" });

  } catch (err) {
    console.error("Resend Error:", err);
    return res.status(500).json({ message: "Resend failed" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email }).select("+password");

    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified)
      return res.status(403).json({ message: "Verify account first" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, userId: user.userId },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({ token });

  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email)
      return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });

    if (!user)
      return res.status(200).json({ message: "If account exists, OTP sent" });

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.resetOtp = hashedOtp;
    user.resetOtpExpiry = new Date(Date.now() + OTP_EXPIRY_TIME);

    await user.save();

    await safeSendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Reset Password OTP",
      html: `<h3>Your OTP is ${otp}</h3><p>Valid for 5 minutes</p>`
    });

    return res.status(200).json({ message: "If account exists, OTP sent" });

  } catch (err) {
    console.error("Forgot Error:", err);
    return res.status(500).json({ message: "Reset request failed" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};

    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.resetOtp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (!user.resetOtpExpiry || user.resetOtpExpiry.getTime() < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    const valid = await bcrypt.compare(otp, user.resetOtp);
    if (!valid)
      return res.status(400).json({ message: "Invalid OTP" });

    if (newPassword.length < MIN_PASSWORD_LENGTH)
      return res.status(400).json({ message: "Password too short" });

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetOtp = null;
    user.resetOtpExpiry = null;

    await user.save();

    return res.status(200).json({ message: "Password reset successful" });

  } catch (err) {
    console.error("Reset Error:", err);
    return res.status(500).json({ message: "Password reset failed" });
  }
};

export const getUserCount = async (req, res) => {
  try {
    const count = await User.countDocuments();
    return res.status(200).json({ totalUsers: count });
  } catch (err) {
    console.error("Count Error:", err);
    return res.status(500).json({ message: "Failed to fetch user count" });
  }
};

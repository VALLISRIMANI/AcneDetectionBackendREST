import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";


const OTP_EXPIRY_TIME = 5 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

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
    let { username, email, password, retype_password } = req.body || {};

    // Normalize inputs to avoid duplicates caused by casing/whitespace
    username = username && String(username).trim();
    email = email && String(email).toLowerCase().trim();

    if (!username || !email || !password || !retype_password)
      return res.status(400).json({ message: "All fields are required" });

    if (password !== retype_password)
      return res.status(400).json({ message: "Passwords do not match" });

    if (password.length < MIN_PASSWORD_LENGTH)
      return res.status(400).json({ message: "Password too short" });

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      // If the account is already verified, reject new registration attempts
      if (existingUser.isVerified) {
        return res.status(409).json({ message: "Email or username already registered" });
      }

      // Account exists but not verified — instruct to use resend OTP instead
      return res.status(409).json({ message: "Account exists but not verified. Use resend OTP to verify." });
    }

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
      subject: "Verify Your Account – Secure Access Code Inside 💚",

      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Account Verification</title>
</head>
<body style="margin:0; padding:0; background-color:#f0fdf4; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4; padding:40px 0;">
    <tr>
      <td align="center">

        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:14px; box-shadow:0 12px 35px rgba(0,0,0,0.08); overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(90deg,#15803d,#22c55e); padding:30px;">
              <h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">
                Welcome to AcneAI 💚
              </h1>
              <p style="color:#d1fae5; margin-top:8px; font-size:14px;">
                “Secure. Smart. Personalized Care.”
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:35px; color:#1f2937;">

              <h2 style="margin-top:0; color:#15803d;">Verify Your Account</h2>

              <p style="font-size:15px; line-height:1.7; margin-bottom:20px;">
                Thank you for joining us.  
                To complete your registration and activate your account,  
                please use the One-Time Password (OTP) below.
              </p>

              <p style="font-size:14px; font-style:italic; color:#4b5563;">
                “Security is the foundation of trust, and your safety matters to us.”
              </p>

              <!-- OTP Box -->
              <div style="text-align:center; margin:35px 0;">
                <span style="
                  display:inline-block;
                  background:#dcfce7;
                  color:#166534;
                  font-size:30px;
                  font-weight:bold;
                  letter-spacing:6px;
                  padding:18px 30px;
                  border-radius:10px;
                  border:2px dashed #22c55e;
                ">
                  ${otp}
                </span>
              </div>

              <p style="font-size:14px; text-align:center; color:#6b7280; margin-top:-15px;">
                ⏳ This code is valid for <strong>5 minutes</strong> only.
              </p>

              <hr style="border:none; border-top:1px solid #e5e7eb; margin:30px 0;">

              <p style="font-size:15px; line-height:1.7;">
                If you did not initiate this request, please ignore this email.  
                For your protection, never share your OTP with anyone.
              </p>

              <p style="font-size:15px; line-height:1.7; margin-top:25px;">
                We appreciate your trust in AcneAI.  
                Together, let’s move toward healthier skin and confident living.
              </p>

              <p style="font-size:15px; margin-top:25px; color:#15803d; font-weight:bold;">
                Thank you for choosing us 💚
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background:#ecfdf5; padding:20px; font-size:13px; color:#6b7280;">
              © ${new Date().getFullYear()} AcneAI. All rights reserved.<br>
              “Healthy skin begins with secure care.”
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`
    });

    return res.status(200).json({ message: "OTP sent to email" });

  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({ message: "Registration failed" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    let { email, otp } = req.body || {};
    email = email && String(email).toLowerCase().trim();

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
      subject: "Welcome to AcneAI – Your Journey Begins Today 💚",

      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to AcneAI</title>
</head>
<body style="margin:0; padding:0; background-color:#f0fdf4; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4; padding:40px 0;">
    <tr>
      <td align="center">

        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:14px; box-shadow:0 12px 35px rgba(0,0,0,0.08); overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(90deg,#15803d,#22c55e); padding:30px;">
              <h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:1px;">
                Welcome to AcneAI 💚
              </h1>
              <p style="color:#d1fae5; margin-top:8px; font-size:14px;">
                “Smart Care. Confident Skin.”
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:35px; color:#1f2937;">

              <h2 style="margin-top:0; color:#15803d;">
                Hello ${user.username},
              </h2>

              <p style="font-size:16px; line-height:1.7; margin-bottom:20px;">
                🎉 Your registration was successful!
              </p>

              <p style="font-size:15px; line-height:1.7;">
                Thank you for joining AcneAI. We’re excited to have you with us.  
                Today marks the beginning of your personalized skin-care journey.
              </p>

              <p style="font-size:15px; line-height:1.7; margin-top:20px; font-style:italic; color:#4b5563;">
                “Every great transformation begins with a confident first step.”
              </p>

              <hr style="border:none; border-top:1px solid #e5e7eb; margin:30px 0;">

              <p style="font-size:15px; line-height:1.7;">
                Our mission is simple — to support you with intelligent insights, 
                personalized guidance, and safe skincare recommendations tailored just for you.
              </p>

              <p style="font-size:15px; line-height:1.7; margin-top:20px;">
                We truly appreciate your trust in us.  
                Let’s make every day a step toward healthier, clearer skin.
              </p>

              <p style="font-size:16px; margin-top:25px; color:#15803d; font-weight:bold;">
                Thank you for being part of the AcneAI community 💚
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background:#ecfdf5; padding:20px; font-size:13px; color:#6b7280;">
              © ${new Date().getFullYear()} AcneAI. All rights reserved.<br>
              “Healthy skin begins with smart care.”
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`
    });

    return res.status(200).json({ message: "Account verified" });

  } catch (err) {
    console.error("Verify Error:", err);
    return res.status(500).json({ message: "Verification failed" });
  }
};

export const resendOtp = async (req, res) => {
  try {
    let { email } = req.body || {};
    email = email && String(email).toLowerCase().trim();

    if (!email)
      return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });

    if (!user)
      return res.status(200).json({ message: "If account exists, OTP resent" });

    if (user.isVerified)
      return res.status(409).json({ message: "Account already verified" });

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
      subject: "Your New OTP – Verification Code Inside 💚",

      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Resend OTP</title>
</head>
<body style="margin:0; padding:0; background-color:#f4fdf7; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4fdf7; padding:30px 0;">
    <tr>
      <td align="center">

        <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; box-shadow:0 8px 25px rgba(0,0,0,0.08); overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(90deg,#16a34a,#22c55e); padding:25px;">
              <h1 style="color:#ffffff; margin:0; font-size:22px; letter-spacing:1px;">
                Account Verification 💚
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px; color:#1f2937;">

              <h2 style="margin-top:0; color:#16a34a;">Hello,</h2>

              <p style="font-size:15px; line-height:1.6; margin-bottom:20px;">
                As requested, we’re sending you a new One-Time Password (OTP) 
                to verify your account.  
                “Trust is built with security and care.”
              </p>

              <!-- OTP Box -->
              <div style="text-align:center; margin:30px 0;">
                <span style="
                  display:inline-block;
                  background:#e6f9ef;
                  color:#15803d;
                  font-size:28px;
                  font-weight:bold;
                  letter-spacing:4px;
                  padding:15px 25px;
                  border-radius:8px;
                  border:2px dashed #22c55e;
                ">
                  ${otp}
                </span>
              </div>

              <p style="font-size:14px; text-align:center; color:#6b7280; margin-top:-10px;">
                ⏳ Valid for <strong>5 minutes</strong> only
              </p>

              <p style="font-size:15px; line-height:1.6; margin-top:25px;">
                If you did not request this code, please ignore this email. 
                For your protection, never share your OTP with anyone.
              </p>

              <p style="font-size:15px; line-height:1.6; margin-top:20px;">
                Thank you for being part of our community.  
                Stay secure and stay confident 💚
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background:#f0fdf4; padding:18px; font-size:13px; color:#6b7280;">
              © ${new Date().getFullYear()} AcneAI. All rights reserved.<br>
              “Healthy skin begins with secure care.”
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`
    });

    return res.status(200).json({ message: "OTP resent" });

  } catch (err) {
    console.error("Resend Error:", err);
    return res.status(500).json({ message: "Resend failed" });
  }
};

export const login = async (req, res) => {
  try {
    let { email, password } = req.body || {};
    email = email && String(email).toLowerCase().trim();

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
    let { email } = req.body || {};
    email = email && String(email).toLowerCase().trim();

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
      subject: "Reset Your Password – Secure OTP Inside 💚",

      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reset Password OTP</title>
</head>
<body style="margin:0; padding:0; background-color:#f4fdf7; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4fdf7; padding:30px 0;">
    <tr>
      <td align="center">

        <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; box-shadow:0 8px 25px rgba(0,0,0,0.08); overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(90deg,#16a34a,#22c55e); padding:25px;">
              <h1 style="color:#ffffff; margin:0; font-size:22px; letter-spacing:1px;">
                Password Reset Request 💚
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px; color:#1f2937;">

              <h2 style="margin-top:0; color:#16a34a;">Hello,</h2>

              <p style="font-size:15px; line-height:1.6; margin-bottom:20px;">
                We received a request to reset your password. 
                “Security is not a product, but a process.”  
                To continue safely, please use the One-Time Password (OTP) below.
              </p>

              <!-- OTP Box -->
              <div style="text-align:center; margin:30px 0;">
                <span style="
                  display:inline-block;
                  background:#e6f9ef;
                  color:#15803d;
                  font-size:28px;
                  font-weight:bold;
                  letter-spacing:4px;
                  padding:15px 25px;
                  border-radius:8px;
                  border:2px dashed #22c55e;
                ">
                  ${otp}
                </span>
              </div>

              <p style="font-size:14px; text-align:center; color:#6b7280; margin-top:-10px;">
                ⏳ Valid for <strong>5 minutes</strong> only
              </p>

              <p style="font-size:15px; line-height:1.6; margin-top:25px;">
                If you did not request this reset, please ignore this email. 
                “Your digital safety is our highest priority.”
              </p>

              <p style="font-size:15px; line-height:1.6; margin-top:20px;">
                Thank you for trusting us.  
                Stay secure and stay confident 💚
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background:#f0fdf4; padding:18px; font-size:13px; color:#6b7280;">
              © ${new Date().getFullYear()} AcneAI. All rights reserved.<br>
              “Healthy skin begins with secure care.”
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`
    });

    return res.status(200).json({ message: "If account exists, OTP sent" });

  } catch (err) {
    console.error("Forgot Error:", err);
    return res.status(500).json({ message: "Reset request failed" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body || {};
    email = email && String(email).toLowerCase().trim();

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

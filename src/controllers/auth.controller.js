// auth.controller.js
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { generateOtp } from "../utils/generateOtp.js";
import { generateAccessToken, generateRefreshToken } from "../services/token.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const register = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) throw new Error("User already exists");

    const hashed = await hashPassword(password);

    const user = await User.create({
      email,
      username,
      password: hashed
    });

    successResponse(res, user, "Registered successfully. Verify OTP.");
  } catch (error) {
    next(error);
  }
};

export const sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found");

    const otpCode = generateOtp();

    await Otp.findOneAndDelete({ email });

    await Otp.create({
      email,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    console.log("OTP:", otpCode);

    successResponse(res, null, "OTP sent");
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const record = await Otp.findOne({ email });
    if (!record) throw new Error("OTP expired");

    if (record.expiresAt < new Date()) {
      await Otp.deleteOne({ email });
      throw new Error("OTP expired");
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();

      if (record.attempts >= 3) {
        await Otp.deleteOne({ email });
        throw new Error("Too many failed attempts");
      }

      throw new Error("Invalid OTP");
    }

    await User.updateOne({ email }, { isVerified: true });
    await Otp.deleteOne({ email });

    successResponse(res, null, "Email verified");
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) throw new Error("Invalid credentials");
    if (!user.isVerified) throw new Error("Verify email first");

    const match = await comparePassword(password, user.password);
    if (!match) throw new Error("Invalid credentials");

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false
    });

    successResponse(res, null, "Login successful");
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) throw new Error("Unauthorized");

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token)
      throw new Error("Invalid refresh token");

    const newAccessToken = generateAccessToken(user);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: false
    });

    successResponse(res, null, "Token refreshed");
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const user = req.user;
    user.refreshToken = null;
    await user.save();

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    successResponse(res, null, "Logged out");
  } catch (error) {
    next(error);
  }
};

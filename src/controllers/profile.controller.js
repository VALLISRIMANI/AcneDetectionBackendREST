// profile.controller.js
import AcneProfile from "../models/AcneProfile.js";
import { successResponse } from "../utils/apiResponse.js";

export const completeProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const existing = await AcneProfile.findOne({ userId });
    if (existing) throw new Error("Profile already completed");

    const profile = await AcneProfile.create({
      userId,
      ...req.body
    });

    successResponse(res, profile, "Profile submitted successfully");
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const profile = await AcneProfile.findOne({ userId });
    if (!profile) throw new Error("Profile not found");

    successResponse(res, profile);
  } catch (error) {
    next(error);
  }
};

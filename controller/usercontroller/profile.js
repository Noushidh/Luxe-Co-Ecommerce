
import crypto from "crypto";
import asyncHandler from "../../utils/asynHandler.js";
import userModal from "../../models/usermodel.js";
import cloudinary from "../../config/cloudinary.js";
import bcrypt from "bcryptjs";
import { sendEmailChangeVerification } from "../../utils/sendEmail.js";
import AppError from "../../utils/appError.js";

export const load_profile = asyncHandler(async (req, res) => {
  let user = await userModal.findById(req.session.user._id)
    .select('-password_hash -otp -otpExpires')

  res.render("user/layout", {
    title: "Profile",
    body: "user/profile/profile",
    userData: user,
    currentPath: '/user/profile'
  });
});


export const load_editProfile = asyncHandler(async (req, res) => {
  const userData = await userModal.findById(req.session.user._id);
  if (!userData) throw new AppError("User not found", 404);
  res.render("user/layout", {
    title: "Edit Profile",
    body: "user/profile/profile-edit",
    userData,
    currentPath: '/user/profile'
  })
})

export const editProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const userId = req.session.user._id;

  const nameRegex = /^[A-Za-z ]{2,50}$/;
  const phoneRegex = /^(0?[6-9]\d{9})$/;

  if (!name || !nameRegex.test(name)) {
    throw new AppError("Invalid name format", 400);
  }

  if (phone && !phoneRegex.test(phone)) {
    throw new AppError("Invalid phone number", 400);
  }

  const user = await userModal.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  let profilePic = user.profilePic;
  let profilePicPublicId = user.profilePicPublicId;

  if (req.file) {
    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder: "user_avatars",
      transformation: [{ width: 300, height: 300, crop: "fill" }],
    });

    if (profilePicPublicId) {
      await cloudinary.uploader.destroy(profilePicPublicId);
    }
    profilePic = upload.secure_url;
    profilePicPublicId = upload.public_id;
  }

  const updatedUser = await userModal.findByIdAndUpdate(userId, { fullname: name, phone: phone || null, profilePic, profilePicPublicId, }, { new: true });

  req.session.user = { ...req.session.user, fullname: updatedUser.fullname, phone: updatedUser.phone, profilePic: updatedUser.profilePic, };

  return res.status(200).json({ success: true, message: "Profile updated successfully", redirect: "/user/profile", });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await userModal.findById(req.session.user._id);

  if (!user) throw new AppError("User not found", 404);

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) throw new AppError("Current password is incorrect", 400);

  const isSame = await bcrypt.compare(newPassword, user.password_hash);
  if (isSame) throw new AppError("New password must be different from current password", 400);
  user.password_hash = await bcrypt.hash(newPassword, 10);

  await user.save();

  req.session.destroy(() => {
    res.status(200).json({ success: true, redirect: "/user/login?reset=success&msg=Password changed. Please login again." });
  });
})

export const sendChangeEmailLink = asyncHandler(async (req, res) => {
  const { newEmail } = req.body;
  console.log(newEmail)

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new AppError("Invalid email address", 400);
  }

  const user = await userModal.findById(req.session.user._id);
  if (user.googleId) throw new AppError("Google users cannot perform this action", 400);
  if (user.email === newEmail) throw new AppError("New email must be different from current email", 400);

  const existingUser = await userModal.findOne({ email: newEmail });
  if (existingUser) throw new AppError("This email is already used by another account", 400);

  const token = crypto.randomBytes(32).toString("hex");

  req.session.emailChange = { newEmail, token, expiresAt: Date.now() + 2 * 60 * 1000 };

  const verifyLink = `${process.env.BASE_URL}/user/change-email/verify?token=${token}`;

  const emailSent = await sendEmailChangeVerification(newEmail, verifyLink);
  if (!emailSent) throw new AppError("Failed to send verification email", 500);

  return res.status(200).json({ success: true, message: "Verification link sent to your new email" });
})


export const verifyChangeEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) throw new AppError("Invalid verification link", 400);

  const data = req.session.emailChange;

  if (!data) throw new AppError("Verification session expired", 400);
  if (data.token !== token) throw new AppError("Invalid or expired verification link", 400);
  if (Date.now() > data.expiresAt) throw new AppError("Verification link expired", 400);

  await userModal.findByIdAndUpdate(req.session.user._id, { email: data.newEmail });

  delete req.session.emailChange;

  req.session.destroy(() => {
    res.redirect("/user/login?msg=Email updated successfully");
  });

})
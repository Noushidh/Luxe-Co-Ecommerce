
import crypto from "crypto";
import asyncHandler from "../../utils/asynHandler.js";
import userModal from "../../models/usermodel.js";
import cloudinary from "../../config/cloudinary.js";
import bcrypt from "bcryptjs";
import { sendEmailChangeVerification } from "../../utils/sendEmail.js"
import { generateReferralCode } from "../../utils/referal.js"

export const load_profile = asyncHandler(async (req, res) => {
  let user = await userModal.findById(req.session.user._id)

  if (!user.referralCode) {
    let uniqueCode = false;
    let newCode;

    while (!uniqueCode) {
      newCode = generateReferralCode(user.fullname);
      const existing = await userModal.findOne({ referralCode: newCode });
      if (!existing) uniqueCode = true;
    }
    user.referralCode = newCode;
    await user.save();
  }

  const userData = user.toObject();

  res.render("user/layout", {
    title: "Profile",
    body: "user/profile/profile",
    userData,
    currentPath: '/user/profile'
  });
});


export const load_editProfile = asyncHandler(async (req, res) => {
  const userData = await userModal.findById(req.session.user._id);
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
    return res.status(400).json({ success: false, message: "Invalid name" });
  }

  if (phone && !phoneRegex.test(phone)) {
    return res.status(400).json({ success: false, message: "Invalid phone number" });
  }

  const user = await userModal.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

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

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: "Current password is incorrect" });
  }

  const isSame = await bcrypt.compare(newPassword, user.password_hash);
  if (isSame) {
    return res.status(400).json({ success: false, message: "New password must be different from current password" });
  }
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
    return res.status(400).json({ success: false, message: "Invalid email address" });
  }

  const user = await userModal.findById(req.session.user._id);
  if (user.googleId) {
    return res.status(400).json({ success: false, message: "Google users cannot perform this action" });
  }

  if (user.email === newEmail) {
    return res.status(400).json({ success: false, message: "New email must be different from current email" });
  }

  const existingUser = await userModal.findOne({ email: newEmail });
  if (existingUser) {
    return res.status(400).json({ success: false, message: "This email is already used by another account" });
  }

  const token = crypto.randomBytes(32).toString("hex");

  req.session.emailChange = { newEmail, token, expiresAt: Date.now() + 2 * 60 * 1000 };

  const verifyLink = `${process.env.BASE_URL}/user/change-email/verify?token=${token}`;

  const emailSent = await sendEmailChangeVerification(newEmail, verifyLink);
  if (!emailSent) {
    return res.status(500).json({ success: false, message: "Failed to send verification email" });
  }

  return res.status(200).json({ success: true, message: "Verification link sent to your new email" });
})


export const verifyChangeEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send("Invalid verification link");
  }

  const data = req.session.emailChange;

  if (!data) {
    return res.status(400).send("Verification session expired");
  }

  if (data.token !== token) {
    return res.status(400).send("Invalid or expired verification link");
  }

  if (Date.now() > data.expiresAt) {
    return res.status(400).send("Verification link expired");
  }

  await userModal.findByIdAndUpdate(req.session.user._id, { email: data.newEmail });

  delete req.session.emailChange;

  req.session.destroy(() => {
    res.redirect("/user/login?msg=Email updated successfully");
  });

})
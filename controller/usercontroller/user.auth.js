import User from "../../models/usermodel.js";
import bcrypt from "bcryptjs";
import sendverificationEmail from "../../config/nodemailer.js";
import { generateOtp } from "../../utils/otp.js";
import { generateReferralCode } from "../../utils/referal.js"
import asyncHandler from "../../utils/asynHandler.js";
import walletModel from "../../models/walletmodel.js"
const saltround = 10;

export const loadlogin = (req, res) => {
    res.render('user/auth/login')
}
export const loadregister = (req, res) => {
    res.render('user/auth/register')
}
export const load_Forgot_Password = (req, res) => {
    res.render('user/auth/forgot-password')
}
export const load_otp = (req, res) => {
    res.render('user/auth/otp', { otpExpires: req.session.otpExpires || 0 })
}
export const load_reset_password = (req, res) => {
    res.render('user/auth/reset-password')
}



// ---------- LOGIN ----------
export const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.redirect("/user/login");
    }

    const user = await User.findOne({ email });
    if (!user) {
        req.flash('error', 'User does not exist');
        return res.redirect('/user/login');
    }

    if (user.isBlocked) {
        req.flash('error', 'Your account is blocked');
        res.status(403);
        return res.redirect('/user/login');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        req.flash('error', 'Invalid Credentials');
        return res.redirect('/user/login');
    }

    req.session.user = {
        _id: user._id,
        email: user.email,
        name: user.fullname
    };
    req.flash("success", "Login successful!");
    req.session.save(() => {
        res.redirect("/user");
    })
});

// ---------- REGISTER ----------
export const register = asyncHandler(async (req, res, next) => {
    const { name, email, password, confirmPassword, referredByCode } = req.body;
    console.log("refferedByCode", referredByCode)
    if (!name || !email || !password || !confirmPassword) {
        req.flash('error', 'All fields are required');
        return res.redirect('/user/register');
    }

    if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match');
        return res.redirect('/user/register');
    }

    const userExist = await User.findOne({ email });
    if (userExist) {
        req.flash('error', 'User already exists');
        return res.redirect('/user/register');
    }

    const otp = generateOtp();
    const emailSent = await sendverificationEmail(email, otp);

    if (!emailSent) {
        req.flash('error', 'Failed to send OTP');
        return res.redirect('/user/register');
    }

    let uniqueCode = false;
    let newCode;

    while (!uniqueCode) {
        newCode = generateReferralCode(name);
        const existing = await User.findOne({ referralCode: newCode });
        if (!existing) uniqueCode = true;
    }

    req.session.otp = otp;
    req.session.otpExpires = Date.now() + 60 * 1000;
    req.session.userData = { name, email, password, referralCode: newCode, referredByCode };

    req.flash('success', 'Send a otp in Your Email');
    console.log("OTP Sent", otp);

    return res.redirect('/user/otp');
});

// ---------- VERIFY OTP ----------
export const Verifyotp = asyncHandler(async (req, res) => {
    const { otp } = req.body;

    let storedOtp = req.session.otp || req.session.forgotOtp;

    if (!storedOtp || !req.session.otpExpires) {
        return res.json({ success: false, message: "OTP expired. Please resend a new OTP." });
    }

    if (Date.now() > req.session.otpExpires) {
        return res.json({ success: false, message: "OTP expired. Please resend a new OTP." });
    }

    if (String(otp) !== String(storedOtp)) {
        return res.status(400).json({ success: false, message: "Invalid OTP , please try again" });
    }
    // Forgot password flow
    if (req.session.forgotEmail && !req.session.userData) {
        return res.json({ success: true, redirect: "/user/reset-password" });
    }

    // Registration flow
    if (req.session.userData) {
        const { name, email, password, referralCode, referredByCode } = req.session.userData;

        const hashedPassword = await bcrypt.hash(password, saltround);
        const newUser = new User({
            fullname: name,
            email: email,
            password_hash: hashedPassword,
            referralCode,
            isVerified: true
        });

        const newUserWallet = new walletModel({
            userId: newUser._id,
            balance: 0,
            transactions: []
        });

        if (referredByCode) {
            const referrer = await User.findOne({ referralCode: referredByCode });

            if (referrer) {
                newUser.referredBy = referrer._id;
                console.log("Success: Linked to referrer", referrer.fullname);


                let referrerWallet = await walletModel.findOne({ userId: referrer._id });

                if (referrerWallet) {
                    referrerWallet.balance += 1000;
                    referrerWallet.transactions.push({
                        transactionId: `REF-${Date.now()}`,
                        amount: 1000,
                        type: "Credit",
                        description: `Referral reward for inviting ${newUser.fullname}`,
                        status: "Success"
                    });
                    await referrerWallet.save();
                     console.log("referer wallet",referrerWallet)
                }

                newUserWallet.balance = 500;
                newUserWallet.transactions.push({
                    transactionId: `WLC-${Date.now()}`,
                    amount: 500,
                    type: "Credit",
                    description: `Welcome bonus for joining Luxe & Co`,
                    status: "Success"
                });
            }
        }

        await newUser.save();
        await newUserWallet.save();
        console.log("newUser wallet",newUserWallet)


        req.session.user = {_id: newUser._id,email: newUser.email,name: newUser.fullname};

        req.session.otp = null;
        req.session.otpExpires = null;
        req.session.userData = null;

        req.flash('success', 'User created Successfully');
        return res.json({ success: true, redirect: "/user/login" });
    }

    return res.status(400).json({ success: false, message: "Invalid OTP, please try again" });
});

// ---------- RESEND OTP ----------
export const resendOTP = asyncHandler(async (req, res) => {
    let email;

    if (req.session.userData?.email) {
        email = req.session.userData.email;
    } else if (req.session.forgotEmail) {
        email = req.session.forgotEmail;
    } else {
        return res.status(400).json({ success: false, message: "Session expired. Please enter your email again." });
    }

    const otp = generateOtp();
    req.session.otp = otp;
    req.session.otpExpires = Date.now() + 60 * 1000;

    const emailSent = await sendverificationEmail(email, otp);

    if (emailSent) {
        console.log("Resend otp", otp);
        return res.json({ success: true, message: "OTP Resend Successfully", otpExpires: req.session.otpExpires });
    }

    return res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again" });
});

// ---------- FORGOT PASSWORD ----------
export const fogotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ success: false, message: "email not found" });
    }

    const otp = generateOtp();

    req.session.forgotEmail = email;
    req.session.forgotOtp = otp;
    req.session.otpExpires = Date.now() + 60 * 1000;

    await sendverificationEmail(email, otp);
    console.log("password OTP:", otp);

    return res.json({ success: true, message: "OTP Sent Successfully", redirect: "/user/otp" });
});

// ---------- RESET PASSWORD ----------
export const reset_Password = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const forgotEmail = req.session.forgotEmail;

    if (!forgotEmail) {
        return res.status(404).json({ success: false, message: "Session expired. Please restart the process." });
    }

    const user = await User.findOne({ email: forgotEmail });
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(password, saltround);
    user.password_hash = hashedPassword;
    await user.save();

    req.session.otp = null;
    req.session.forgotEmail = null;
    req.session.forgotOtp = null;
    req.session.otpExpires = null;

    return res.json({ success: true, message: "Password reset successful", redirect: "/user/login?reset=success" });
});

// ---------- LOGOUT ----------
export const isLogout = asyncHandler(async (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log("Logout error:", err);
            return res.status(500).json({ success: false });
        }
        res.clearCookie("connect.sid");
        return res.json({ success: true})
    });
});
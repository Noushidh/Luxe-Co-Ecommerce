import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,           
  secure: false,       
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD
  }
});

export async function sendOtpEmail(email, otp) {
  try {
    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      html: `
        <h2>Account Verification</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP is valid for a limited time.</p>
      `
    });

    console.log("OTP MAIL RESULT:", info);
    return info.accepted.length > 0;
  } catch (err) {
    console.error("OTP MAIL ERROR:", err);
    return false;
  }
}

export async function sendEmailChangeVerification(email, link) {
  try {
    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Confirm your new email address",
      html: `
        <div style="font-family: Arial; padding:20px">
          <h2>Email Change Confirmation</h2>
          <p>Click the button below to verify your new email address:</p>

          <a href="${link}"
             style="
               display:inline-block;
               padding:12px 18px;
               background:#C8A97E;
               color:#4B3621;
               text-decoration:none;
               border-radius:6px;
               font-weight:600;
             ">
             Verify Email
          </a>

          <p style="margin-top:15px">
            Or copy and paste this link:
            <br />
            <a href="${link}">${link}</a>
          </p>

          <p>This link expires in 2 minutes.</p>
        </div>
      `
    });

    console.log("LINK MAIL RESULT:", info);
    return info.accepted.length > 0;
  } catch (err) {
    console.error("LINK MAIL ERROR:", err);
    return false;
  }
}

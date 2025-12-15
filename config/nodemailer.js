import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  family: 4,  
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

export default async function sendVerificationEmail(email, otp) {
  try {
    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      html: `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #F8F8F8;">
      <h2 style="color: #4B3621;">Account Verification</h2>
      <p style="color: #4B3621; font-size: 16px;">
        Thank you for registering! Please use the following One-Time Password (OTP) to verify your account:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="
          display: inline-block;
          background-color: #C8A97E;
          color: #4B3621;
          font-size: 24px;
          font-weight: bold;
          padding: 10px 20px;
          border-radius: 5px;
          border: 1px solid #4B3621;
        ">
          ${otp}
        </span>
      </div>
      <p style="color: #4B3621; font-size: 14px;">
        This OTP is valid for a limited time. Do not share this code with anyone.
      </p>
    </div>
  `
    });
    console.log("MAIL SEND RESULT:", info);   // <--- ADD THIS
    return info.accepted.length > 0;
  } catch (error) {
    console.log("Error Sending Email:", error);
    return false;
  }
}


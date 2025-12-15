import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,   
    trim: true
  },

  email: {
    type: String,
    unique: true,
    lowercase: true
  },

  password_hash: {
    type: String,     
  },

  googleId: {
    type: String,    
    default: null
  },


  phone: {                  
    type: String,
    default: null
  },

  profilePic: {
    type: String,
    default: null
  },

  profilePicPublicId: {
    type: String,
    default: null
  },

  isBlocked: {
    type: Boolean,
    default: false
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  otp: {
    type: String,
    default: null
  },

  otpExpires: {
    type: Date,
    default: null
  }

}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;

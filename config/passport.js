import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/usermodel.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const email = profile.emails?.[0]?.value;
        const fullname = profile.displayName;
        const profilePic = profile.photos?.[0]?.value;
        const googleId = profile.id;

        if (!email) {
          return cb(new Error("Google email missing"), null);
        }

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            fullname,
            email,
            googleId,
            profilePic,
            isVerified: true,
          });
        } else {
          if (!user.googleId) user.googleId = googleId;
          if (!user.profilePic) user.profilePic = profilePic;
          if (!user.fullname) user.fullname = fullname;
          if (!user.isVerified) user.isVerified = true;

          await user.save();
        }

        return cb(null, user);

      } catch (err) {
        console.error("GOOGLE STRATEGY ERROR:", err);
        return cb(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;

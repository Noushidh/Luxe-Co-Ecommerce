import UserModel from "../models/usermodel.js";

export const isAuthenticated = (req, res, next) => {
  if (req.session?.user) {
    return next();
  }
  return res.redirect("/user/login");
};

export const isLoggin = (req, res, next) => {
  if (req.session?.user) {
    return res.redirect("/user");
  }
  next();
};

export const isBlocked = async (req, res, next) => {
  try {
    const userId = req.session?.user?._id;
    if (!userId) return next();

    const user = await UserModel.findById(userId).select("isBlocked");

    if (!user || user.isBlocked) {
      req.session.destroy(() => {
        return res.redirect("/user/login?blocked=true");
      });
    } else {
      next();
    }
  } catch (error) {
    console.error("Block check error:", error);
    next();
  }
};

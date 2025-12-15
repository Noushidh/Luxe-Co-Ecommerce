import Admin from "../../models/adminmodel.js";
import bcrypt from "bcryptjs";
import asyncHandler from "../../utils/asyncHandler.js";

export const loadlogin = (req, res) => {
  res.render("admin/login", {
    error: req.flash("error")  
  });
};

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });

  if (!admin) {
    req.flash("error", "Admin not found!");
    return res.redirect("/admin/login");
  }
  const isMatch = await bcrypt.compare(password, admin.password_hash);

  if (!isMatch) {
    req.flash("error", "Invalid Password");
    return res.redirect("/admin/login");
  }

  req.session.admin = admin._id;
  return res.redirect("/admin/dashboard");
});

export const isLogout = asyncHandler(async (req, res, next) => {
    req.session.destroy((err) => {
        if (err) return next(err);  
        res.redirect("/admin/login");
    });
});

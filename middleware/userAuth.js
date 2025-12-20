import UserModel from "../models/usermodel.js";
import CartModel from "../models/cartmodel.js"

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


//cart count in header
export const cartCountMiddleware = async (req, res, next) => {
  try {
    res.locals.cartItemsCount = 0;

    if (req.session.user?._id) {
      const cart = await CartModel.findOne({ user: req.session.user._id }, { items: 1 }).lean();

      // res.locals.cartItemsCount = cart?.items.length || 0;
      if (cart && cart.items) {
        res.locals.cartItemsCount = cart.items.length;
      }
    }
    //  else {
    //   res.locals.cartItemsCount = 0;
    // }
  } catch (err) {
    console.error("Cart count middleware error:", err);
    res.locals.cartItemsCount = 0;
  }
  next();
}

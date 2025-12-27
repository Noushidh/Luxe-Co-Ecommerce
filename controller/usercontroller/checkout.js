import CartModel from "../../models/cartmodel.js";
import asyncHandler from "../../utils/asynHandler.js";
import addressmodel from "../../models/addressmodel.js";
import couponModel from "../../models/couponmodel.js";

export const load_checkout = asyncHandler(async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect("/user/login");
    }
    const userId = req.session.user._id;

    const cart = await CartModel.findOne({ user: userId }).populate({path: 'items.productId',populate: {path: 'subCategory_id',model: 'SubCategory'}
    });

    if (!cart || !cart.items || cart.items.length === 0) {
        return res.redirect("/user/cart");
    }

    const cartCategories = cart.items.map(item => {return item.productId && item.productId.subCategory_id ? item.productId.subCategory_id.category.trim() : null}).filter(Boolean);

    let originalTotal = 0;
    let payableTotal = 0;
    cart.items.forEach(item => {
        originalTotal += (item.productId.price * item.quantity);
        payableTotal += (item.price * item.quantity);
    });

    const subTotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const finalDiscount = originalTotal - payableTotal;
    const shipping = subTotal > 500 ? 0 : 50;
    const addresses = await addressmodel.find({ userId: userId });

    const now = new Date();
    const AllactiveCoupons = await couponModel.find({ isActive: true,startDate:{$lte:now},expiryDate:{$gte:now}});

    const filteredCoupons = AllactiveCoupons.filter(coupon => {
        if (coupon.appliesTo === "all") {
            return true;
        } else if (coupon.appliesTo === "category") {
            const scope = coupon.categoryScope && coupon.categoryScope !== 'none' ? coupon.categoryScope : coupon.targetId;
            return cartCategories.some(cat => cat.trim().toLowerCase() === String(scope).trim().toLowerCase());
        }
        return false;
    });

    return res.render("user/layout", {
        title: "Checkout",
        body: "user/checkout/checkout",
        checkout: cart.items,
        checkoutitemcount: cart.items.length,
        addresses: addresses,
        subTotal: subTotal,
        discount: finalDiscount,
        shipping: shipping,
        total: subTotal + shipping, 
        coupons: filteredCoupons
    });
});

//checkout button
export const checkStockBeforeCheckout = asyncHandler(async (req, res) => {

    const userId = req.session.user._id;

    const cart = await CartModel.findOne({ user: userId }).populate("items.productId");

    if (!cart || !cart.items || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: "Your cart is empty" });
    }

    for (let item of cart.items) {
        const product = item.productId;

        if (item.quantity > product.stock) {
            return res.status(400).json({ success: false, message: `${product.name} only has few stock` });
        }

        if (product.isBlocked) {
            return res.status(400).json({ success: false, message: `${product.name} is currently unavailable .` });
        }
    }

    return res.status(200).json({ success: true, redirect: "/user/checkout" });
});


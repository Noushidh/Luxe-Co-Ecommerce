import CartModel from "../../models/cartmodel.js";
import asyncHandler from "../../utils/asynHandler.js";
import addressmodel from "../../models/addressmodel.js";
import couponModel from "../../models/couponmodel.js";

export const load_checkout = asyncHandler(async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect("/user/login");
    }
    const userId = req.session.user._id;

    const cart = await CartModel.findOne({ user: userId }).populate({
        path: 'items.productId', populate: { path: 'subCategory_id', model: 'SubCategory' }
    });

    if (!cart || !cart.items || cart.items.length === 0) {
        return res.redirect("/user/cart");
    }

    let originalTotal = 0;
    let payableTotal = 0;
    cart.items.forEach(item => {
        originalTotal += (item.productId.price * item.quantity);
        payableTotal += (item.price * item.quantity);
    });
    const subTotal = payableTotal
    const productDiscount = originalTotal - payableTotal;

    const appliedCoupon = req.session.appliedCoupon || { discountValue: 0 };
    const couponDiscount = appliedCoupon.discountValue;


    const shipping = subTotal > 500 ? 0 : 50;
    const finalTotal = (originalTotal - productDiscount - couponDiscount) + shipping;
    const totalSavings = productDiscount + couponDiscount;
    const addresses = await addressmodel.find({ userId: userId });

    const now = new Date();
    const AvailableCoupens = await couponModel.find({
        isActive: true, startDate: { $lte: now }, expiryDate: { $gte: now }, usersUsed: { $ne: userId }
    });

    return res.render("user/layout", {
        title: "Checkout",
        body: "user/checkout/checkout",
        checkout: cart.items,
        checkoutitemcount: cart.items.length,
        addresses: addresses,
        subTotal: originalTotal,
        productDiscount: productDiscount,
        couponDiscount: couponDiscount,
        totalDiscount: totalSavings,   
        appliedCouponCode: appliedCoupon.code,
        shipping: shipping,
        total: finalTotal,
        coupons: AvailableCoupens
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


export const applyCoupen = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const userId = req.session.user._id; 

    const cart = await CartModel.findOne({ user: userId }).populate('items.productId');
    const subTotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    const coupon = await couponModel.findOne({ code: code, isActive: true });

    if (!coupon) {
        return res.status(404).json({ success: false, message: "Invalid or expired coupon code" });
    }

    if (coupon.usersUsed.includes(userId)) {
        return res.status(400).json({ success: false, message: "You have already used this coupon!" });
    }

    if (subTotal < coupon.minPurchase) {
        return res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} required` });
    }

    let finalDiscountValue = 0;

    if (coupon.discountType === 'percentage') {
        finalDiscountValue = (subTotal * coupon.discountValue) / 100;
        
        if (coupon.maxDiscountAmount && finalDiscountValue > coupon.maxDiscountAmount) {
            finalDiscountValue = coupon.maxDiscountAmount;
        }
    } else {
        finalDiscountValue = coupon.discountValue;
    }

    if (finalDiscountValue > subTotal) {
        finalDiscountValue = subTotal;
    }

    req.session.appliedCoupon = {
        _id: coupon._id,
        code: coupon.code,
        discountValue: Math.round(finalDiscountValue)
    };

    res.status(200).json({ 
        success: true, 
        message: "Coupon applied!", 
        discount: req.session.appliedCoupon.discountValue 
    });
});
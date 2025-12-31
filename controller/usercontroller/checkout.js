import CartModel from "../../models/cartmodel.js";
import asyncHandler from "../../utils/asynHandler.js";
import addressmodel from "../../models/addressmodel.js";
import couponModel from "../../models/couponmodel.js";
import { getBestOfferForProduct } from "../../utils/offerHelper.js";

export const load_checkout = asyncHandler(async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect("/user/login");
    }
    const userId = req.session.user._id;

    const cart = await CartModel.findOne({ user: userId }).populate({
        path: 'items.productId', 
        populate: { path: 'subCategory_id', model: 'SubCategory' }
    });

    if (!cart || !cart.items || cart.items.length === 0) {
        return res.redirect("/user/cart");
    }

    let originalTotal = 0;
    let totalOfferDiscount = 0;

    const updatedItems = await Promise.all(cart.items.map(async (item) => {
        const product = item.productId;
        
        const { finalPrice } = await getBestOfferForProduct(product);
        
        const itemOriginalTotal = product.price * item.quantity;
        const itemOfferTotal = finalPrice * item.quantity;

        originalTotal += itemOriginalTotal;
        totalOfferDiscount += (itemOriginalTotal - itemOfferTotal);

        return {...item.toObject(),currentOfferPrice: finalPrice, itemTotal: itemOfferTotal };
        
    }));

    const payableAfterOffers = originalTotal - totalOfferDiscount;

    const appliedCoupon = req.session.appliedCoupon || { discountValue: 0, code: null };
    const couponDiscount = appliedCoupon.discountValue;

    const shipping = payableAfterOffers > 500 ? 0 : 50;
    
    const finalTotal = (payableAfterOffers - couponDiscount) + shipping;
    const totalSavings = totalOfferDiscount + couponDiscount;

    const addresses = await addressmodel.find({ userId: userId });
    const now = new Date();
    const AvailableCoupens = await couponModel.find({
        isActive: true, 
        startDate: { $lte: now }, 
        expiryDate: { $gte: now }, 
        usersUsed: { $ne: userId }
    });

    return res.render("user/layout", {
        title: "Checkout",
        body: "user/checkout/checkout",
        checkout: updatedItems,
        checkoutitemcount: cart.items.length,
        addresses: addresses,
        subTotal: originalTotal,        
        offerDiscount: totalOfferDiscount, 
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
    const userId = req.session.user;
    console.log("code===", code);
    const cart = await CartModel.findOne({ user: userId }).populate('items.productId')
    const subTotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    console.log(subTotal)
    const coupon = await couponModel.findOne({ code: code, isActive: true })
    

     if (coupon.usersUsed.includes(userId)) {
        return res.status(400).json({ success: false, message: "You have already used this coupon!" });
    }

    let finalDiscountValue = coupon.discountType === 'percentage'
        ? (subTotal * coupon.discountValue) / 100 : coupon.discountValue;

    if (coupon.discountType === 'percentage' && coupon.maxDiscountAmount && finalDiscountValue > coupon.maxDiscountAmount) {
        finalDiscountValue = coupon.maxDiscountAmount;
    }

    if (finalDiscountValue > subTotal) {
        finalDiscountValue = subTotal;
    }

    if (coupon.usersUsed.includes(userId)) {
        return res.status(400).json({ success: false, message: "You have already used this coupon once!" });
    }

    req.session.appliedCoupon = {_id:coupon._id,code: coupon.code,discountValue: Math.round(finalDiscountValue)};

    console.log("finalDiscountValue", finalDiscountValue)
    res.status(200).json({ success: true, message: "Coupon applied!", discount: finalDiscountValue });
})
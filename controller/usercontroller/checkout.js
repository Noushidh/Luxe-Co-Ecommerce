import CartModel from "../../models/cartmodel.js";
import asyncHandler from "../../utils/asynHandler.js";
import addressmodel from "../../models/addressmodel.js";
import couponModel from "../../models/couponmodel.js";
import AppError from "../../utils/appError.js";
import { HTTP_STATUS } from "../../utils/httpStatus.js";
import { validateStock } from "../../utils/stockHelper.js";
import { getBestOfferForProduct } from "../../utils/offerHelper.js";

// 1. Load Checkout Page
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

        return { ...item.toObject(), currentOfferPrice: finalPrice, itemTotal: itemOfferTotal };
    }));


    const payableAfterOffers = originalTotal - totalOfferDiscount;

    if (req.session.appliedCoupon) {
        const coupon = await couponModel.findById(req.session.appliedCoupon._id);

        if (!coupon || !coupon.isActive || payableAfterOffers < coupon.minPurchase) {
            delete req.session.appliedCoupon;
        } else {
            let newDiscount = 0;
            if (coupon.discountType === 'percentage') {
                newDiscount = (payableAfterOffers * coupon.discountValue) / 100;
                if (coupon.maxDiscountAmount && newDiscount > coupon.maxDiscountAmount) {
                    newDiscount = coupon.maxDiscountAmount;
                }
            } else {
                newDiscount = coupon.discountValue;
            }
            req.session.appliedCoupon.discountValue = Math.round(Math.min(newDiscount, payableAfterOffers));
        }
    }

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

export const checkStockBeforeCheckout = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;
    const cart = await CartModel.findOne({ user: userId }).populate("items.productId");

    if (!cart || !cart.items || cart.items.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Your cart is empty" });
    }
    try {
        validateStock(cart.items);
        return res.status(HTTP_STATUS.OK).json({ success: true, redirect: "/user/checkout" });

    } catch (error) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: error.message });
    }
});

export const applyCoupen = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const userId = req.session.user._id;

    const cart = await CartModel.findOne({ user: userId }).populate('items.productId');
    if (!cart) throw new AppError("Cart not found", HTTP_STATUS.BAD_REQUEST);

    const subTotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const coupon = await couponModel.findOne({ code: code, isActive: true });

    if (!coupon) {
        throw new AppError("Invalid or expired coupon code", HTTP_STATUS.NOT_FOUND);
    }

    if (coupon.usersUsed.includes(userId)) {
        throw new AppError("You have already used this coupon", HTTP_STATUS.BAD_REQUEST);
    }

    if (subTotal < coupon.minPurchase) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} required` });
    }

    if (coupon.limit !== null && coupon.usersUsed.length >= coupon.limit) {
        throw new AppError("This coupon has reached its maximum usage limit", HTTP_STATUS.BAD_REQUEST);
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

    res.status(HTTP_STATUS.OK).json({ success: true, message: "Coupon applied successfully!", discount: req.session.appliedCoupon.discountValue });
});

export const removeCoupen = asyncHandler(async (req, res) => {
    if (req.session.appliedCoupon) {
        delete req.session.appliedCoupon;
    }
    if (req.session.appliedCouponCode) {
        delete req.session.appliedCouponCode;
    }
    return res.status(HTTP_STATUS.OK).json({ success: true });
})
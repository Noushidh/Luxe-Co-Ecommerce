import asyncHandler from '../../utils/asynHandler.js';
import CartModel from '../../models/cartmodel.js';
import { finalizeOrder } from "../../utils/orderHelper.js"
import { calculateOrderPrices } from "../../utils/orderHelper.js"
import { validateStock } from "../../utils/stockHelper.js";
import Razorpay from 'razorpay';
import crypto from "crypto";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const razorpayPayment = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;

    const cart = await CartModel.findOne({ user: userId }).populate({
        path: "items.productId",
        populate: { path: "subCategory_id", model: "SubCategory" } 
    });

    if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: "Cart is empty" });
    }
        try {
            validateStock(cart.items);
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message, redirect: "/user/cart" });
        }

    const prices = await calculateOrderPrices(cart, req.session.appliedCoupon);

    const options = {
        amount: Math.round(prices.finalTotal * 100),
        currency: "INR",
        receipt: `rcpt_${userId.toString().slice(-4)}_${Date.now()}`
    };

    try {
        const razorpayOrder = await razorpay.orders.create(options);

        console.log("Razorpay Order Success:", razorpayOrder.id, "Amount:", prices.finalTotal);

        res.status(200).json({
            success: true,
            razorpayOrder,
            user: req.session.user,
            finalOrderTotal: prices.finalTotal
        });
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({
            success: false,
            message: "Could not initiate (thudakkan kazhiyilla) payment"
        });
    }
});


export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
    console.log(req.body)
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, addressDetails } = req.body;
    const userId = req.session.user._id;
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    if (hmac.digest("hex") !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const cart = await CartModel.findOne({ user: userId }).populate("items.productId");
    const appliedCoupon = req.session.appliedCoupon || { discountValue: 0 };

    const savedOrder = await finalizeOrder({
        userId: userId,
        cart,
        address: addressDetails,
        appliedCoupon,
        paymentMethod: "razorpay",
        paymentStatus: "Paid",
        razorpayPaymentId: razorpay_payment_id
    });
    console.log(savedOrder);
    delete req.session.appliedCoupon;
    res.json({ success: true, orderId: savedOrder._id });
});

//payment failed page
export const load_paymentFailed = asyncHandler(async (req, res) => {
    const reason = req.query.reason || "Your payment could not be processed.";

    res.render("user/layout", {
        title: "Payment Failed",
        body: "user/payment/payment-failed",
        reason: reason
    });
});
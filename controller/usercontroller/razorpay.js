import asyncHandler from '../../utils/asynHandler.js';
import CartModel from '../../models/cartmodel.js';
import { getBestOfferForProduct } from "../../utils/offerHelper.js";
import Razorpay from 'razorpay';


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const razorpayPayment = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;
    const cart = await CartModel.findOne({ user: userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    let payableAfterOffers = 0;
    for (const item of cart.items) {
        const { finalPrice } = await getBestOfferForProduct(item.productId);
        payableAfterOffers += finalPrice * item.quantity;
    }

    const appliedCoupon = req.session.appliedCoupon || { discountValue: 0 };
    const shipping = payableAfterOffers > 500 ? 0 : 50;
    const finalOrderTotal = (payableAfterOffers - appliedCoupon.discountValue) + shipping;

    const options = {
        amount: Math.round(finalOrderTotal * 100), 
        currency: "INR",
        receipt: `rcpt_${userId.toString().slice(-4)}_${Date.now()}`
    };

    try {
        const razorpayOrder = await razorpay.orders.create(options);
        
        res.status(200).json({
            success: true,
            razorpayOrder, 
            user: req.session.user,
            finalOrderTotal
        });
        console.log("suucess",razorpayOrder,finalOrderTotal)
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({ success: false, message: "Could not initiate payment" });
    }
});
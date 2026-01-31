import asyncHandler from '../../utils/asynHandler.js';
import CartModel from '../../models/cartmodel.js';
import { finalizeOrder } from "../../utils/orderHelper.js"
import { calculateOrderPrices } from "../../utils/orderHelper.js"
import { validateStock } from "../../utils/stockHelper.js";
import { HTTP_STATUS } from '../../utils/httpStatus.js';
import Razorpay from 'razorpay';
import crypto from "crypto";
import orderModel from "../../models/ordermodel.js";
import ProductModel from '../../models/productmodel.js';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const razorpayPayment = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;
    const { address } = req.body;
    req.session.selectedAddress = address;

    const cart = await CartModel.findOne({ user: userId }).populate({
        path: "items.productId",
        populate: { path: "subCategory_id", model: "SubCategory" }
    });

    if (!cart || cart.items.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Cart is empty" });
    }
    try {
        validateStock(cart.items);
    } catch (error) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message, redirect: "/user/cart" });
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

        res.status(HTTP_STATUS.OK).json({
            success: true,
            razorpayOrder,
            user: req.session.user,
            finalOrderTotal: prices.finalTotal
        });
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500).json({success: false,message: "Could not initiate payment"});
    }
});


export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
    console.log(req.body)
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature, addressDetails } = req.body;
    const userId = req.session.user._id;
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    if (hmac.digest("hex") !== razorpay_signature) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Invalid signature" });
    }
    let finalOrder;
    if (orderId) {
        const order = await orderModel.findById(orderId);
        for (let item of order.items) {
            await ProductModel.updateOne(
                { _id: item.productId, "variants.size": item.size, "variants.color": item.color },
                { $inc: { "variants.$.stock": -item.quantity } }
            )
        }
        finalOrder = await orderModel.findByIdAndUpdate(orderId, {
            status: "Confirmed",
            paymentStatus: "Paid",
            razorpayPaymentId: razorpay_payment_id,
            "items.$[].status": "Placed"
        }, { new: true });
        await CartModel.findOneAndUpdate({user:userId},{$set:{items:[]}});
        console.log("Cart cleared after successful retry payment");
    } else {
        const cart = await CartModel.findOne({ user: userId }).populate("items.productId");
        const appliedCoupon = req.session.appliedCoupon || { discountValue: 0 };

        finalOrder = await finalizeOrder({
            userId: userId,
            cart,
            address: addressDetails,
            appliedCoupon,
            paymentMethod: "razorpay",
            paymentStatus: "Paid",
            razorpayPaymentId: razorpay_payment_id
        });
        // console.log(finalOrder);
        delete req.session.appliedCoupon;
    }
    res.json({ success: true, orderId: finalOrder._id });
});

//payment failed page
export const load_paymentFailed = asyncHandler(async (req, res) => {

    const user = req.session.user._id;
    const selectedAddress = req.session.selectedAddress;
    const coupon = req.session.appliedCoupon ? req.session.appliedCoupon.discountValue : 0;
    const { razorpay_order_id ,mongo_id} = req.query;
    console.log(razorpay_order_id,"mongo",mongo_id);

    const cart = await CartModel.findOne({ user }).populate({ path: "items.productId", populate: { path: "subCategory_id", model: "SubCategory" } });
    const subtotal = cart.items.reduce((sum, i) => sum += i.price * i.quantity, 0);
    const finalTotal = subtotal - coupon;
    console.log("finalTotal", finalTotal);

    let order;

    if (mongo_id) {
        order = await orderModel.findByIdAndUpdate(mongo_id, {
            $set: {
                razorpayOrderId: razorpay_order_id, 
                status: "Failed",
                paymentStatus: "Failed"
            }
        }, { new: true });
    } else {
        const currentYear = new Date().getFullYear();
        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        const uniqueOrderId = `LUX-${currentYear}-${randomNumber}`;

        order = await orderModel.findOneAndUpdate(
            { razorpayOrderId: razorpay_order_id },
            {
                $set: {
                    userId: user,
                    razorpayOrderId: razorpay_order_id,
                    address: selectedAddress,
                    items: cart.items.map(item => ({
                        productId: item.productId._id,
                        productName: item.productId.name,
                        image: item.image,
                        price: item.price,
                        quantity: item.quantity,
                        size: item.size,
                        color: item.color,
                        status: "Failed",
                    })),
                    total: finalTotal,
                    discount: coupon,
                    status: "Failed",
                    paymentMethod: "razorpay",
                    paymentStatus: "Failed"
                },
                $setOnInsert: { orderId: uniqueOrderId }
            }, { upsert: true, new: true }
        );
    }

    const reason = req.query.reason || "Your payment could not be processed.";

    res.render("user/layout", {
        title: "Payment Failed",
        body: "user/payment/payment-failed",
        reason: reason,
        order,
        razorpayKey: process.env.RAZORPAY_KEY_ID
    });
});

//RetryPayment
export const RetryPayment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await orderModel.findById(id).populate('items.productId');
    if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" })
    }
    try{
        validateStock(order.items);
    }catch(err){
        return res.status(HTTP_STATUS.BAD_REQUEST).json({success:false,message:`Stock issues:${err.message}. Please update your cart.`})
    }
    if (order.status !== "Failed" || order.paymentStatus !== "Failed") {
        return res.status(400).json({ success: false, message: "Retry not allowed for this order" });
    }
    const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(order.total * 100),
        currency: "INR",
        receipt: `retry_${order._id}`
    });
    res.status(200).json({ success: true, razorpayOrder ,id:order._id});

})
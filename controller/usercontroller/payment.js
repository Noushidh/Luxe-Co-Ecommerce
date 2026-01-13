import productModel from "../../models/productmodel.js"
import addressModel from "../../models/addressmodel.js";
import CartModel from "../../models/cartmodel.js";
import OrderModel from "../../models/ordermodel.js";
import asyncHandler from "../../utils/asynHandler.js";
import walletModel from "../../models/walletmodel.js"
import mongoose from "mongoose";
import { finalizeOrder } from "../../utils/orderHelper.js"
import { calculateOrderPrices } from "../../utils/orderHelper.js";

export const load_payment = asyncHandler(async (req, res) => {
    const { addressId } = req.query;
    const userId = req.session.user?._id;

    const address = await addressModel.findOne({ _id: addressId, userId });
    if (!address) {
        return res.redirect('/user/cart');
    }

    const cart = await CartModel.findOne({ user: userId }).populate({
        path: 'items.productId',
        populate: { path: 'subCategory_id', model: 'SubCategory' }
    });

    if (!cart || cart.items.length === 0) {
        return res.redirect('/user/cart');
    }
    const prices = await calculateOrderPrices(cart, req.session.appliedCoupon);
    const wallet = await walletModel.findOne({ userId });

    res.render("user/layout", {
        title: "Payment",
        body: "user/payment/payment",
        address,
        wallet,
        subTotal: prices.grossSubTotal,
        discount: prices.totalSavings,
        shipping: prices.shipping,
        total: prices.finalTotal,
        razorpayKey: process.env.RAZORPAY_KEY_ID
    });
});

export const cashOnDeliveryChecking = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ success: false, message: "Please select a shipping address" });
    }

    const cart = await CartModel.findOne({ user: userId }).populate({
        path: 'items.productId',
        populate: { path: 'subCategory_id' }
    });
    if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const prices = await calculateOrderPrices(cart, req.session.appliedCoupon);

    if (prices.finalTotal > 1000) {
        return res.status(400).json({ success: false, message: "Cash on Delivery is only available for orders below Rs 1000. Please use online payment." });
    }

    for (const item of cart.items) {
        const variant = item.productId.variants.find(v => v.size === item.size && v.color === item.color);
        if (!variant || variant.stock < item.quantity) {
            return res.status(400).json({ success: false, message: `Stock unavailable for ${item.productId.name}` });
        }
    }

    const appliedCoupon = req.session.appliedCoupon || { discountValue: 0, _id: null };

    const savedOrder = await finalizeOrder({
        userId,
        cart,
        address,
        appliedCoupon,
        paymentMethod: "cashOnDelivery",
        paymentStatus: "Pending",
        razorpayPaymentId: null
    });

    delete req.session.appliedCoupon;

    res.status(201).json({ success: true, message: "Order placed successfully", orderId: savedOrder._id });
});

export const load_orderConfirmed = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.redirect('/user/home');
    }

    const order = await OrderModel.findById(id)
        .populate('couponId')
        .populate('items.productId');

    if (!order) {
        return res.render("user/layout", {
            title: "Order Not Found",
            body: "user/pages/page-404",
            message: "Order details not found"
        });
    }
    const items = order.items || [];

    const subTotalMRP = items.reduce((acc, item) => {
        const mrp = item.productId ? item.productId.price : item.price;
        return acc + (mrp * item.quantity);
    }, 0);

    const couponSavings = order.discount || 0;

    const totalSoldPrice = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const offerSavings = (subTotalMRP - totalSoldPrice);
    const totalSavings = (offerSavings > 0 ? offerSavings : 0) + couponSavings;
    const actualPayable = subTotalMRP - totalSavings + (order.shipping || 0);;
    res.render("user/layout", {
        title: "Order Confirmed",
        body: "user/payment/order-confirmed",
        order,
        items,
        subTotal: subTotalMRP,
        offerSavings: offerSavings > 0 ? offerSavings : 0,
        couponDiscount: couponSavings,
        totalSavings: totalSavings,
        shipping: order.shipping || 0,
        total: actualPayable,
    });
});

export const orderCancel = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user._id;

    const order = await OrderModel.findOne({ _id: id, userId });

    if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (["Shipped", "Delivered", "Cancelled"].includes(order.status)) {
        return res.status(400).json({ success: false, message: `Cannot cancel a ${order.status} order.` });
    }

    for (const item of order.items) {
        const product = await productModel.findById(item.productId);

        if (product) {
            const variant = product.variants.find(v => v.size === item.size && v.color === item.color);

            if (variant) {
                await productModel.updateOne(
                    { _id: item.productId, "variants._id": variant._id },
                    { $inc: { "variants.$.stock": item.quantity } });
            }
        }
    }

    if (order.paymentMethod !== "cashOnDelivery" && order.paymentStatus === "Paid") {
        const refundAmount = order.total;

        await walletModel.findOneAndUpdate(
            { userId: userId },
            {
                $inc: { balance: refundAmount },
                $push: {
                    transactions: {
                        transactionId: `CAN-${order._id.toString().slice(-6)}`,
                        amount: refundAmount,
                        type: 'Credit',
                        description: `Refund for cancelled order: ${order._id}`,
                        status: "Success",
                        date: new Date()
                    }
                }
            },
            { upsert: true }
        );
    }

    order.status = "Cancelled";
    order.items.forEach(item => item.status = "Cancelled");
    await order.save();

    res.status(200).json({ success: true, message: "Order cancelled and and refund processed if applicable" });
});



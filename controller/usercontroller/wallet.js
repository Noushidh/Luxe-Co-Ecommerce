import Razorpay from 'razorpay';
import crypto from "crypto";
import asyncHandler from "../../utils/asynHandler.js";
import userModal from "../../models/usermodel.js"
import walletModel from "../../models/walletmodel.js"
import CartModel from "../../models/cartmodel.js";
import { validateStock } from "../../utils/stockHelper.js";
import { calculateOrderPrices, finalizeOrder } from "../../utils/orderHelper.js";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const load_wallet = asyncHandler(async (req, res) => {
    const { page = 1 } = req.query;
    const userId = req.session.user._id;

    const limit = 5;
    const skip = (parseInt(page) - 1) * limit;

    let wallet = await walletModel.findOne({ userId });

    if (!wallet) {
        wallet = await walletModel.create({ userId, balance: 0, transactions: [] });
    }

    const totaltransactions = wallet.transactions.length;
    const totalPages = Math.ceil(totaltransactions / limit);
    const paginatedTransactions = wallet.transactions.slice().reverse().slice(skip, skip + limit);

    const userData = await userModal.findById(userId).select("referralCode googleId");

    res.render("user/layout", {
        title: "My Wallet",
        body: "user/wallet/wallet",
        walletData: wallet,
        userData,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        currentPath: '/user/wallet',
        currentPage: parseInt(page),
        totalPages,
        payment: paginatedTransactions
    });
});

export const walletPayment = asyncHandler(async (req, res) => {
    const { address } = req.body;
    const userId = req.session.user._id;
    const cart = await CartModel.findOne({ user: userId }).populate({ path: "items.productId", populate: { path: "subCategory_id", model: "SubCategory" } });
    console.log("wallet user cart", cart);
    try {
        await validateStock(cart.items)
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message, redirect: "/user/cart" });
    }
    const wallet = await walletModel.findOne({ userId });
    const prices = await calculateOrderPrices(cart, req.session.appliedCoupon);

    if (!wallet) {
        return res.status(400).json({ success: false, message: "Wallet not found" });
    }

    for (const item of cart.items) {
        const variant = item.productId.variants.find(v => v.size === item.size && v.color === item.color);
        if (!variant || variant.stock < item.quantity) {
            return res.status(400).json({ success: false, message: `Stock unavailable for ${item.productId.name}` });
        }
    }
    if (wallet.balance < prices.finalTotal) {
        return res.status(400).json({ success: false, message: "Insufficient wallet balance" })
    }

    wallet.balance -= prices.finalTotal;
    wallet.transactions.push({
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: prices.finalTotal,
        type: "Debit",
        description: "Order Purchase",
        status: "Success",
        date: new Date(),
    })

    await wallet.save();

    const appliedCoupon = req.session.appliedCoupon || { discountValue: 0, _id: null };
    try {
        const savedOrder = await finalizeOrder({
            userId,
            cart,
            address,
            appliedCoupon,
            paymentMethod: "wallet",
            paymentStatus: "Paid",
            razorpayPaymentId: null
        });

        delete req.session.appliedCoupon;
        res.status(200).json({ success: true, message: "Order placed successfully", orderId: savedOrder._id });
    } catch (error) {
        wallet.balance += prices.finalTotal;
        wallet.transactions.push({
            transactionId: `REF-${Date.now()}`,
            amount: prices.finalTotal,
            type: "Credit",
            description: "Refund due to order failure",
            status: "Success"
        });
        await wallet.save();

        res.status(500).json({ success: false, message: "Order failed. Money refunded to wallet" });
    }
})

//add money to wallet 
export const addMoneyToWallet = asyncHandler(async (req, res) => {
    const { amount } = req.body;

    const options = {
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `wallet_rcg_${Date.now()}`
    };

    const razorpayOrder = await razorpay.orders.create(options);
    res.json({ success: true, razorpayOrder });
});


export const verifyWalletPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    const userId = req.session.user._id;

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const wallet = await walletModel.findOne({ userId });

    if (!wallet) {
        return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    wallet.balance += Number(amount);
    wallet.transactions.push({
        transactionId: razorpay_payment_id,
        amount: Number(amount),
        type: "Credit",
        description: "Wallet Recharge via Razorpay",
        status: "Success",
        date: new Date(),
    });

    await wallet.save();

    res.json({ success: true, message: "Amount added to wallet successfully", newBalance: wallet.balance });
});
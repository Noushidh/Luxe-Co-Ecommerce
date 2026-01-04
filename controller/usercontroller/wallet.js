import asyncHandler from "../../utils/asynHandler.js";
import userModal from "../../models/usermodel.js"
import walletModel from "../../models/walletmodel.js"
import CartModel from "../../models/cartmodel.js";
import { calculateOrderPrices, finalizeOrder } from "../../utils/orderHelper.js";

export const load_wallet = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;

    let wallet = await walletModel.findOne({ userId });

    if (!wallet) {
        wallet = await walletModel.create({ userId, balance: 0, transactions: [] });
    }

    const userData = await userModal.findById(userId).select("referralCode");

    res.render("user/layout", {
        title: "My Wallet",
        body: "user/wallet/wallet",
        walletData:wallet,
        userData,
        currentPath: '/user/wallet'
    });
});

export const walletPayment = asyncHandler(async (req, res) => {
    const { address } = req.body;
    const userId = req.session.user._id;
    const cart = await CartModel.findOne({ user: userId }).populate("items.productId")
    console.log("wallet user cart",cart)
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
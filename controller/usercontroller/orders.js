import asyncHandler from "../../utils/asynHandler.js";
import orderModel from "../../models/ordermodel.js"
import addressModel from "../../models/addressmodel.js";
import returnModel from "../../models/returnmodel.js"
import productModel from "../../models/productmodel.js";
import walletModel from "../../models/walletmodel.js"

export const load_orders = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const userId = req.session.user?._id;
    const totalOrdersCount = await orderModel.countDocuments({ userId });

    const orders = await orderModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalPages = Math.ceil(totalOrdersCount / limit);

    res.render("user/layout", {
        title: "My orders",
        body: "user/orders/my-order",
        currentPath: '/user/orders',
        orders,
        userData: req.session.user,
        currentPage: page,
        totalPages: totalPages,
        totalOrders: totalOrdersCount
    });
});

export const load_orders_Details = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    const order = await orderModel.findById(orderId).populate('items.productId');
    if (!order) {
        return res.redirect('/user/orders')
    }
    const shipping = order.shipping !== undefined ? order.shipping : (order.total > 500 ? 0 : 50); res.render("user/layout", {
        title: "Order Details",
        body: "user/orders/my-order-details",
        order,
        userData: req.session.user,
        currentPath: '/user/orders',
        shipping
    });
})

export const load_returnOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const productIdFromQuery = req.query.productId;
    const userId = req.session.user._id;
    
    if (!productIdFromQuery) {
        console.error("No Product ID provided in URL");
        return res.redirect('/user/orders');
    }
    const order = await orderModel.findOne({ _id: id, userId }).populate('items.productId');
    const addresses = await addressModel.find({ userId: userId });

    if (!order) return res.status(404).send("Order not found");

    const itemToReturn = order.items.find(item => {
        const idFromItem = item.productId?._id?.toString() ||
            item.productId?.toString() ||
            item.product_id?.toString();

        return idFromItem === productIdFromQuery;
    });

    if (!itemToReturn) {
        console.error("Item not found in order. Clicked ID:", productIdFromQuery);
        return res.redirect('/user/orders');
    }

    res.render("user/layout", {
        title: "Return Order",
        body: "user/orders/return-order",
        currentPath: '/user/orders',
        order: order,
        userData: req.session.user,
        item: itemToReturn, 
        addresses: addresses,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        item: itemToReturn,
        addresses: addresses
    });
});

export const returnOrder_details = asyncHandler(async (req, res) => {
    const { orderId, itemId, reason, refundMode, comments, addressId } = req.body;

    const order = await orderModel.findById(orderId);
    const itemToReturn = order.items.id(itemId);
    const address = await addressModel.findById(addressId);
    const fulladdress = `${address.name}, ${address.phone}, ${address.street}, ${address.city}, ${address.state}, ${address.pincode}`;

    const newReturn = new returnModel({
        order_items_id: orderId,
        user_id: req.session.user._id,
        product_id: itemToReturn.productId,
        reason: reason,
        refund_mode: refundMode,
        comments: comments,
        pickup_address: fulladdress,
        pickup_date: Date.now(),
        status: "Pending",
    });
    await newReturn.save();

    await orderModel.updateOne({ _id: orderId, "items._id": itemId },
        { $set: { "items.$.status": "Return Requested", "status": "Return Requested" } });

    return res.status(200).json({ success: true, message: "Return request submitted" });
});


export const cancel_individualItem = asyncHandler(async (req, res) => {
    const { orderId, itemId , reason} = req.body;
    
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found in order" });

    const restrictedStatus = ["Shipped", "Delivered", "Cancelled", "Return Requested", "Returned", "Rejected"];
    if (restrictedStatus.includes(item.status)) {
        return res.status(400).json({ success: false, message: "This item cannot be cancelled at the current stage." });
    }    

    const totalOriginalPrice = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const itemSubtotal = item.price * item.quantity;
    const refundAmount = Math.round((itemSubtotal / totalOriginalPrice) * order.total);

    
    await productModel.findOneAndUpdate(
        { _id: item.productId },
        { $inc: { "variants.$[elem].stock": item.quantity } },
        { arrayFilters: [{ "elem.size": item.size, "elem.color": item.color }] }
    );

    item.status = "Cancelled";
    item.cancelReason = reason;
    item.cancelledAt = new Date();

    if (order.paymentMethod !== 'cashOnDelivery' && order.paymentStatus === 'Paid') {
        await walletModel.findOneAndUpdate(
            { userId: order.userId },
            { 
                $inc: { balance: refundAmount },
                $push: { 
                    transactions: { 
                        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        amount: refundAmount, 
                        type: "Credit", 
                        description: `Partial cancellation of Order: ${order.orderId}`,
                        status: "Success",
                        date: new Date()
                    } 
                }
            },{ upsert: true, new: true } );
    }

    order.total -= refundAmount;

    const allCancelled = order.items.every(i => i.status === 'Cancelled');
    if (allCancelled) {
        order.status = 'Cancelled';
        if (order.paymentStatus === 'Paid') order.paymentStatus = 'Refunded';
    }
    await order.save();
    res.status(200).json({ success: true, message: `Item cancelled. ₹${refundAmount} has been credited to your wallet.`});
});
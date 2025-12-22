import asyncHandler from "../../utils/asynHandler.js";
import orderModel from "../../models/ordermodel.js"
import userModel from "../../models/usermodel.js"
import addressModel from "../../models/addressmodel.js";
import returnModel from "../../models/returnmodel.js"

export const load_orders = asyncHandler(async (req, res) => {

    const userId = req.session.user?._id;
    const orders = await orderModel.find({ userId }).sort({ createdAt: -1 });
    res.render("user/layout", {
        title: "My orders",
        body: "user/orders/my-order",
        currentPath: '/user/orders',
        orders,
        userData: req.session.user,

    })
})

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
    const userId = req.session.user._id;

    const order = await orderModel.findOne({ _id: id, userId }).populate('items.productId');
    const user = await userModel.findById(userId);
    const addresses = await addressModel.find({ userId: userId })

    if (!order) return res.status(404).send("Order not found");

    const itemToReturn = order.items[0];
    res.render("user/layout", {
        title: "Return Order",
        body: "user/orders/return-order",
        currentPath: '/user/orders',
        order: order,
        userData: user,
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
        { $set: { "items.$.status": "Return Requested","status": "Return Requested" } });

    return res.status(200).json({ success: true, message: "Return request submitted" });
});


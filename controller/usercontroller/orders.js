import asyncHandler from "../../utils/asynHandler.js";
import orderModel from "../../models/ordermodel.js"


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
       const shipping = order.shipping !== undefined ? order.shipping : (order.total > 500 ? 0 : 50);    res.render("user/layout", {
        title: "Order Details",
        body: "user/orders/my-order-details",
        order,
        userData: req.session.user,
        currentPath: '/user/orders',
        shipping
    });
})
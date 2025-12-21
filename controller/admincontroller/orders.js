import asyncHandler from "../../utils/asynHandler.js";
import orderModel from "../../models/ordermodel.js";
import productModel from "../../models/productmodel.js"

export const load_orders = asyncHandler(async (req, res) => {
    const { status, payment, sort } = req.query;

    let query = {};
    if (status) query.status = status;
    if (payment) query.paymentMethod = payment;

    const orders = await orderModel.find(query)
        .populate('userId')
        .sort({ createdAt: sort === 'oldest' ? 1 : -1 });

    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.render("admin/orders/partials/_ordersTableRows", { orders });
    }

    res.render("admin/layout", {
        title: "Orders Management",
        body: "orders/orders.ejs",
        orders
    });
});

export const load_orders_Details = asyncHandler(async (req, res) => {
    const { id } = req.params
    const order = await orderModel.findById(id).populate("userId").populate("items.productId")
    res.render("admin/layout", {
        title: "Order details",
        body: "orders/order-details.ejs",
        order
    })
})

export const cancelOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await orderModel.findById(id);

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
                await productModel.updateOne({ _id: item.productId, "variants._id": variant._id }, { $inc: { "variants.$.stock": item.quantity } })
            }
        }
    }

    order.status = "Cancelled";
    await order.save();

    res.status(200).json({ success: true, message: "Order cancelled and stock restored!" });
})

export const updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    console.log(id,status)
    const order = await orderModel.findById(id);
    order.status = status;
    await order.save();
    res.status(200).json({ success: true, message: "Order Status Updatd Successfully" })
})
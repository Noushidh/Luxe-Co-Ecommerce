import asyncHandler from "../../utils/asynHandler.js";
import orderModel from "../../models/ordermodel.js";
import productModel from "../../models/productmodel.js"
import returnModel from "../../models/returnmodel.js";
import walletModel from "../../models/walletmodel.js"

export const load_orders = asyncHandler(async (req, res) => {
    const { page = 1, search = "", status = "", payment = "", Date: dateSort = "" } = req.query;

    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;
    let query = {};
    if (search) {
        query.$or = [
            { orderId: { $regex: search, $options: "i" } },
            { status: { $regex: search, $options: "i" } },
            { paymentMethod: { $regex: search, $options: "i" } },
            { "address.name": { $regex: search, $options: "i" } }
        ];
    }
    if (status) {
        query.status = status;
    }
    if (payment) {
        query.paymentMethod = payment;
    }
    let sortQuery = { createdAt: -1 };
    if (dateSort === "oldest") {
        sortQuery = { createdAt: 1 };
    }

    const totalOrdersCount = await orderModel.countDocuments(query);
    const orders = await orderModel.find(query).populate('userId').sort(sortQuery).skip(skip).limit(limit);
    const totalPages = Math.ceil(totalOrdersCount / limit);

    res.render("admin/layout", {
        title: "Orders Management",
        body: "orders/orders.ejs",
        orders,
        status,
        payment,
        sortDate: dateSort,
        search,
        currentPage: parseInt(page),
        totalPages
    });
});

export const load_orders_Details = asyncHandler(async (req, res) => {
    const { id } = req.params
    const order = await orderModel.findById(id).populate("userId").populate("items.productId")
    const returnInfo = await returnModel.find({ order_items_id: id })
    res.render("admin/layout", {
        title: "Order details",
        body: "orders/order-details.ejs",
        order,
        returnInfo: returnInfo
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
    console.log(id, status)
    const order = await orderModel.findById(id);
    order.status = status;

    order.items.forEach(item => {
        item.status = status;
    });
    if (status === "Delivered") {
        order.deliveryDate = new Date();
        order.paymentStatus = "Paid";
    }
    await order.save();
    res.status(200).json({ success: true, message: "Order Status Updatd Successfully" })
})


export const approveReturn = asyncHandler(async (req, res) => {
    const { orderId, returnId } = req.body;

    const returnDoc = await returnModel.findById(returnId);
    if (!returnDoc) {
        return res.status(404).json({ success: false, message: "Return record not found" });
    }

    if (returnDoc.status !== 'Pending') {
        return res.status(400).json({ success: false, message: "This return request has already been processed." });
    }
    const order = await orderModel.findById(orderId);
    if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
    }

    const item = order.items.find(i => i.productId.toString() === returnDoc.product_id.toString());

    if (!item || item.status !== 'Return Requested') {
        return res.status(400).json({ success: false, message: "Item is not in a returnable state." });
    }

    const totalOriginalPrice = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const updatedOrder = await orderModel.findOneAndUpdate(
        { _id: orderId, "items.productId": returnDoc.product_id },
        { $set: { "items.$.status": "Returned" } },
        { new: true }
    );

    const returnedItem = updatedOrder.items.find(item => item.productId.toString() === returnDoc.product_id.toString());

    if (returnedItem) {
        const itemSubtotal = returnedItem.price * returnedItem.quantity;
        const refundAmount = Math.round((itemSubtotal / totalOriginalPrice) * order.total);

        await productModel.updateOne(
            { _id: returnedItem.productId, "variants.size": returnedItem.size, "variants.color": returnedItem.color },
            { $inc: { "variants.$.stock": returnedItem.quantity } }
        );

        await walletModel.findOneAndUpdate({ userId: updatedOrder.userId },
            {
                $inc: { balance: refundAmount },
                $push: {
                    transactions: {
                        transactionId: `REF-${returnId.toString().slice(-6)}`,
                        amount: refundAmount,
                        type: 'Credit',
                        description: `Refund for returned product: ${returnedItem.productName || 'Product'}`,
                        status: "Success",
                        date: new Date()
                    }
                }
            }, { upsert: true });

        updatedOrder.refundedAmount = (updatedOrder.refundedAmount || 0) + refundAmount;

        const allProcessed = updatedOrder.items.every(i => ["Returned", "Cancelled"].includes(i.status));
        if (allProcessed) {
            updatedOrder.status = "Returned";
        }

        await updatedOrder.save();
    }

    await returnModel.findByIdAndUpdate(returnId, { status: "Approved" });
    res.status(200).json({ success: true, message: "Return approved and wallet credited" });
});

export const rejectReturn = asyncHandler(async (req, res) => {
    console.log("REQUEST", req.body)
    const { orderId, returnId } = req.body;

    const returnDoc = await returnModel.findById(returnId);
    await orderModel.findOneAndUpdate(
        { _id: orderId, "items.productId": returnDoc.product_id },
        { $set: { "items.$.status": "Rejected", "status": "Rejected" } },
        { new: true }
    )
    return res.status(200).json({ success: true, message: "Return Rejected" })
})
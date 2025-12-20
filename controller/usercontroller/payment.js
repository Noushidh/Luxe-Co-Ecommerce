import productModel from "../../models/productmodel.js"
import addressModel from "../../models/addressmodel.js";
import CartModel from "../../models/cartmodel.js";
import OrderModel from "../../models/ordermodel.js";
import asyncHandler from "../../utils/asynHandler.js";
import mongoose from "mongoose";

export const load_payment = asyncHandler(async (req, res) => {
    const { addressId } = req.query;
    const userId = req.session.user?._id;
    const address = await addressModel.findOne({ _id: addressId, userId })
    if (!address) {
        return res.redirect('/user/cart')
    }
    const cart = await CartModel.findOne({ user: userId }).populate("items.productId")

    if (!cart || cart.items.length === 0) {
        return res.redirect('/user/cart');
    }

    const subTotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const discount = cart.discount || 0;
    const shipping = cart.shipping || 0;
    const total = subTotal - discount + shipping;
    res.render("user/layout", {
        title: "Payment",
        body: "/user/payment/payment",
        address,
        subTotal,
        discount,
        shipping,
        total
    })
})

export const cashOnDeliveryChecking = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;
    const cart = await CartModel.findOne({ user: userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    let totalAmount = 0;

    for (const item of cart.items) {
        const product = item.productId;

        if (product.isBlocked) {
            return res.status(400).json({ success: false, message: `${product.name} is Unavailable` })
        }

        const variant = product.variants.find(v => v.size === item.size && v.color === item.color);

        if (!variant || variant.stock < item.quantity) {
            return res.status(400).json({ success: false, message: `Stock unavailable for ${product.name} (${item.color} - Size ${item.size})` });
        }
        totalAmount += product.price * item.quantity;
    }

    const { address } = req.body;
    if (!address) {
        return res.status(400).json({ success: false, message: "Please select a shipping address" });
    }

    const currentYear = new Date().getFullYear();
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    const uniqueOrderId = `LUX-${currentYear}-${randomNumber}`;

    const newOrder = new OrderModel({
        orderId: uniqueOrderId,
        userId,
        items: cart.items.map(item => {
            const variant = item.productId.variants.find(v => v.size === item.size && v.color === item.color);
            return {
                productId: item.productId._id,
                productName: item.productId.name,
                image: (variant && variant.images && variant.images.length > 0) ? variant.images[0] : item.productId.image,
                price: item.productId.price,
                quantity: item.quantity,
                size: item.size,
                color: item.color
            };
        }),
        total: totalAmount,
        status: "Confirmed",
        paymentMethod: "cashOnDelivery",
        paymentStatus: "Pending",
        address: {
            name:address.name,
            street:address.street||address.addressLine,
            city:address.city,
            state: address.state,
            pincode: address.pincode,
            phone: address.phone  
        },
    });
    console.log(address)
    const saveOrder = await newOrder.save();

    for (const item of cart.items) {
        const variant = item.productId.variants.find(v => v.size === item.size && v.color === item.color);

        if (variant) {
            await productModel.updateOne(
                { _id: item.productId._id, "variants._id": variant._id },
                { $inc: { "variants.$.stock": -item.quantity } });
        }
    }
    await CartModel.deleteOne({ user: userId });

    res.status(201).json({ success: true, message: "Order placed successfully", orderId: saveOrder._id });
});



export const load_orderConfirmed = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.redirect('/user/home'); 
    }

    const order = await OrderModel.findById(id);

    if (!order) {
        return res.render("user/layout", {
            title: "Order Not Found",
            body: "user/pages/page-404",
            message: "Order details not found"
        });
    }

    const items = order.items || [];

    res.render("user/layout", {
        title: "Order Confirmed",
        body: "user/payment/order-confirmed",
        order,
        items,
        total: order.total || 0,
        subTotal: order.total || 0, 
        shipping: order.shipping || 0,
    });
});

// export const load_orderConfirmed = asyncHandler(async (req, res) => {
//     const { id } = req.params;
//     const order = await OrderModel.findById(id);

//     const cart = await CartModel.findOne(req.session.user._id);

//     if(!cart||cart.items.length===0){
//         return res.redirect('/user/cart');
//     }

//     const items = order.items || [];
//     const subTotal = items.reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 1)), 0);

//     res.render("user/layout", {
//         title: "Order Confirmed",
//         body: "user/payment/order-confirmed",
//         order,
//         items,
//         total: order.total || 0,
//         subTotal:subTotal,
//         shipping: order.shipping || 0,
//     });
// });




import productModel from "../../models/productmodel.js"
import addressModel from "../../models/addressmodel.js";
import CartModel from "../../models/cartmodel.js";
import OrderModel from "../../models/ordermodel.js";
import asyncHandler from "../../utils/asynHandler.js";
import mongoose from "mongoose";
import { getBestOfferForProduct } from "../../utils/offerHelper.js";

export const load_payment = asyncHandler(async (req, res) => {
    const { addressId } = req.query;
    const userId = req.session.user?._id;

    const address = await addressModel.findOne({ _id: addressId, userId });
    if (!address) {
        return res.redirect('/user/cart');
    }

    const cart = await CartModel.findOne({ user: userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
        return res.redirect('/user/cart');
    }

    let grossSubTotal = 0; 
    let totalOfferDiscount = 0; 

    await Promise.all(cart.items.map(async (item) => {
        const product = item.productId;
        const { finalPrice } = await getBestOfferForProduct(product);
        
        const itemOriginalTotal = product.price * item.quantity;
        const itemOfferTotal = finalPrice * item.quantity;

        grossSubTotal += itemOriginalTotal;
        totalOfferDiscount += (itemOriginalTotal - itemOfferTotal);
    }));

    const appliedCoupon = req.session.appliedCoupon || { discountValue: 0 };
    const couponDiscount = appliedCoupon.discountValue;

    const totalSavings = totalOfferDiscount + couponDiscount;
    const payableAfterOffers = grossSubTotal - totalOfferDiscount;
    
    const shipping = payableAfterOffers > 500 ? 0 : 50; 
    const finalTotal = (payableAfterOffers - couponDiscount) + shipping;

    res.render("user/layout", {
        title: "Payment",
        body: "user/payment/payment", 
        address,
        subTotal: grossSubTotal,         
        discount: totalSavings,         
        shipping: shipping,
        total: finalTotal              
    });
});


export const cashOnDeliveryChecking = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;
    const cart = await CartModel.findOne({ user: userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    let grossSubTotal = 0;   
    let payableAfterOffers = 0; 

    for (const item of cart.items) {
        const product = item.productId;

        if (product.isBlocked) {
            return res.status(400).json({ success: false, message: `${product.name} is Unavailable` });
        }

        const variant = product.variants.find(v => v.size === item.size && v.color === item.color);
        if (!variant || variant.stock < item.quantity) {
            return res.status(400).json({ success: false, message: `Stock unavailable for ${product.name}` });
        }

        const { finalPrice } = await getBestOfferForProduct(product);
        
        grossSubTotal += product.price * item.quantity; 
        payableAfterOffers += finalPrice * item.quantity;
    }

    const { address } = req.body;
    if (!address) {
        return res.status(400).json({ success: false, message: "Please select a shipping address" });
    }

    const appliedCoupon = req.session.appliedCoupon || { discountValue: 0, _id: null };
    const couponSavings = appliedCoupon.discountValue;
    const productSavings = grossSubTotal - payableAfterOffers; 

    const shipping = payableAfterOffers > 500 ? 0 : 50; 
    
    const finalOrderTotal = (payableAfterOffers - couponSavings) + shipping;

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
                price: item.price, 
                quantity: item.quantity,
                size: item.size,
                color: item.color
            };
        }),
        total: finalOrderTotal,   
        shipping: shipping,
        discount: productSavings + couponSavings, 
        couponId: appliedCoupon._id,
        status: "Confirmed",
        paymentMethod: "cashOnDelivery",
        paymentStatus: "Pending",
        address: {
            name: address.name,
            street: address.street || address.addressLine,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            phone: address.phone  
        },
    });

    const saveOrder = await newOrder.save();

    for (const item of cart.items) {
        await productModel.updateOne(
            { _id: item.productId._id, "variants.size": item.size, "variants.color": item.color },
            { $inc: { "variants.$.stock": -item.quantity } }
        );
    }
    
    delete req.session.appliedCoupon; 
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
    const displaySubtotal = (order.total || 0) + (order.discount || 0) - (order.shipping || 0);
    res.render("user/layout", {
        title: "Order Confirmed",
        body: "user/payment/order-confirmed",
        order,
        items,
        total: order.total || 0,
        subTotal: displaySubtotal, 
        discount: order.discount || 0,
        shipping: order.shipping || 0,
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
            }}}

    order.status = "Cancelled";
    await order.save();

    res.status(200).json({ success: true, message: "Order cancelled and stock restored!" });
});




import CartModel from "../models/cartmodel.js";
import OrderModel from "../models/ordermodel.js";
import ProductModel from "../models/productmodel.js";
import CouponModel from "../models/couponmodel.js";
import { getBestOfferForProduct } from "../utils/offerHelper.js";


export const calculateOrderPrices = async (cart, appliedCoupon = { discountValue: 0 }) => {
    const itemResults = await Promise.all(cart.items.map(async (item) => {
        const product = item.productId;
        const { finalPrice } = await getBestOfferForProduct(product);
        const itemOriginalTotal = product.price * item.quantity;
        const itemOfferTotal = finalPrice * item.quantity;

        return {
            original: itemOriginalTotal,
            discount: (itemOriginalTotal - itemOfferTotal),
            finalPrice 
        };
    }));

    let grossSubTotal = 0;
    let totalOfferDiscount = 0;

    itemResults.forEach(res => {
        grossSubTotal += res.original;
        totalOfferDiscount += res.discount;
    });

    const payableAfterOffers = grossSubTotal - totalOfferDiscount;
    const couponDiscount = appliedCoupon ? appliedCoupon.discountValue : 0;
    const shipping = payableAfterOffers > 500 ? 0 : 50;
    const finalTotal = (payableAfterOffers - couponDiscount) + shipping;

    return {
        grossSubTotal,
        totalSavings: totalOfferDiscount + couponDiscount,
        shipping,
        finalTotal,
        itemResults 
    };
};

export const finalizeOrder = async ({ userId, cart, address, appliedCoupon, paymentMethod, paymentStatus,razorpayPaymentId }) => {
    const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const shipping = subtotal > 500 ? 0 : 50;
    const finalTotal = (subtotal - appliedCoupon.discountValue) + shipping;

    const currentYear = new Date().getFullYear();
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    const uniqueOrderId = `LUX-${currentYear}-${randomNumber}`;

    const newOrder = new OrderModel({
        orderId: uniqueOrderId,
        userId,
        items: cart.items.map(item => ({
            productId: item.productId._id,
            productName: item.productId.name,
            image: item.productId.images?.[0] || item.productId.image,
            price: item.price,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            status: "Placed"
        })),
        total: finalTotal,
        shipping,
        discount: appliedCoupon.discountValue,
        couponId: appliedCoupon._id,
        status: "Confirmed",
        paymentMethod,
        paymentStatus,
        razorpayPaymentId,
        address: {
            name: address.name,
            street: address.street || address.addressLine,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            phone: address.phone
        },
    });

    const savedOrder = await newOrder.save();

for (const item of cart.items) {
            await ProductModel.updateOne(
            { _id: item.productId._id, "variants.size": item.size, "variants.color": item.color },
            { $inc: { "variants.$.stock": -item.quantity } }
        );
    }

    if (appliedCoupon?._id) {
        await CouponModel.findByIdAndUpdate(appliedCoupon._id, {
            $addToSet: { usersUsed: userId } 
        });
    }

    await CartModel.deleteOne({ user: userId });
    
    return savedOrder;
};
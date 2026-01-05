import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: String,
        image: String,
        price: Number,
        quantity: Number,
        size: String,
        color: String,
        status: { 
            type: String, 
            enum: ["Placed", "Delivered", "Cancelled", "Return Requested", "Returned","Rejected"],
            default: "Placed"
        }
    }],
    total: {
        type: Number,
        required: true
    },
    discount: { type: Number,default: 0},
    offerDiscount: { type: Number, default: 0 },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    status: {
        type: String,
        enum: ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled","Return Requested","Returned","Rejected"],
        default: "Pending"
    },
    paymentMethod: {
        type: String,
        enum: ["cashOnDelivery", "wallet", "razorpay"],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed", "Refunded"],
        default: "Pending"
    },
    razorpayPaymentId: { type: String },
    shipping: {
        type: Number,
        default: 0
    },
    address: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true }
    },
    couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null
    },
    deliveryDate: {
        type: Date
    }
}, {
    timestamps: true
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;



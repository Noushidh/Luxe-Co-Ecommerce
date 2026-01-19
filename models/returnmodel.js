import mongoose from 'mongoose';
const returnSchema = new mongoose.Schema({
    order_items_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order', 
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    return_type: {
        type: String,
        default: 'refund'
    },
    reason: {
        type: String,
        required: true
    },
    comments: {
        type: String,
        default: ""
    },
    pickup_address: {
        type: String, 
        required: true
    },
    pickup_date: {
        type: Date
    },
    refund_mode: {
        type: String,
        enum: ['Wallet', 'Bank'],
        default: 'Wallet'
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected", "Refunded"],
        default: "Pending" 
    }
}, { timestamps: true });

const Return = mongoose.model('Return', returnSchema);

export default Return;
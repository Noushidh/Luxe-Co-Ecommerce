
import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    usersUsed: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    discountType: { type: String, enum: ['percentage', 'fixedAmount'], default: 'fixedAmount' },
    discountValue: { type: Number, required: true },
    maxDiscountAmount: { type: Number }, 
    minPurchase: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true },
    startDate: { type: Date, default: Date.now },
    limit: { type: Number, default: null }, 
    maxUsagePerUser: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    usersUsed: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String },
    discountType: { type: String, enum: ['percentage', 'fixedAmount'], default: 'fixedAmount' },
    discountValue: { type: Number, required: true },
    maxDiscountAmount: { type: Number }, 
    minPurchase: { type: Number, default: 0 },
    expiryDate: { type: Date, required: true },
    startDate: { type: Date, default: Date.now },
    limit: { type: Number, default: null }, 
    usageCount: { type: Number, default: 0 },
    maxUsagePerUser: { type: Number, default: 1 },
    appliesTo: { type: String, enum: ['all', 'product', 'category'], default: 'all'},
    categoryScope: { type: String, enum: ['men', 'women', 'kids', 'none'], default: 'none' },
    targetId: { type: String, default: 'all'},
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
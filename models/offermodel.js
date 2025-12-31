import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
    offerTitle: { type: String, required: true, trim: true },
    appliesTo: { type: String, enum: ['all', 'product', 'category'], default: 'all' },
    categoryScope: { type: String, enum: ["Men", "Women", "Kids", "none"], default: 'none' },
    targetId: { type: String, default: 'all' },
    discountType: { type: String, enum: ['percentage'], default: 'percentage' },
    discountValue: { type: Number, required: true, min: 1, max: 100 },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', default: null },
    isActive: { type: Boolean, default: true }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const Offer = mongoose.model('Offer', offerSchema);
export default Offer;
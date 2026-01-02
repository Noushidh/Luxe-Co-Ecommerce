import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0 
    },
    transactions: [{
        amount: { type: Number, required: true },
        type: { 
            type: String, 
            enum: ['credit', 'debit'], 
            required: true 
        },
        description: { type: String }, 
        orderId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Order',
            default: null 
        },
        transactionId: { 
            type: String, 
            default: () => `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}` 
        },
        status: {
            type: String,
            enum: ['Success', 'Pending', 'Failed'],
            default: 'Success'
        },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);
export default Wallet;
import asyncHandler from "../../utils/asynHandler.js";
import userModal from "../../models/usermodel.js"
import walletModel from "../../models/walletmodel.js"

export const load_wallet = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;

    let wallet = await walletModel.findOne({ userId });

    if (!wallet) {
        wallet = await walletModel.create({ 
            userId, 
            balance: 0, 
            transactions: [] 
        });
    }

    // 2. Also get userData for the referral code
    const userData = await userModal.findById(userId).select("referralCode");

    // 3. Render and PASS the variables
    res.render("user/layout", {
        title: "My Wallet",
        body: "user/wallet/wallet", // Path to your wallet EJS
        walletData: wallet,          // This fixes the 'undefined' error
        userData,
        currentPath: '/user/wallet'
    });
});
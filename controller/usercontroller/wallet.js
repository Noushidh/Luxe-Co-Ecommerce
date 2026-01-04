import asyncHandler from "../../utils/asynHandler.js";
import userModal from "../../models/usermodel.js"
import walletModel from "../../models/walletmodel.js"

export const load_wallet = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;

    let wallet = await walletModel.findOne({ userId });

    if (!wallet) {
        wallet = await walletModel.create({ userId, balance: 0, transactions: [] });
    }

    const userData = await userModal.findById(userId).select("referralCode");

    res.render("user/layout", {
        title: "My Wallet",
        body: "user/wallet/wallet", 
        walletData: wallet,         
        userData,
        currentPath: '/user/wallet'
    });
});

export const walletPayment = asyncHandler(async(req,res)=>{
    const {address}=req.body;
    console.log(address)
    const userId = req.session.userId;

})
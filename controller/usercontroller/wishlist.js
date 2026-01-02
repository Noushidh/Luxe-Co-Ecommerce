import asyncHandler from "../../utils/asynHandler.js";
import ProductModel from "../../models/productmodel.js";
import wishlistModel from "../../models/wishlistmodel.js";
import CartModel from "../../models/cartmodel.js";


export const product_add_wishlist = asyncHandler(async(req,res)=>{
    const {variantId,productId}=req.body
    console.log("variantId",variantId,"productId",productId)
    const userId  = req.session.user._id;
    let wishlist = await wishlistModel.findOne({userId});
    if(!wishlist){
       wishlist = new wishlistModel({userId,items:[]})
    }
     const isAlreadyPresent = wishlist.items.some((item) => item.variantId.toString() === variantId);
    if(isAlreadyPresent){
        return res.status(400).json({ success: false, message: "Already in wishlist" });
    }

    wishlist.items.push({ productId, variantId });
    await wishlist.save();

    return res.status(200).json({ success: true, message: "Added to wishlist"});
});

export const load_wishlist = asyncHandler(async(req,res)=>{
    const userId = req.session.user._id;
    const userWishlist = await wishlistModel.findOne({userId}).populate("items.productId");
    res.render("user/layout",{
        title:"Wislist",
        body:"user/wishlist/wishlist",
        userData:userId,
        wishlist: userWishlist ? userWishlist.items : [],
    })
})
import asyncHandler from "../../utils/asynHandler.js";
import ProductModel from "../../models/productmodel.js";

export const load_wishlist = asyncHandler(async(req,res)=>{
    const userId = req.session.user._id;
    const products = await ProductModel.find({userId:userId}).populate("subCategory_id")
    res.render("user/layout",{
        title:"Wislist",
        body:"user/wishlist/wishlist",
        userData:userId,
        products:products
    })
})
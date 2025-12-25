import asyncHandler from "../../utils/asynHandler.js";
import couponModel from "../../models/couponmodel.js"
import SubCategory from "../../models/subcategory.js";

//single product
//Applies to all products in a category
//Applies to total cart value =>
// Coupon: SAVE500 || Condition: Cart ≥ ₹3000  ||Discount: ₹500
//Only certain users can use it=>only first users
//No code needed – applied automatically=>“10% OFF on orders above ₹5000”
//
export const load_coupons = asyncHandler(async(req,res)=>{

    const coupons = await couponModel.find({}).sort({createdAt:-1})
    res.render("admin/layout",{
        title:"Coupons",
        body:"coupon/coupons",
        coupons
    })
})

export const load_couponAddEdit = asyncHandler(async(req,res)=>{
  const subcategories = await SubCategory.find({ isBlocked: false })
    res.render("admin/layout",{
        title:"Add",
        body:"coupon/couponAddEdit",
        product:null,subcategories
    })
})

export const addCoupen = asyncHandler(async(req,res)=>{
    console.log(req.body)
    const { name, code, discountType, discountValue, maxDiscountAmount, appliesTo, targetId, minPurchase, limit, startDate, expiryDate, isActive } = req.body;
    res.json({success:true})
})
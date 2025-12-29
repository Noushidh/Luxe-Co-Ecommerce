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
export const load_coupons = asyncHandler(async (req, res) => {

    const coupons = await couponModel.find({}).sort({ createdAt: -1 })
    res.render("admin/layout", {
        title: "Coupons",
        body: "coupon/coupons",
        coupons
    })
})


export const load_couponAdd = asyncHandler(async (req, res) => {
    const subcategories = await SubCategory.find({ isBlocked: false })
    res.render("admin/layout", {
        title: "Add",
        body: "coupon/couponAddEdit",
        product: null, subcategories
    })
})

export const addCoupen = asyncHandler(async (req, res) => {
    const { name, code, discountType, discountValue, maxDiscountAmount,
        minPurchase, expiryDate, startDate, limit, isActive
    } = req.body;
    if (!name || !code || !discountValue || !expiryDate) {
        return res.status(400).json({ success: false, message: "Mandatory fields are missing" });
    }
    if (Number(discountValue) <= 0 || Number(maxDiscountAmount) < 0 || Number(minPurchase) < 0 || Number(limit) < 0) {
        return res.status(400).json({ success: false, message: "Numbers must be greater than or equal to 0" })
    }

    const stDate = new Date(startDate || Date.now());
    const eDate = new Date(expiryDate)
    if (eDate <= stDate) {
       return res.status(400).json({ success: false, message: "Expiry date must be after start date" })
    }

    if (discountType === "percentage") {
        const val = Number(discountValue);
        if (val <= 0 || val > 100) {
            return res.status(400).json({ success: false, message: "Percentage must be between 1% and 100%" });
        }
    }
        let cleanCode = code.toUpperCase().trim();

    let existingCoupen = await couponModel.findOne({ code: cleanCode});
    if (existingCoupen) {
        return res.status(400).json({ success: false, message: "Coupon code already exists!" });
    }
    const newCoupon = new couponModel({
        name,
        code: cleanCode,
        discountType,
        discountValue,
        maxDiscountAmount: maxDiscountAmount || 0,
        minPurchase: minPurchase || 0,
        expiryDate,
        startDate: startDate || Date.now(),
        limit: limit || null,
        isActive:isActive === 'on'|| isActive === true || isActive === 'true'
    });
    console.log(newCoupon)
    await newCoupon.save();
   return res.status(200).json({ success: true, message: "Coupon created successfully" });
})


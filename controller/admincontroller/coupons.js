import asyncHandler from "../../utils/asynHandler.js";
import couponModel from "../../models/couponmodel.js"

export const load_coupons = asyncHandler(async (req, res) => {
    const { search, status, page = 1 } = req.query;
    const limit = 10;
    const skip = (parseInt(page) - 1) * limit;
    let filter = {};
    const now = new Date();

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } }
        ];
    }

    if (status === 'active') {
        filter.isActive = true;
        filter.expiryDate = { $gte: now }; 
    } else if (status === 'blocked') {
        filter.isActive = false;
    } else if (status === 'expired') {
        filter.expiryDate = { $lt: now };
    }

    const totalCoupons = await couponModel.countDocuments(filter);
    const totalPages = Math.ceil(totalCoupons / limit);

    const coupons = await couponModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const queryParams = new URLSearchParams(req.query);
    queryParams.delete('page'); 
    const qs = queryParams.toString();

    res.render("admin/layout", {
        title: "Coupons",
        body: "coupon/coupons",
        coupons: coupons || [],
        currentPage: parseInt(page),
        totalPages,
        qs, 
        search: search || '',
        status: status || 'all'
    });
});


export const load_couponAdd = asyncHandler(async (req, res) => {
    res.render("admin/layout", {
        title: "Add coupen",
        body: "coupon/couponAddEdit",
        coupon: null
    })
})

export const load_couponEdit = asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log(id)
    const coupon = await couponModel.findById(id);
    if (!coupon) {
        return res.redirect("/admin/coupons");
    }
    res.render("admin/layout", {
        title: "Edit Coupon",
        body: "coupon/couponAddEdit",
        coupon: coupon
    });
});

export const saveCoupon = asyncHandler(async (req, res) => {
    const { id } = req.params; 
    const { 
        name, code, discountType, discountValue, maxDiscountAmount,
        minPurchase, expiryDate, startDate, limit, isActive 
    } = req.body;

    if (!name || !code || !discountValue || !expiryDate) {
        return res.status(400).json({ success: false, message: "Mandatory fields are missing" });
    }

    if (Number(discountValue) <= 0 || Number(maxDiscountAmount) < 0 || Number(minPurchase) < 0 || (limit !== null && Number(limit) < 0)) {
        return res.status(400).json({ success: false, message: "Numbers must be greater than or equal to 0" });
    }

    const stDate = new Date(startDate || Date.now());
    const eDate = new Date(expiryDate);
    if (eDate <= stDate) {
        return res.status(400).json({ success: false, message: "Expiry date must be after start date" });
    }

    let cleanCode = code.toUpperCase().trim();

    const query = { code: cleanCode };
    if (id) query._id = { $ne: id }; 

    const existingCoupon = await couponModel.findOne(query);
    if (existingCoupon) {
        return res.status(400).json({ success: false, message: "Coupon code already exists!" });
    }

    const couponData = {
        name,
        code: cleanCode,
        discountType,
        discountValue,
        maxDiscountAmount: maxDiscountAmount || 0,
        minPurchase: minPurchase || 0,
        expiryDate,
        startDate: startDate || Date.now(),
        limit: limit || null,
        isActive: isActive === 'on' || isActive === true || isActive === 'true'
    };

    if (id) {
        const updated = await couponModel.findByIdAndUpdate(id, couponData, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: "Coupon not found" });
        return res.status(200).json({ success: true, message: "Coupon updated successfully" });
    } else {
        const newCoupon = new couponModel(couponData);
        await newCoupon.save();
        return res.status(200).json({ success: true, message: "Coupon created successfully" });
    }
});

export const deleteCoupen = asyncHandler(async(req,res)=>{
    const {id}=req.params;

    console.log(req.params.id)

    const coupon = await couponModel.findByIdAndDelete(id);

    if(!coupon){
       return res.status(404).json({success:false,message:"Coupon not found"})
    }

    res.status(200).json({success:true,message:"Coupen deleted Successfully"})
})
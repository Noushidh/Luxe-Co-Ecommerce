import asyncHandler from "../../utils/asynHandler.js";
import SubCategory from "../../models/subcategory.js";
import ProductModel from "../../models/productmodel.js"
import offerModal from "../../models/offermodel.js"
import mongoose from "mongoose";

export const load_offer = asyncHandler(async (req, res) => {
    const offersList = await offerModal.find().populate('productId','name').populate('categoryId','subcategory').sort({ createdAt: -1 });
    res.render("admin/layout", {
        title: "Offers",
        body: "offer/offers",
        offers: offersList || []
    })
})

export const load_addOffer = asyncHandler(async (req, res) => {
    const subcategories = await SubCategory.find({ isBlocked: false })
    res.render("admin/layout", {
        title: "Add Offers",
        body: "offer/offerAddEdit",
        subcategories: subcategories,
        offer: null
    })
})

export const load_editOffer = asyncHandler(async (req, res) => {
    const {id}=req.params
    const subcategories = await SubCategory.find({ isBlocked: false })
    const offer = await offerModal.findById(id)
      if (!offer) {
        return res.redirect("/admin/offers");
    }
    res.render("admin/layout", {
        title: "Edit Offers",
        body: "offer/offerAddEdit",
        subcategories: subcategories,
        offer: offer
    })
})


export const searchSpecificProduct = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const products = await ProductModel.find({
        name: { $regex: `^${q}`, $options: "i" }
    }).limit(5)
    res.json({ products })
});

export const addOrUpdateOffer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const { 
        offerTitle, discountValue, appliesTo,
        targetId, startDate, expiryDate, categoryScope, isActive 
    } = req.body;

    const value = Number(discountValue);

    if (isNaN(value) || value <= 0 || value > 100) {
        return res.status(400).json({ 
            success: false, 
            message: "Discount Percentage must be between 1 and 100" 
        });
    }

    if (new Date(expiryDate) <= new Date(startDate)) {
        return res.status(400).json({ 
            success: false, 
            message: "Expiry date must be after start date" 
        });
    }

    const offerData = {
        offerTitle,
        discountType: "percentage", 
        discountValue: value,
        appliesTo,
        categoryScope: appliesTo === 'category' ? categoryScope : 'none',
        targetId,
        startDate: new Date(startDate),
        expiryDate: new Date(expiryDate),
        isActive: String(isActive) === 'true',
        productId: null,
        categoryId: null
    };

    if (mongoose.Types.ObjectId.isValid(targetId)) {
        if (appliesTo === 'product') {
            offerData.productId = targetId;
        } else if (appliesTo === 'category') {
            offerData.categoryId = targetId;
        }
    }

    if (id) {
        const updated = await offerModal.findByIdAndUpdate(id, offerData, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }
        return res.status(200).json({ success: true, message: "Offer updated successfully" });
    } else {
        const newOffer = new offerModal(offerData);
        await newOffer.save();
        return res.status(200).json({ success: true, message: "Offer created successfully" });
    }
});

export const deleteOffer =  asyncHandler(async(req,res)=>{
    const {id}=req.params;

    console.log(req.params.id)

    const offer = await offerModal.findByIdAndDelete(id);

    if(!offer){
       return res.status(404).json({success:false,message:"Offer not found"})
    }

    res.status(200).json({success:true,message:"Offer deleted Successfully"})
})
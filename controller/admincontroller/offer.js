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

export const addOffer = asyncHandler(async (req, res) => {
    const { offerTitle, discountType, discountValue, appliesTo,
        targetId, startDate, expiryDate, categoryScope, isActive } = req.body;

    const value = Number(discountValue);
    if (value < 0) {
        return res.status(400).json({ success: false, message: "Numbers must be greater than or equal to 0" });
    }

    if (discountType === "percentage" && (value <= 0 || value > 100)) {
        return res.status(400).json({ success: false, message: "Percentage must be between 1 and 100" });
    }

    if (new Date(expiryDate) <= new Date(startDate)) {
        return res.status(400).json({ success: false, message: "Expiry date must be after start date" });
    }

    const offerData = {
        offerTitle,
        discountType,
        discountValue: value,
        appliesTo,
        categoryScope: appliesTo === 'category' ? categoryScope : 'none',
        targetId,
        startDate: new Date(startDate),
        expiryDate: new Date(expiryDate),
        isActive
    };

const isVaidId = mongoose.Types.ObjectId.isValid(targetId);

    if (isVaidId) {
        if (appliesTo === 'product') {
            offerData.productId = targetId;
        } else if (appliesTo === 'category') {
            offerData.categoryId = targetId;
        }
    }

    const newOffer = new offerModal(offerData);
    await newOffer.save();

    console.log("Offer Saved successfully",newOffer);
    res.status(200).json({ success: true, message: "Offer added Successfully" });
});
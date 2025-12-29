import asyncHandler from "../../utils/asynHandler.js";
import SubCategory from "../../models/subcategory.js";
import ProductModel from "../../models/productmodel.js"
import Offer from "../../models/offermodel.js"

export const load_offer = asyncHandler(async(req,res)=>{
    const offersList = await Offer.find().sort({ createdAt: -1 });
    res.render("admin/layout",{
        title:"Offers",
        body:"offer/offers",
        offers:offersList||[]
    })
})

export const load_addOffer = asyncHandler(async(req,res)=>{
    const subcategories = await SubCategory.find({isBlocked:false})
        res.render("admin/layout",{
        title:"Add Offers",
        body:"offer/offerAddEdit",
        subcategories:subcategories,
        offer:null
    })
})

export const searchSpecificProduct = asyncHandler(async(req,res)=>{
   const {q}=req.query;
   const products = await ProductModel.find({
    name:{$regex:`^${q}`,$options:"i"}
   }).limit(5)
   res.json({products})
});
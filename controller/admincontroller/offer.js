import asyncHandler from "../../utils/asynHandler.js";
import Offer from "../../models/offermodel.js"

export const load_offer = asyncHandler(async(req,res)=>{
    const offersList = await Offer.find().sort({ createdAt: -1 });
    res.render("admin/layout",{
        title:"Offers",
        body:"offer/offers",
        offers:offersList||[]
    })
})
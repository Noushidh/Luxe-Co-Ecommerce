import asyncHandler from "../../utils/asynHandler.js";
import orderModel from "../../models/ordermodel.js";

export const load_Download_invoice = asyncHandler(async(req,res)=>{
    const {id}=req.params;
    const userId = req.session.user._id;
    const order = await orderModel.findOne({_id:id,userId})
   res.render("user/layout",{
    title:"Download Invoice",
    body:"user/orders/download-invoice",
    order,
    userData:req.session.user
   })
})
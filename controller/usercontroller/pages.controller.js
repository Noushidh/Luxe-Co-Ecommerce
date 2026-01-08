import ProductModel from "../../models/productmodel.js";
import asyncHandler from "../../utils/asynHandler.js";
import { getReadyProductFilter } from "../../utils/productVisibility.js"; 

export const LandingOrHome_load = (req, res) => {
  res.render("user/layout", {
    title: req.session.user ? "Home" : "Welcome",
    body: "user/pages/home"
  });
};

export const AboutPage_load = (req,res)=>{

   res.render("user/layout",{
     title:"About",
     body:"user/pages/about",
   });
}

export const ShopPage_load = asyncHandler(async(req,res)=>{
   
    const filter =getReadyProductFilter();
    const products = await ProductModel.find(filter).sort({createdAt: -1}) .limit(12);

    res.render("user/layout",{
     title:"Shop",
     body:"user/pages/shop",
     products: products 
    });
});

export const ContactPage_load = (req,res)=>{
   res.render("user/layout",{
     title:"Contact",
     body:"user/pages/contact"
   });
}

export const page_404 = (req, res) => {
    res.render("user/layout", {
        title: "Page Not Found",
        body: "user/pages/page-404"
    });
}
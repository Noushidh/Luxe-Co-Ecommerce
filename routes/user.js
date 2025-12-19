
import express from "express";
import passport from "passport";
const router = express.Router();
import * as userAuth from "../middleware/userAuth.js"
import * as usercontroller from "../controller/usercontroller/user.auth.js";
import * as PageController from "../controller/usercontroller/pages.controller.js";
import * as Collections  from "../controller/usercontroller/collections.js"
import * as Profile from "../controller/usercontroller/profile.js"
import * as Cart from "../controller/usercontroller/cart.js"

import { upload } from "../config/multer.js";

router
.route('/login')
.get(userAuth.isLoggin,usercontroller.loadlogin)
.post(usercontroller.login)

router
.route('/register')
.get(userAuth.isLoggin,usercontroller.loadregister)
.post(usercontroller.register)

router
.route('/forgot-password')
.get(userAuth.isLoggin,usercontroller.load_Forgot_Password)
.post(usercontroller.fogotPassword)

router
.route('/otp')
.get(userAuth.isLoggin,usercontroller.load_otp)
.post(usercontroller.Verifyotp)
router.post('/resend-otp',usercontroller.resendOTP)

router
.route('/reset-password')
.get(userAuth.isLoggin,usercontroller.load_reset_password)
.post(usercontroller.reset_Password)

router.get("/google",passport.authenticate("google",{scope:["profile","email"]}))
router.get("/google/callback",passport.authenticate("google", { failureRedirect: "/user/login" }),(req, res) => {
    req.session.user = req.user; 
    return res.redirect("/user");
  }
);


//mens,womens,kids
router.get('/products',userAuth.isBlocked,Collections.loadFiltersPage)
router.get('/productDetails/:id',userAuth.isBlocked,Collections.ProductDetails)

router.get('/',userAuth.isBlocked,PageController.LandingOrHome_load);
router.get('/about',PageController.AboutPage_load)
router.get('/shop',userAuth.isAuthenticated,userAuth.isBlocked,PageController.ShopPage_load)
router.get('/contact',PageController.ContactPage_load)

router.get('/page-404',PageController.page_404)


router.get('/logout',userAuth.isAuthenticated,usercontroller.isLogout);

router.get('/profile',userAuth.isAuthenticated,userAuth.isBlocked,Profile.load_profile)
router.get('/profile/edit',userAuth.isAuthenticated,userAuth.isBlocked,Profile.load_editProfile)
router.patch('/profile/edit',userAuth.isAuthenticated,upload.single("avatar"),Profile.editProfile)
router.patch('/profile/change-password',userAuth.isAuthenticated,userAuth.isBlocked,Profile.changePassword)
router.patch('/change-email/send-link',userAuth.isAuthenticated,Profile.sendChangeEmailLink)
router.get('/change-email/verify',userAuth.isAuthenticated,Profile.verifyChangeEmail)

//cart
router.get('/cart',Cart.load_cart)
router.post('/cart/product/add',Cart.addtocart)
router.patch('/cart/update-quantity',userAuth.isAuthenticated,Cart.updateCartquantity)
router.delete('/cart/remove-item/:variantId',userAuth.isAuthenticated,Cart.deletCart)

export default router;

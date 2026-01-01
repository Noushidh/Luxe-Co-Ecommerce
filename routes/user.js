
import express from "express";
import passport from "passport";
const router = express.Router();
import * as userAuth from "../middleware/userAuth.js"
import * as usercontroller from "../controller/usercontroller/user.auth.js";
import * as PageController from "../controller/usercontroller/pages.controller.js";
import * as Collections  from "../controller/usercontroller/collections.js"
import * as Profile from "../controller/usercontroller/profile.js"
import * as Address from "../controller/usercontroller/address.js"
import * as Cart from "../controller/usercontroller/cart.js"
import * as Checkout from "../controller/usercontroller/checkout.js"
import * as Payment from "../controller/usercontroller/payment.js"
import * as Orders from "../controller/usercontroller/orders.js";
import * as Invoice from "../controller/usercontroller/invoice.js"
import * as Wishlist from "../controller/usercontroller/wishlist.js"
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

router.get('/profile',userAuth.isAuthenticated,userAuth.isBlocked,Profile.load_profile)
router.get('/profile/edit',userAuth.isAuthenticated,userAuth.isBlocked,Profile.load_editProfile)
router.patch('/profile/edit',userAuth.isAuthenticated,upload.single("avatar"),Profile.editProfile)
router.patch('/profile/change-password',userAuth.isAuthenticated,userAuth.isBlocked,Profile.changePassword)
router.patch('/change-email/send-link',userAuth.isAuthenticated,Profile.sendChangeEmailLink)
router.get('/change-email/verify',userAuth.isAuthenticated,Profile.verifyChangeEmail)

//address
router.get('/address',userAuth.isAuthenticated,Address.load_address)
router.post('/address/add',userAuth.isAuthenticated,Address.addAddress)
router.patch('/address/edit/:id',userAuth.isAuthenticated,Address.editAddress)
router.patch('/address/default/:addressId',userAuth.isAuthenticated,Address.setDefaultAddress)
router.delete('/address/delete/:id',userAuth.isAuthenticated,Address.deleteAddress)


//cart
router.get('/cart',Cart.load_cart)
router.post('/cart/product/add',Cart.addtocart)
router.patch('/cart/update-quantity',userAuth.isAuthenticated,Cart.updateCartquantity)
router.delete('/cart/remove-item/:variantId',userAuth.isAuthenticated,Cart.deletCart)


//checkout
router.get('/cart/check-stock',userAuth.isAuthenticated,Checkout.checkStockBeforeCheckout)
router.get('/checkout',userAuth.isAuthenticated,Checkout.load_checkout)
//coupen applied
router.post('/apply-coupon',userAuth.isAuthenticated,Checkout.applyCoupen)


//payment
router.get('/payment',userAuth.isAuthenticated,Payment.load_payment)
router.post('/order/cashOnDelivery',userAuth.isAuthenticated,Payment.cashOnDeliveryChecking)
router.get('/order-confirmed/:id',userAuth.isAuthenticated,Payment.load_orderConfirmed)

router.patch('/order-cancelled/:id',Payment.orderCancel)

//Orders
router.get('/orders',Orders.load_orders);
router.get('/order-details/:orderId',Orders.load_orders_Details)
router.get('/order-return/:id',Orders.load_returnOrder)
router.post('/order/return',Orders.returnOrder_details);
//invoice
router.get('/orders/invoice/:id',Invoice.load_Download_invoice);

//
router.get("/wishlist",userAuth.isAuthenticated,Wishlist.load_wishlist)

router.get('/logout',userAuth.isAuthenticated,usercontroller.isLogout);


export default router;

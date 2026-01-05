
import express from "express";
const router = express.Router();
import { upload } from "../config/multer.js";

import * as adminAuth from "../middleware/adminAuth.js";
import * as adminAuthController from "../controller/admincontroller/auth.js";
import * as adminPages from "../controller/admincontroller/pages.controller.js";
import * as admindashboard from "../controller/admincontroller/dashboard.js";
import * as admincustomers from "../controller/admincontroller/customers.js";
import * as category from "../controller/admincontroller/category.js"
import * as Products from "../controller/admincontroller/products.js"
import * as Orders from "../controller/admincontroller/orders.js";
import * as Coupon from "../controller/admincontroller/coupons.js"
import * as Offer from "../controller/admincontroller/offer.js"
import * as Sales from "../controller/admincontroller/sales-report.js";

router.get('/login', adminAuth.isLoggin, adminAuthController.loadlogin)
router.post('/login', adminAuth.isLoggin, adminAuthController.login)

router.get('/dashboard', adminAuth.checkSession, admindashboard.load_dashboard)

router.get('/customers', adminAuth.checkSession, admincustomers.load_customers)
router.patch('/user/:id/toggle-block', adminAuth.checkSession, admincustomers.blockUser)

//category
router.get('/category', adminAuth.checkSession, category.load_Category)
router.post('/subcategory/add', adminAuth.checkSession, category.addSubCategory)
router.patch('/subcategory/:id/toggle-block', adminAuth.checkSession, category.blocksubCategory)
router.patch('/subcategory/:id', adminAuth.checkSession, category.updateSubcategory)

//products
router.get('/products', adminAuth.checkSession, Products.load_Products)

router.get('/products/add', adminAuth.checkSession, Products.load_add_product)
router.post('/product/add', adminAuth.checkSession, upload.none(), Products.addProduct)
router.get('/product/edit/:id', adminAuth.checkSession, Products.load_edit_product)
router.patch('/product/edit/:id', adminAuth.checkSession, upload.none(), Products.editProduct)
router.patch('/products/:id/toggle-block', adminAuth.checkSession, Products.blockProduct)

router.get('/products/:id/variants', adminAuth.checkSession, Products.load_add_variants)
router.post('/products/variants/save', adminAuth.checkSession, upload.any(), Products.saveVarients)
router.get('/products/:id/variants/edit', adminAuth.checkSession, Products.load_edit_variants)
router.patch('/products/variants/update-one/:variantId', adminAuth.checkSession, upload.array('images'), Products.updateSingleVariants)
router.patch("/products/variants/toggle-block/:variantId", adminAuth.checkSession, Products.blockVariants);

//orders
router.get('/orders', adminAuth.checkSession, Orders.load_orders)
router.get('/order-details/:id', adminAuth.checkSession, Orders.load_orders_Details)
router.patch('/order-cancel/:id',adminAuth.checkSession,Orders.cancelOrder);
router.patch('/orders/update-status/:id',Orders.updateStatus)
//orders return and reject
router.patch('/orders/return-approve',Orders.approveReturn)
router.patch('/orders/return-reject',adminAuth.checkSession,Orders.rejectReturn)

//coupen management
router.get('/coupons',Coupon.load_coupons)
router.get('/coupons/add',adminAuth.checkSession,Coupon.load_couponAdd)
router.post('/coupons/add',adminAuth.checkSession,Coupon.saveCoupon)
router.get('/coupons/edit/:id',adminAuth.checkSession,Coupon.load_couponEdit)
router.patch('/coupons/edit/:id',adminAuth.checkSession,Coupon.saveCoupon)
router.delete('/coupons/delete/:id',adminAuth.checkSession,Coupon.deleteCoupen);

//offer
router.get('/offers',adminAuth.checkSession,Offer.load_offer)
router.get('/offers/add',adminAuth.checkSession,Offer.load_addOffer)
router.get('/offers/api/search-products',Offer.searchSpecificProduct)
router.get('/offers/edit/:id',adminAuth.checkSession,Offer.load_editOffer)
router.post('/offers/add',adminAuth.checkSession,Offer.addOrUpdateOffer)
router.patch('/offers/edit/:id',adminAuth.checkSession,Offer.addOrUpdateOffer)
router.delete('/offers/delete/:id',adminAuth.checkSession,Offer.deleteOffer)


//sales report
router.get('/sales-report',adminAuth.checkSession,Sales.load_sales_report)

router.get('/logout', adminAuth.checkSession, adminAuthController.isLogout)

router.get('/page-404', (req, res) => {
	return adminPages.page_404(req, res);
});

export default router;

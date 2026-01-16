import asyncHandler from "../../utils/asynHandler.js";
import wishlistModel from "../../models/wishlistmodel.js";
import CartModel from "../../models/cartmodel.js";
import { getBestOfferForProduct } from '../../utils/offerHelper.js';

export const toggle_wishlist = asyncHandler(async (req, res) => {
    const { variantId, productId } = req.body;
    const userId = req.session.user._id;

    let wishlist = await wishlistModel.findOne({ userId });
    
    if (!wishlist) {
        wishlist = new wishlistModel({ userId, items: [] });
    }

    const itemIndex = wishlist.items.findIndex(
        (item) => item.variantId.toString() === variantId
    );

    if (itemIndex > -1) {
        wishlist.items.splice(itemIndex, 1);
        await wishlist.save();
        
        return res.status(200).json({ 
            success: true, 
            status: "removed", 
            message: "Removed from wishlist" 
        });
    } else {
        wishlist.items.push({ productId, variantId });
        await wishlist.save();
        
        return res.status(200).json({ 
            success: true, 
            status: "added", 
            message: "Added to wishlist" 
        });
    }
});

export const load_wishlist = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;
    const userWishlist = await wishlistModel.findOne({ userId })
        .populate({
            path: "items.productId",
            populate: { path: "subCategory_id" }
        });
    const cartData = await CartModel.findOne({ user: userId });

    let processedWishlist = [];

    if (userWishlist && userWishlist.items.length > 0) {
        processedWishlist = await Promise.all(userWishlist.items.map(async (item) => {
            const product = item.productId;
            if (!product) return null;

            const offer = await getBestOfferForProduct(product);

            const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());

            return {
                ...item._doc,
                productId: product,
                variantDetails: variant,
                computedFinalPrice: offer.finalPrice,
                computedDiscountPercentage: offer.discountPercentage,
                basePrice: product.price
            };
        }));
        processedWishlist = processedWishlist.filter(item => item !== null);
    }

    res.render("user/layout", {
        title: "Wishlist",
        body: "user/wishlist/wishlist",
        userData: userId,
        wishlist: processedWishlist,
        cart: cartData || { items: [] }
    });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
    const { variantId } = req.body;
    const userId = req.session.user._id;

    const updatedWishlist = await wishlistModel.findOneAndUpdate(
        { userId: userId },
        { $pull: { items: { variantId: variantId } } },
        { new: true }
    );

    if (!updatedWishlist) {
        return res.status(404).json({ success: false, message: "Wishlist not found" });
    }

    res.status(200).json({ success: true, message: "Item removed from wishlist", wishlistCount: updatedWishlist.items.length });
});

export const clearWishlist = asyncHandler(async (req, res) => {
    const userId = req.session.user?._id;

    if (!userId) {
        return res.status(401).json({ success: false, message: "Please log in" });
    }
    await wishlistModel.findOneAndUpdate({ userId: userId }, { $set: { items: [] } }, { new: true });

    res.status(200).json({ success: true, message: "Wishlist cleared successfully", wishlistCount: 0 });
});
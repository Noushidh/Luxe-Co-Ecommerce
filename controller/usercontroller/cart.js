import asyncHandler from "../../utils/asynHandler.js";
import CartModel from "../../models/cartmodel.js";
import ProductModel from "../../models/productmodel.js";
import {getBestOfferForProduct} from "../../utils/offerHelper.js"

export const load_cart = asyncHandler(async (req, res) => {
  const userId = req.session.user?._id;
  const cartDoc = await CartModel.findOne({ user: userId }).populate('items.productId');

  let grossSubTotal = 0;  
  let subTotal = 0;       
  let cartItemsWithOffers = [];

  if (cartDoc && cartDoc.items.length > 0) {
    let isModified = false;

    cartItemsWithOffers = await Promise.all(cartDoc.items.map(async (item) => {
      const product = item.productId;
      const currentVariant = product.variants.find((v) => v._id.toString() === item.variantId.toString());

      if (currentVariant) {
        const { finalPrice } = await getBestOfferForProduct(product);
        
        if (item.price !== finalPrice) { item.price = finalPrice; isModified = true; }
        if (item.color !== currentVariant.color) { item.color = currentVariant.color; isModified = true; }
        if (item.size !== currentVariant.size) { item.size = currentVariant.size; isModified = true; }

        grossSubTotal += (product.price * item.quantity); 
        subTotal += (finalPrice * item.quantity);        

        return {...item.toObject(),offerPrice: finalPrice, rowTotal: finalPrice * item.quantity };
      }
      return item.toObject();
    }));

    if (isModified) {
      cartDoc.subTotal = subTotal;
      await cartDoc.save();
    }
  }

  const productDiscount = grossSubTotal - subTotal;
  const shipping = (subTotal > 500 || subTotal === 0) ? 0 : 50;
  const total = subTotal + shipping;

  res.render('user/layout', {
    title: "Cart",
    body: "user/cart/cart",
    cart: cartItemsWithOffers, 
    cartItemsCount: cartItemsWithOffers.length,
    shipping, 
    discount: productDiscount, 
    total, 
    subTotal: grossSubTotal,
    actualPayable: subTotal,
    couponCode: null,
    appliedCoupon: false
  });
});

function finalUnitPrice(price, discount) {
  if (discount > 0) {
    return price * (1 - discount / 100)
  }
  return price;
}

export const addtocart = asyncHandler(async (req, res) => {
  const { productId, size, color } = req.body;
  const quantity = Number(req.body.quantity);
  const userId = req.session.user?._id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Please log in to add items to your cart." });
  }

  if (!productId || !size || !color || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ success: false, message: "Invalid product data or quantity" });
  }

  const product = await ProductModel.findById(productId);
  if (!product || product.isBlocked) {
    return res.status(404).json({ success: false, message: "Product not available" });
  }

  const variant = product.variants.find(v => v.size === size && v.color === color);

  if (!variant || variant.isBlocked) {
    return res.status(400).json({ success: false, message: "Invalid or blocked variant" });
  }

  const finalPrice = finalUnitPrice(product.price, product.discount);

  let cart = await CartModel.findOne({ user: userId });
  if (!cart) {
    cart = new CartModel({ user: userId, items: [] });
  }

  const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId && item.variantId.toString() === variant._id.toString());

  const existingQty = itemIndex !== -1 ? cart.items[itemIndex].quantity : 0;
  const newQty = existingQty + quantity;

  if (variant.stock < newQty) {
    return res.status(409).json({ success: false, message: `Only ${variant.stock} items available. You already have ${existingQty} in cart.` });
  }

  if (newQty > 4) {
    return res.status(409).json({ success: false, message: "maximun 4 items allowed per product" })
  }

  let action = "added";
  if (itemIndex !== -1) {
    cart.items[itemIndex].quantity = newQty;
    action = "updated";
  } else {
    cart.items.push({ productId, variantId: variant._id, size, color, price: finalPrice, quantity, image: variant.images?.[0] || "" });
  }

  cart.subTotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  await cart.save();

  return res.status(200).json({ success: true, action, message: action === "added" ? "Product added to cart" : "Product quantity updated in cart", cartCount: cart.items.length });
});




export const updateCartquantity = asyncHandler(async (req, res) => {
  const { variantId, quantity } = req.body;
  const userId = req.session.user?._id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Login required" });
  }

  const numQty = Number(quantity);
  if (!Number.isInteger(numQty) || numQty < 1) {
    return res.status(400).json({ success: false, message: "Invalid quantity" });
  }

  if (numQty > 4) {
    return res.status(400).json({ success: false, message: "Maximum 4 items allowed per product" });
  }

  const cart = await CartModel.findOne({ user: userId });
  if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

  const item = cart.items.find(i => i.variantId.toString() === variantId);
  if (!item) return res.status(404).json({ success: false, message: "Item not in cart" });

  const product = await ProductModel.findById(item.productId);
  const variant = product?.variants.id(variantId);

  if (!product || product.isBlocked || !variant || variant.isBlocked) {
    return res.status(404).json({ success: false, message: "Product/Variant unavailable" });
  }

  if (numQty > variant.stock) {
    return res.status(409).json({ success: false, message: `Only ${variant.stock} units available` });
  }

  item.quantity = numQty;

  cart.subTotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const shipping = cart.subTotal > 500 ? 0 : 50;
  const total = cart.subTotal + shipping;
  const newItemTotal = item.price * item.quantity;

  await cart.save();

  return res.json({ success: true, message: "Cart updated successfully", newItemTotal, subTotal: cart.subTotal, shipping, total });
});


export const deletCart = asyncHandler(async (req, res) => {

  const { variantId } = req.params;

  const userId = req.session.user._id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "loggin required" })
  }
  const cart = await CartModel.findOneAndUpdate({ user: userId }, { $pull: { items: { variantId: variantId } } }, { new: true })

  cart.subTotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0); res.status(200).json({ success: true, message: "item deleted Cart" })

  const shipping = (cart.subTotal > 500 || cart.items.length === 0) ? 0 : 50;

  const total = cart.subTotal + shipping;

  await cart.save();

  res.status(200).json({ success: true, message: "Item removed from cart", subTotal: cart.subTotal, shipping, total, cartCount: cart.items.length });
})
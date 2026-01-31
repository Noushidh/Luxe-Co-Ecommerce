export const validateStock = (cartItems) => {
    for (let item of cartItems) {
        const product = item.productId;

        if (!product || product.isBlocked) {
            throw new Error(`${product?.name || 'A product in your cart'} is currently unavailable.`);
        }
         
        let variant;
        if(item.variantId){
         variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
        }else{
         variant = product.variants.find(v=>v.size===item.size&&v.color===item.color)
        }
        
        if (!variant) {
            throw new Error(`The specific version of ${product.name} is no longer available.`);
        }

        if (variant.isBlocked) {
            throw new Error(`${product.name} (${variant.size}/${variant.color}) is out of stock.`);
        }

        if (item.quantity > variant.stock) {
            throw new Error(`${product.name} (${variant.size}) only has ${variant.stock} units left.`);
        }
    }
    return true;
};
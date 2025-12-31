import offerModal from "../models/offermodel.js";

export const getBestOfferForProduct = async (product, now = new Date()) => {
    const categoryName = product.subCategory_id?.category;
    const subId = product.subCategory_id?._id;

    const queryConditions = [{ appliesTo: 'all' }];
    if (categoryName) queryConditions.push({ categoryScope: categoryName });
    if (subId) queryConditions.push({ categoryId: subId });
    queryConditions.push({ productId: product._id });

    const applicableOffers = await offerModal.find({
        isActive: true,
        startDate: { $lte: now },
        expiryDate: { $gte: now },
        $or: queryConditions
    });

    let bestDiscountValue = 0;

    applicableOffers.forEach(offer => {
        let currentDiscount = offer.discountType === 'percentage'
            ? (product.price * offer.discountValue) / 100
            : offer.discountValue;

        if (currentDiscount > bestDiscountValue) {
            bestDiscountValue = currentDiscount;
        }
    });

    const finalPrice = Math.max(0, product.price - bestDiscountValue);
    const discountPercentage = product.price > 0 
        ? Math.round((bestDiscountValue / product.price) * 100) 
        : 0;

    return { finalPrice, discountPercentage };
};
import ProductModel from "../../models/productmodel.js";
import SubCategory from "../../models/subcategory.js";
import asyncHandler from "../../utils/asynHandler.js";
import reviewModel from "../../models/reviewmodal.js";
import wishlistModel from "../../models/wishlistmodel.js";
import { getBestOfferForProduct } from "../../utils/offerHelper.js";
import { getReadyProductFilter } from "../../utils/productVisibility.js";

const mapCategory = (cat) => {
    if (!cat) return "";
    const c = cat.toLowerCase();
    if (c === "men") return "Men";
    if (c === "women") return "Women";
    if (c === "kids") return "Kids";
    return "";
};

export const loadFiltersPage = asyncHandler(async (req, res) => {

    const { page, category, subcategory, price, size, sort, search } = req.query;
    const currentPage = parseInt(page) || 1;
    const limit = 9;
    const skip = (currentPage - 1) * limit;

    const filter = getReadyProductFilter();
    filter.isBlocked = false;

    if (search && search.trim() !== "") {
        const query = search.trim();
        filter.$or = [
            { name: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ];
    }

const allSubcategories = await SubCategory.find({ isBlocked: false }).lean();
const activeSubCatIds = allSubcategories.map(sc => sc._id);

filter.subCategory_id = { $in: activeSubCatIds };

const fixedCategory = mapCategory(category);

if (subcategory) {
    if (activeSubCatIds.map(id => id.toString()).includes(subcategory)) {
        filter.subCategory_id = subcategory;
    } else {
        filter.subCategory_id = { $in: [] }; 
    }
} else if (fixedCategory) {
    const filteredSubCats = allSubcategories.filter(sc => mapCategory(sc.category) === fixedCategory);
    const allowedCatIds = filteredSubCats.map(sc => sc._id);
    filter.subCategory_id = { $in: allowedCatIds };
}

    const selectedSize = size || '';
    if (selectedSize) {
        filter.variants = {
            $elemMatch: {
                size: selectedSize,
                isBlocked: false
            }
        };
    }

    const priceFilter = price || '';
    if (priceFilter) {
        let min = null, max = null;

        if (priceFilter.includes("-")) {
            const [minStr, maxStr] = priceFilter.split("-");
            min = parseInt(minStr);
            max = parseInt(maxStr);
        } else if (priceFilter.endsWith("+")) {
            min = parseInt(priceFilter);
            max = Infinity;
        }

        const priceQuery = {};
        if (!isNaN(min)) priceQuery.$gte = min;
        if (!isNaN(max) && max !== Infinity) priceQuery.$lte = max;


        if (Object.keys(priceQuery).length > 0) {
            filter.price = priceQuery;
        }
    }

    let sortCriteria = {};
    if (sort === "price_asc") {
        sortCriteria.price = 1;
    } else if (sort === "price_desc") {
        sortCriteria.price = -1;
    } else {
        sortCriteria.createdAt = -1;
    }

    const now = new Date();
    const rawProducts = await ProductModel.find(filter)
        .populate("subCategory_id")
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .lean();

    if (search) {
        const query = search.toLowerCase().trim();
        rawProducts.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();

            if (aName === query && bName !== query) return -1;
            if (aName !== query && bName === query) return 1;

            if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
            if (!aName.startsWith(query) && bName.startsWith(query)) return 1;
            return 0;
        });
    }

    const products = await Promise.all(rawProducts.map(async (p) => {
        const offerData = await getBestOfferForProduct(p, now);
        return { ...p, ...offerData };
    }));

    const totalDocuments = await ProductModel.countDocuments(filter);
    const totalPages = Math.ceil(totalDocuments / limit);
    const sizes = await ProductModel.distinct("variants.size");


    res.render("user/layout", {
        title: "Collection",
        body: "user/collections/collectionPage",
        products,
        sizes,
        category: category || '',
        price: priceFilter,
        selectedSize: selectedSize,
        subcategories: allSubcategories,
        currentSubcategory: subcategory || '',
        activeCategory: category || '',
        currentPage: currentPage,
        totalPages: totalPages,
        sort: sort || '',
        totalDocuments: totalDocuments,
        search: search || ''
    });
});

export const ProductDetails = asyncHandler(async (req, res) => {
    const productId = req.params.id;
    const userId = req.session?.user?._id;
    const product = await ProductModel.findById(productId).populate('subCategory_id').lean();

    const isReady = product && !product.isBlocked && 
        product.subCategory_id && product.subCategory_id.isBlocked === false && 
        product.variants?.length > 0 && product.variants.some(v => v.images && v.images.length > 0);

    if (!isReady) {
        return res.status(404).render("user/layout", {
            title: "Not Found", body:"user/pages/page-404"
        });
    }

    const selectedVariantId = req.query.variantId || product.variants[0]?._id.toString();
    
    let isInWishlist = false;
    if (userId && selectedVariantId) {
        const wishlist = await wishlistModel.findOne({ userId });
        if (wishlist) {
            isInWishlist = wishlist.items.some(item => 
                item.variantId.toString() === selectedVariantId.toString()
            );
        }
    }
    const reviews = await reviewModel.find({ productId }).populate('userId', 'fullname').sort({ createdAt: -1 }).lean();
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? (reviews.reduce((sum, rev) => sum + rev.rating, 0) / totalReviews).toFixed(1) : 0;
    const offerData = await getBestOfferForProduct(product) || {};
    const finalPrice = offerData.finalPrice ?? product.price; 
    const discountPercentage = offerData.discountPercentage ?? 0;
    const relProdsFilter = getReadyProductFilter({ 
        subCategory_id: product.subCategory_id._id, 
        _id: { $ne: product._id } 
    });
    const relProds = await ProductModel.find(relProdsFilter).limit(4).lean();

    res.render("user/layout", {
        title: product.name,
        body: "user/collections/productDetails",
        product,
        category: product.subCategory_id?.category || 'All',
        subcategoryName: product.subCategory_id?.subcategory || null,
        relProds,
        finalPrice,
        discountPercentage,
        initialVariantId: selectedVariantId || null,
        reviews,
        averageRating,
        totalReviews,
        isInWishlist 
    });
});
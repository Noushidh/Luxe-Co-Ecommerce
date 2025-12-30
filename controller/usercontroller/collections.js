import ProductModel from "../../models/productmodel.js";
import SubCategory from "../../models/subcategory.js";
import asyncHandler from "../../utils/asynHandler.js";

const mapCategory = (cat) => {
    if (!cat) return "";
    const c = cat.toLowerCase();
    if (c === "men") return "Men";
    if (c === "women") return "Women";
    if (c === "kids") return "Kids"; 
    return "";
};

export const loadFiltersPage = asyncHandler(async (req, res) => {

    const { page, category, subcategory, price, size, sort } = req.query; 
    const currentPage = parseInt(page) || 1;
    const limit = 9; 
    const skip = (currentPage - 1) * limit;

    const filter = {};
    filter.isBlocked = false; 

    const fixedCategory = mapCategory(category);
    const allSubcategories = await SubCategory.find({ isBlocked: false }).lean(); 
    

    if (subcategory) {
        filter.subCategory_id = subcategory; 
        
    } else if (fixedCategory) {
        
        const filteredSubCats = allSubcategories.filter(sc => mapCategory(sc.category) === fixedCategory);
        const allowedCatIds = filteredSubCats.map(sc => sc._id);

        if (allowedCatIds.length > 0) {
            filter.subCategory_id = { $in: allowedCatIds };
        } else {
            filter.subCategory_id = { $in: [] }; 
        }
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

    const totalDocuments = await ProductModel.countDocuments(filter);
    const totalPages = Math.ceil(totalDocuments / limit); 

    const products = await ProductModel.find(filter)
        .populate("subCategory_id")
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .lean();

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
        totalDocuments: totalDocuments 
    });
});

export const ProductDetails = asyncHandler(async (req, res) => {
    const productId = req.params.id;

    const product = await ProductModel.findById(productId)
        .populate('subCategory_id')
        .lean();

    if (!product) {
        return res.status(404).render("user/layout", {
            title: "Not Found",
            body: "user/error-404"
        });
}


    const subCategoryData = product.subCategory_id;

    const category = subCategoryData ? subCategoryData.category : 'All';

    const subcategoryName = subCategoryData ? subCategoryData.name : null;

    const relProds = await ProductModel.find({ $and: [{ subCategory_id: subCategoryData, _id: { $ne: product._id } }] }).limit(4)

    res.render("user/layout", {
        title: product.name,
        body: "user/collections/productDetails",
        product: product,

        category: category,
        subcategoryName: subcategoryName,
        relProds
    });
});
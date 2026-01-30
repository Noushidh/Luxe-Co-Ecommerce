
import SubCategory from "../../models/subcategory.js";
import asyncHandler from "../../utils/asynHandler.js";
import { FIXED_CATEGORIES } from "../../utils/constants.js";
import { paginate } from "../../utils/paginate.js";
import { HTTP_STATUS } from "../../utils/httpStatus.js";

export const load_Category = asyncHandler(async (req, res) => {

    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";

    const query = search ? {
        $or: [
            { category: { $regex: search, $options: "i" } },
            { subcategory: { $regex: search, $options: "i" } }
        ]
    } : {};

    const { results, totalPages, currentPage } = await paginate(SubCategory, page, 10, query)

    res.render("admin/layout", {
        title: "Category",
        body: "./category",
        currentPath: '/admin/category',
        categories: FIXED_CATEGORIES,
        subcategories: results, currentPage, totalPages, search
    });
});



export const addSubCategory = asyncHandler(async (req, res) => {
    const { category, subcategory } = req.body;

    const exist = await SubCategory.findOne({ category, subcategory: { $regex: new RegExp(`^${subcategory}$`), $options: "i" } });
    if (exist) {
        return res.json({ success: false, message: "subcategory already exist" })
    }

    await SubCategory.create({ category, subcategory, isBlocked: false });

    return res.json({ success: true, message: "subcategory added successfully" })
});

export const updateSubcategory = asyncHandler(async (req, res) => {

    const { id } = req.params;
    const { subcategory } = req.body;

    console.log("Updating subcategory:", { id, subcategory });

    if (!subcategory || !subcategory.trim()) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "subcategory name is required" })
    }
    const trimmedSubcategory = subcategory.trim();
    const exist = await SubCategory.findOne({ _id: { $ne: id }, subcategory: { $regex: new RegExp(`^${trimmedSubcategory}$`), $options: "i" } })

    if (exist) {
        return res.status(HTTP_STATUS.CONFLICT).json({ success: false, message: "subcategory already exists" })
    }

    await SubCategory.findByIdAndUpdate(id, { subcategory: trimmedSubcategory })
    return res.status(HTTP_STATUS.OK).json({ success: true, message: "subcategory updated successfully" })

})

export const blocksubCategory = asyncHandler(async (req, res) => {

    const sub = await SubCategory.findById(req.params.id);

    if (!sub) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "subcategory not found" });
    }

    const neweStatus = !sub.isBlocked;

    await SubCategory.findByIdAndUpdate(req.params.id, { isBlocked: neweStatus })

    res.json({ success: true, isBlocked: neweStatus, message: neweStatus ? "Subcategory Blocked" : "Subcategory Unblocked" })
})

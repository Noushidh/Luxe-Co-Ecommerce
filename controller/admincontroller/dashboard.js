import userModel from "../../models/usermodel.js";
import orderModel from "../../models/ordermodel.js";
import asyncHandler from "../../utils/asynHandler.js";

export const load_dashboard = asyncHandler(async (req, res) => {
    const totalUsers = await userModel.countDocuments({ isBlocked: false });
    const totalOrders = await orderModel.countDocuments();

    let format = "%b %Y";

    const topProducts = await orderModel.aggregate([
        { $unwind: "$items" },
        { $match: {"items.status": { $in: ["Delivered", "Return Requested" , "Rejected"] } } },
        { $group: { _id: "$items.productId", name: { $first: "$items.productName" }, totalSolds: { $sum: "$items.quantity" }, imageUrl: { $first: "$items.image" } } }, { $sort: { totalSolds: -1 } }, { $limit: 10 }
    ])

    const topCategories = await orderModel.aggregate([
        { $unwind: "$items" },
        { $match: {"items.status": { $in: ["Delivered", "Return Requested" , "Rejected"] } } },
        { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "productInfo" } },
        { $unwind: "$productInfo" },
        { $lookup: { from: "subcategories", localField: "productInfo.subCategory_id", foreignField: "_id", as: "subCategoryData" } },
        { $unwind: "$subCategoryData" },
        { $group: { _id: "$subCategoryData.category", count: { $sum: "$items.quantity" } } },
        { $sort: { count: -1 } }
    ]);

    const topSubcategories = await orderModel.aggregate([
        { $unwind: "$items" },
        { $match: {"items.status": { $in: ["Delivered", "Return Requested" , "Rejected"] } } },
        { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "productInfo" } },
        { $unwind: "$productInfo" },
        { $lookup: { from: "subcategories", localField: "productInfo.subCategory_id", foreignField: "_id", as: "subCategoryDetails" } },
        { $unwind: "$subCategoryDetails" },
        { $group: { _id: "$subCategoryDetails.subcategory", totalSold: { $sum: "$items.quantity" } } },
        { $sort: { totalSold: -1 } }, { $limit: 10 }
    ]);

    const data = await orderModel.aggregate([
        { $unwind: "$items" },
        { $match: {"items.status": { $in: ["Delivered", "Return Requested" , "Rejected"] } } },
        {
            $group: {
                _id: { $dateToString: { format: format, date: "$createdAt" } },
                total: { $sum: "$total" },
                totalCouponDiscounts: { $sum: "$discount" },
                totalOfferDiscounts: { $sum: "$offerDiscount" }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    const revenueData = await orderModel.aggregate([
        { $unwind: "$items" },
        { $match: {"items.status": { $in: ["Delivered", "Return Requested" , "Rejected"] } } },
        { $group: { _id: null,totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } }
    ]);
    
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    res.render("admin/layout", {
        title: "Dashboard",
        body: "./dashboard",
        totalUsers,
        totalOrders,
        totalRevenue,
        topProducts,
        topCategories,
        topSubcategories,
        data
    });
})

export const getChartData = asyncHandler(async (req, res) => {
    const { filter } = req.query;
    const now = new Date();

    let aggregationPipeline = [
        { $unwind: "$items" },
        { $match: {"items.status": { $in: ["Delivered", "Return Requested" , "Rejected"] } } },
    ];

    const revenueCalculation = { $sum: { $multiply: ["$items.price", "$items.quantity"] } };
    if (filter === 'yearly') {
        aggregationPipeline.push(
            { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, total: revenueCalculation } },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            {
                $project: {
                    _id: {
                        $concat: [
                            { $arrayElemAt: [["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], "$_id.month"] },
                            " ",
                            { $substr: ["$_id.year", 0, 4] }
                        ]
                    },
                    total: 1
                }
            }
        );
    } else if (filter === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        aggregationPipeline.push(
            { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: { $dayOfMonth: "$createdAt" }, total: revenueCalculation } },
            { $sort: { "_id": 1 } }
        );
    } else {
        aggregationPipeline.push(
            { $group: { _id: { $dateToString: { format: "%d %b", date: "$createdAt" } }, total:revenueCalculation } },
            { $sort: { "_id": 1 } }
        );
    }

    const data = await orderModel.aggregate(aggregationPipeline);
    res.status(200).json(data);
});
import userModel from "../../models/usermodel.js";
import orderModel from "../../models/ordermodel.js";
import asyncHandler from "../../utils/asynHandler.js";

export const load_dashboard = asyncHandler(async (req, res) => {
  const totalUsers = await userModel.countDocuments({ isBlocked: false });
  const totalOrders = await orderModel.countDocuments();

  const topProducts = await orderModel.aggregate([
    { $match: { status: "Delivered" } },
    { $unwind: "$items" },
    { $group: { _id: "$items.productId", name: { $first: "$items.productName" }, totalSolds: { $sum: "$items.quantity" }, imageUrl: { $first: "$items.image" } } }, { $sort: { totalSolds: -1 } }, { $limit: 10 }
  ])

  const topCategories = await orderModel.aggregate([
    { $match: { status: "Delivered" } },
    { $unwind: "$items" },
    { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "productInfo" } },
    { $unwind: "$productInfo" },
    { $lookup: { from: "subcategories", localField: "productInfo.subCategory_id", foreignField: "_id", as: "subCategoryData" } },
    { $unwind: "$subCategoryData" },
    { $group: { _id: "$subCategoryData.category", count: { $sum: "$items.quantity" } } },
    { $sort: { count: -1 } }
  ]);

  const topSubcategories = await orderModel.aggregate([
    { $match: { status: "Delivered" } },
    { $unwind: "$items" },
    { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "productInfo" } },
    { $unwind: "$productInfo" },
    { $lookup: { from: "subcategories", localField: "productInfo.subCategory_id", foreignField: "_id", as: "subCategoryDetails" } },
    { $unwind: "$subCategoryDetails" },
    { $group: { _id: "$subCategoryDetails.subcategory", totalSold: { $sum: "$items.quantity" } } },
    { $sort: { totalSold: -1 } }, { $limit: 10 }
  ]);

  const monthlyRevenueData = await orderModel.aggregate([
    { $match: { status: "Delivered" } },
    { $group: { _id: { $month: "$createdAt" }, total: { $sum: "$total" } } },
    { $sort: { "_id": 1 } }
  ]);

  res.render("admin/layout", {
    title: "Dashboard",
    body: "./dashboard",
    totalUsers,
    totalOrders,
    totalRevenue: 5,
    topProducts,
    topCategories,
    topSubcategories,
    monthlyRevenue: JSON.stringify(monthlyRevenueData)
  });
}) 

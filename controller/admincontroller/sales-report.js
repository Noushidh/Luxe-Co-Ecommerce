import asyncHandler from "../../utils/asynHandler.js";
import orderModel from "../../models/ordermodel.js"

export const load_sales_report = asyncHandler(async(req, res) => {
    const { startDate, endDate, paymentMethod, status } = req.query;

    let filter = {};
    if (startDate && endDate) {
        filter.createdAt = { 
            $gte: new Date(startDate), 
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
        };
    }

    if (paymentMethod) {
        filter.paymentMethod = paymentMethod;
    }

    if (status) {
        filter.status = status;
    }

    const stats = await orderModel.aggregate([
        { $match: filter },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalAmount: { $sum: "$total" },
                totalDiscount: { $sum: { $add: ["$discount", { $ifNull: ["$offerDiscount", 0] }] } }
            }
        }
    ]);

    const reportStats = stats[0] || { totalOrders: 0, totalAmount: 0, totalDiscount: 0 };

    const orders = await orderModel.find(filter)
        .populate('userId', 'fullname email')
        .populate('couponId', 'code')
        .sort({ createdAt: -1 });

    res.render("admin/layout", {
        title: "Sales Report",
        body: "./sales-report",
        orders,
        totalOrders: reportStats.totalOrders,
        totalAmount: reportStats.totalAmount,
        totalDiscount: reportStats.totalDiscount,
        startDate,
        endDate,
        paymentMethod, 
        status         
    });
});
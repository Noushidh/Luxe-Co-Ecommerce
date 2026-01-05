import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

export const download_sales_report = asyncHandler(async (req, res) => {
    const { format } = req.params;
    const { startDate, endDate, paymentMethod, status } = req.query;

    let filter = {};
    if (startDate && endDate) {
        filter.createdAt = { 
            $gte: new Date(startDate), 
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
        };
    }
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (status) filter.status = status;

    const orders = await orderModel.find(filter)
        .populate('userId', 'name fullname email') 
        .sort({ createdAt: -1 });

    if (format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Order ID', key: 'id', width: 25 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Customer', key: 'customer', width: 20 },
            { header: 'Payment', key: 'payment', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Amount', key: 'amount', width: 12 }
        ];

        orders.forEach(order => {
            worksheet.addRow({
                id: order._id.toString(),
                date: order.createdAt.toLocaleDateString(),
                customer: order.userId ? (order.userId.fullname || order.userId.name || 'N/A') : 'Guest',
                payment: order.paymentMethod,
                status: order.status,
                amount: order.total
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
        return workbook.xlsx.write(res).then(() => res.status(200).end());
    }

    if (format === 'pdf') {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Sales Report", 14, 15);
        doc.setFontSize(11);
        
        const tableColumn = ["Order ID", "Date", "Customer", "Status", "Amount"];
        const tableRows = [];

        orders.forEach(order => {
            const rowData = [
                order._id.toString().slice(-6).toUpperCase(),
                order.createdAt.toLocaleDateString(),
                order.userId ? (order.userId.fullname || order.userId.name || 'N/A') : 'Guest',
                order.status,
                `Rs. ${order.total}`
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] } 
        });

        const pdfBuffer = doc.output('arraybuffer');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
        return res.send(Buffer.from(pdfBuffer));
    }
});
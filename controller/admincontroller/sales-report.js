import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import asyncHandler from "../../utils/asynHandler.js";
import orderModel from "../../models/ordermodel.js"

export const load_sales_report = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const { startDate, endDate, paymentMethod, status } = req.query;

    // 1. DYNAMIC FILTER
    let filter = {};
    if (startDate && endDate) {
        filter.createdAt = { 
            $gte: new Date(startDate), 
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
        };
    }
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    // IMPORTANT: If no status is selected, only show finalized sales
    // This automatically EXCLUDES "Cancelled" and "Pending" orders
    if (status) {
        filter.status = status;
    } else {
        filter.status = { $in: ["Delivered", "Return Requested", "Returned"] };
    }

    // 2. AGGREGATE STATS
    const stats = await orderModel.aggregate([
        { $match: filter },
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
                gross: { $sum: "$total" },
                // Calculate refunds for returned items
                refunds: { $sum: { $ifNull: ["$refundedAmount", 0] } },
                // Calculate total discounts (Coupon + Offer) safely
                discounts: { 
                    $sum: { 
                        $add: [
                            { $ifNull: ["$discount", 0] }, 
                            { $ifNull: ["$offerDiscount", 0] }
                        ] 
                    } 
                }
            }
        },
        {
            $project: {
                _id: 0,
                totalOrders: "$count",
                grossSales: "$gross",
                totalDiscount: "$discounts",
                // Net Revenue = Money in - Money out
                netRevenue: { $subtract: ["$gross", "$refunds"] }
            }
        }
    ]);

    const reportStats = stats[0] || { totalOrders: 0, grossSales: 0, totalDiscount: 0, netRevenue: 0 };

    // 3. FETCH ORDERS FOR TABLE
    const orders = await orderModel.find(filter)
        .populate('userId', 'fullname email')
        .populate('couponId', 'code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalMatchingOrders = await orderModel.countDocuments(filter);
    const totalPages = Math.ceil(totalMatchingOrders / limit);

    const queryParams = new URLSearchParams(req.query);
    queryParams.delete('page');
    const qs = queryParams.toString();

    res.render("admin/layout", {
        title: "Sales Report",
        body: "./sales-report",
        orders,
        totalOrders: reportStats.totalOrders,   
        totalAmount: reportStats.netRevenue,    
        totalDiscount: reportStats.totalDiscount, 
        grossSales: reportStats.grossSales,
        startDate,
        endDate,
        paymentMethod,
        status,
        currentPage: page,
        totalPages,
        qs
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

    worksheet.mergeCells('A1:F1');
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'LUXE & CO. - SALES PERFORMANCE REPORT';
    headerCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC8A97E' } 
    };
    headerCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A2:F2');
    const period = (startDate && endDate) ? `${startDate} to ${endDate}` : 'All-Time';
    const subHeader = worksheet.getCell('A2');
    subHeader.value = `Period: ${period} | Generated on: ${new Date().toLocaleString('en-IN')}`;
    subHeader.font = { italic: true };
    subHeader.alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    worksheet.columns = [
        { header: 'Order ID', key: 'id', width: 25 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Customer', key: 'customer', width: 25 },
        { header: 'Payment Method', key: 'payment', width: 20 },
        { header: 'Order Status', key: 'status', width: 15 },
        { header: 'Amount (INR)', key: 'amount', width: 15 }
    ];

    const tableHeaderRow = worksheet.getRow(4);
    tableHeaderRow.font = { bold: true };
    tableHeaderRow.eachCell((cell) => {
        cell.border = { bottom: { style: 'thin' } };
    });

    orders.forEach(order => {
        worksheet.addRow({
            id: order._id.toString().toUpperCase(),
            date: order.createdAt.toLocaleDateString('en-IN'),
            customer: order.userId ? (order.userId.fullname || order.userId.name || 'N/A') : 'Guest',
            payment: order.paymentMethod,
            status: order.status,
            amount: order.total
        });
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    worksheet.addRow([]); 
    const totalRow = worksheet.addRow({
        status: 'TOTAL NET REVENUE',
        amount: totalRevenue
    });
    
    totalRow.getCell('status').font = { bold: true };
    totalRow.getCell('amount').font = { bold: true, color: { argb: 'FF006400' } }; // Dark Green

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=luxe_sales_report.xlsx');

    return workbook.xlsx.write(res).then(() => res.status(200).end());
}

 if (format === 'pdf') {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text("LUXE & CO.", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("123 Business Street, Fashion Hub", 14, 26);
    doc.text("Contact: +91 9876543210 | support@luxe.com", 14, 31);
    
    doc.setFontSize(14);
    doc.text("SALES REPORT", 14, 45);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 52);
    
    if (startDate && endDate) {
        doc.text(`Period: ${startDate} to ${endDate}`, 14, 58);
    }

    doc.setLineWidth(0.5);
    doc.line(14, 62, 196, 62);

    const tableColumn = ["Order ID", "Date", "Customer", "Status", "Amount"];
    const tableRows = [];

    orders.forEach(order => {
        const rowData = [
            order._id.toString().slice(-6).toUpperCase(),
            order.createdAt.toLocaleDateString(),
            order.userId ? (order.userId.fullname || order.userId.name || 'N/A') : 'Guest',
            order.status,
            `Rs. ${order.total.toLocaleString('en-IN')}`
        ];
        tableRows.push(rowData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 70, 
        theme: 'grid',
        headStyles: { fillColor: [200, 169, 126], textColor: [255, 255, 255] }, // Matches your UI Gold color
        styles: { fontSize: 9 },
        didDrawPage: function (data) {
            const str = "Page " + doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });

    const pdfBuffer = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
    return res.send(Buffer.from(pdfBuffer));
}
});
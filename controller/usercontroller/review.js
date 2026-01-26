import asyncHandler from "../../utils/asynHandler.js";
import reviewModal from "../../models/reviewmodal.js";
import orderModal from "../../models/ordermodel.js";
import ProductModel from "../../models/productmodel.js";
import AppError from "../../utils/appError.js";

export const load_Write_review = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { productId } = req.query;
    const userId = req.session.user;

    const order = await orderModal.findById(orderId).populate('items.productId');

    if (!order) throw new AppError("Order not found", 404);

    const item = order.items.find(i =>
        (i.productId._id || i.productId).toString() === productId
    );

    if (!item) throw new AppError("Product not found in this order", 404);

    const product = {
        id: item.productId._id,
        name: item.productId.productName || item.productName || "Premium Item",
        imageURL: (item.productId.productImage && item.productId.productImage.length > 0)
            ? `/uploads/product-images/${item.productId.productImage[0]}`
            : item.image || "/images/placeholder.jpg"
    };

    res.render("user/layout", {
        title: "Review",
        body: "user/orders/review",
        currentPath: '/user/orders',
        userData: userId,
        product,
        orderId,
    });
});

export const submit_review = asyncHandler(async (req, res) => {
    console.log(req.body);
    const { productId, orderId, rating, comment } = req.body;
    const userId = req.session.user._id;

    if (!rating || rating < 1 || rating > 5) {
        throw new AppError("Please select a valid star rating.", 400);
    }
    if (!comment || comment.trim().length < 5) {
        throw new AppError("Please provide a slightly more detailed review.", 400);
    }
    const existingReview = await reviewModal.findOne({ userId, productId, orderId });
    if (existingReview) {
        throw new AppError("You have already reviewed this product for this order.", 400);
    }
    const newReview = new reviewModal({
        productId,
        userId,
        orderId,
        rating: Number(rating),
        comment: comment.trim(),
        status: 'Approved'
    });

    await newReview.save();

    const reviews = await reviewModal.find({ productId, status: 'Approved' });

    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews;

    await ProductModel.findByIdAndUpdate(productId, {
        averageRating: averageRating.toFixed(1),
        reviewCount: totalReviews
    });
    res.status(200).json({ success: true, message: "Thank you for your elegant feedback.", redirect: "/user/orders" });
});

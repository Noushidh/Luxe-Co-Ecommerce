import asyncHandler from "../../utils/asynHandler.js";
import reviewModal from "../../models/reviewmodal.js";
import orderModal from "../../models/ordermodel.js";
import ProductModel from "../../models/productmodel.js";

export const load_Write_review = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { productId } = req.query;
    const userId = req.session.user;

    const order = await orderModal.findById(orderId).populate('items.productId');

    if (!order) return res.status(404).send("Order not found");

    const item = order.items.find(i =>
        (i.productId._id || i.productId).toString() === productId
    );

    if (!item) return res.status(404).send("Product not found");

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
        return res.status(400).json({ success: false, message: "Please select a valid star rating." });
    }
    if (!comment || comment.trim().length < 5) {
        return res.status(400).json({ success: false, message: "Please provide a slightly more detailed review." });
    }
    const existingReview = await reviewModal.findOne({ userId, productId, orderId });
     if(existingReview){
        return res.status(400).json({success:false,message:"You have already reviewed this product for this order."})
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

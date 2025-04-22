import Review from '../models/review.model.js';
import Order from '../models/order.model.js';
import mongoose from 'mongoose';

const reviewService = {
    createReview: async (userId, productId, orderId, data) => {
        try {
            // Kiểm tra đơn hàng tồn tại và thuộc về user
            const order = await Order.findOne({
                _id: orderId,
                userId: userId
            });

            if (!order) {
                throw new Error('Order not found or not authorized');
            }

            // Kiểm tra đơn hàng đã giao thành công chưa
            if (order.shippingStatus !== 'Completed') {
                throw new Error('Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng được giao thành công');
            }

            // Kiểm tra sản phẩm có trong đơn hàng không
            const productInOrder = order.products.find(
                item => item.product.toString() === productId
            );

            if (!productInOrder) {
                throw new Error('Product not found in this order');
            }

            // Kiểm tra đã review sản phẩm này chưa
            const existingReview = await Review.findOne({
                user: userId,
                product: productId,
                order: orderId
            });

            if (existingReview) {
                throw new Error('You have already reviewed this product');
            }

            const review = await Review.create({
                user: userId,
                product: productId,
                order: orderId,
                ...data
            });

            return review;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getProductReviews: async (productId, page = 1, limit = 10) => {
        try {
            const skip = (page - 1) * limit;

            const reviews = await Review.find({ product: productId })
                .populate('user', 'name avatarUrl')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit);

            const total = await Review.countDocuments({ product: productId });

            // Tính rating trung bình
            const averageRating = await Review.aggregate([
                { $match: { product: new mongoose.Types.ObjectId(productId) } },
                { $group: { _id: null, average: { $avg: "$rating" } } }
            ]);

            return {
                reviews,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                },
                averageRating: averageRating[0]?.average || 0
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    updateReview: async (reviewId, userId, updateData) => {
        try {
            const review = await Review.findById(reviewId);
            if (!review) {
                throw new Error('Review not found');
            }

            if (review.user.toString() !== userId.toString()) {
                throw new Error('You do not have permission to update this review');
            }

            Object.assign(review, updateData);
            await review.save();

            return review;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    deleteReview: async (reviewId, userId, userRole) => {
        try {
            const review = await Review.findById(reviewId);
            if (!review) {
                throw new Error('Review not found');
            }

            if (review.user.toString() !== userId.toString() && userRole !== 'Admin') {
                throw new Error('You do not have permission to delete this review');
            }

            await review.deleteOne();
            return true;
        } catch (error) {
            throw new Error(error.message);
        }
    },
    
    checkReviewStatus: async (userId, productId, orderId) => {
        try {
            // Kiểm tra đơn hàng tồn tại và thuộc về user
            const order = await Order.findOne({
                _id: orderId,
                userId: userId
            });

            if (!order) {
                throw new Error('Order not found or not authorized');
            }

            // Kiểm tra đơn hàng đã giao thành công chưa
            if (order.shippingStatus !== 'Completed') {
                return { hasReviewed: false, canReview: false };
            }

            // Kiểm tra đã review sản phẩm này chưa
            const existingReview = await Review.findOne({
                user: userId,
                product: productId,
                order: orderId
            });

            return existingReview ? true : false;
        } catch (error) {
            throw new Error(error.message);
        }
    },
    
    checkUserCanReview: async (userId, productId) => {
        try {
            // Kiểm tra xem người dùng đã có đơn hàng đã giao nào chứa sản phẩm này chưa
            const completedOrders = await Order.find({
                userId: userId,
                shippingStatus: 'Completed',
                'products.product': productId
            });

            if (completedOrders.length === 0) {
                return { canReview: false, hasReviewed: false };
            }

            // Lấy tất cả orderId từ các đơn hàng đã hoàn thành
            const orderIds = completedOrders.map(order => order._id);

            // Kiểm tra xem đã có đánh giá nào từ người dùng cho sản phẩm này chưa
            const existingReview = await Review.findOne({
                user: userId,
                product: productId,
                order: { $in: orderIds }
            }).populate('order', 'orderNumber');

            if (existingReview) {
                return { 
                    canReview: false, 
                    hasReviewed: true, 
                    reviewId: existingReview._id,
                    orderId: existingReview.order._id
                };
            }

            // Nếu chưa có đánh giá, trả về đơn hàng đầu tiên để đánh giá
            return { 
                canReview: true, 
                hasReviewed: false,
                orderId: orderIds[0]
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },
    
    getUserProductReview: async (userId, productId) => {
        try {
            // Tìm đánh giá của người dùng cho sản phẩm
            const review = await Review.findOne({
                user: userId,
                product: productId
            }).populate('order', 'orderNumber');

            if (!review) {
                return null;
            }

            return review;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

export default reviewService; 
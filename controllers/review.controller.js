import reviewService from '../services/review.service.js';

const reviewController = {
    createReview: async (req, res) => {
        try {
            const { productId, orderId, rating, content } = req.body;

            const review = await reviewService.createReview(
                req.user._id,
                productId,
                orderId,
                { rating, content }
            );

            res.status(201).json({
                success: true,
                data: review
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    getProductReviews: async (req, res) => {
        try {
            const { productId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            const result = await reviewService.getProductReviews(productId, page, limit);

            res.status(200).json({
                success: true,
                data: result.reviews,
                pagination: result.pagination,
                averageRating: result.averageRating
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    updateReview: async (req, res) => {
        try {
            const { id } = req.params;
            const review = await reviewService.updateReview(
                id,
                req.user._id,
                req.body
            );

            res.status(200).json({
                success: true,
                data: review
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    deleteReview: async (req, res) => {
        try {
            const { id } = req.params;
            await reviewService.deleteReview(
                id,
                req.user._id,
                req.user.role
            );

            res.status(204).json({
                success: true,
                data: null
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },
    
    checkReviewStatus: async (req, res) => {
        try {
            const { productId, orderId } = req.query;
            const hasReviewed = await reviewService.checkReviewStatus(
                req.user._id,
                productId,
                orderId
            );

            res.status(200).json({
                success: true,
                hasReviewed
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },
    
    checkUserCanReview: async (req, res) => {
        try {
            const { productId } = req.query;
            const result = await reviewService.checkUserCanReview(
                req.user._id,
                productId
            );

            res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },
    
    getUserProductReview: async (req, res) => {
        try {
            const { productId } = req.params;
            const review = await reviewService.getUserProductReview(
                req.user._id,
                productId
            );

            res.status(200).json({
                success: true,
                data: review
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
};

export default reviewController; 
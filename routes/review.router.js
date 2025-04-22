import { Router } from "express";
import reviewController from "../controllers/review.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const ReviewRouter = Router();

ReviewRouter.post('/create', authMiddleware.protect, reviewController.createReview);
ReviewRouter.get('/product/:productId', reviewController.getProductReviews);
ReviewRouter.put('/update/:id', authMiddleware.protect, reviewController.updateReview);
ReviewRouter.delete('/delete/:id', authMiddleware.protect, reviewController.deleteReview);
ReviewRouter.get('/check', authMiddleware.protect, reviewController.checkReviewStatus);
ReviewRouter.get('/user-can-review', authMiddleware.protect, reviewController.checkUserCanReview);
ReviewRouter.get('/user-product/:productId', authMiddleware.protect, reviewController.getUserProductReview);

export default ReviewRouter; 
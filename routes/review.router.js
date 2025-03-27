import { Router } from "express";
import reviewController from "../controllers/review.controller.js";

const ReviewRouter = Router();

ReviewRouter.post('/create', reviewController.createReview);
ReviewRouter.get('/product/:productId', reviewController.getProductReviews);
ReviewRouter.put('/update/:id', reviewController.updateReview);
ReviewRouter.delete('/delete/:id', reviewController.deleteReview);

export default ReviewRouter; 
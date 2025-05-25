import { Router } from "express";
import refundController from "../controllers/refund.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const RefundRouter = Router();

// Endpoint cho người dùng
RefundRouter.post('/request', authMiddleware.protect, refundController.createRefundRequest);
RefundRouter.get('/my-refunds', authMiddleware.protect, refundController.getUserRefunds);
RefundRouter.get('/details/:refundId', authMiddleware.protect, refundController.getRefundDetails);

// Endpoint cho admin
RefundRouter.get('/all', authMiddleware.protect, authMiddleware.restrictTo('Admin'), refundController.getAllRefunds);
RefundRouter.patch('/approve/:refundId', authMiddleware.protect, authMiddleware.restrictTo('Admin'), refundController.approveRefund);
RefundRouter.patch('/reject/:refundId', authMiddleware.protect, authMiddleware.restrictTo('Admin'), refundController.rejectRefund);

export default RefundRouter; 
import { Router } from "express";
import paymentController from "../controllers/payment.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const PaymentRouter = Router();

PaymentRouter.get('/vnpay-return', authMiddleware.protect, paymentController.vnpayReturn);

export default PaymentRouter; 
import { Router } from "express";
import paymentController from "../controllers/payment.controller.js";

const PaymentRouter = Router();

PaymentRouter.get('/vnpay-return', paymentController.vnpayReturn);

export default PaymentRouter; 
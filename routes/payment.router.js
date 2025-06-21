import express from 'express';
import paymentController from '../controllers/payment.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const PaymentRouter = express.Router();

PaymentRouter.get('/vnpay-return', paymentController.vnpayReturn);

PaymentRouter.get('/vnpay-ipn', paymentController.vnpayIPN);

PaymentRouter.post('/repay/:orderId', authMiddleware.protect, paymentController.repayVNPay);

export default PaymentRouter; 
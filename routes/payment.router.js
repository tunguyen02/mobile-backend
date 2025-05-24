import express from 'express';
import paymentController from '../controllers/payment.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const PaymentRouter = express.Router();

// Bỏ middleware xác thực để VNPay có thể chuyển hướng về đúng
PaymentRouter.get('/vnpay-return', paymentController.vnpayReturn);

// Thêm endpoint IPN cho VNPay (không cần xác thực vì VNPay gọi trực tiếp)
PaymentRouter.get('/vnpay-ipn', paymentController.vnpayIPN);

export default PaymentRouter; 
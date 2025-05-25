import { Router } from "express";
import orderController from "../controllers/order.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const OrderRouter = Router();

OrderRouter.get('/count', authMiddleware.protect, orderController.countOrders);
OrderRouter.get('/my-orders', authMiddleware.protect, orderController.getMyOrders);
OrderRouter.get('/details/:orderId', authMiddleware.protect, orderController.getOrderDetails);
OrderRouter.post('/create', authMiddleware.protect, orderController.createOrder);

// Endpoint công khai để lấy thông tin đơn hàng từ trang thành công
OrderRouter.get('/public/:orderId', orderController.getPublicOrderDetails);

// Endpoint để chuyển đổi phương thức thanh toán từ VNPay sang COD
OrderRouter.patch('/change-payment-method/:orderId', authMiddleware.protect, orderController.changePaymentMethod);

OrderRouter.get('/get-all', authMiddleware.protect, authMiddleware.restrictTo('Admin'), orderController.getAllOrders);
OrderRouter.patch('/change-status/:orderId', authMiddleware.protect, authMiddleware.restrictTo('Admin'), orderController.changeOrderStatus);
OrderRouter.delete('/delete/:orderId', authMiddleware.protect, authMiddleware.restrictTo('Admin'), orderController.deleteOrder);

// Thêm route cho người dùng hủy đơn hàng
OrderRouter.post('/cancel/:orderId', authMiddleware.protect, orderController.cancelOrder);

export default OrderRouter;
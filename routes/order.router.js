import { Router } from "express";
import orderController from "../controllers/order.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const OrderRouter = Router();

OrderRouter.get('/count', authMiddleware.protect, orderController.countOrders);
OrderRouter.get('/my-orders', authMiddleware.protect, orderController.getMyOrders);
OrderRouter.get('/details/:orderId', authMiddleware.protect, orderController.getOrderDetails);
OrderRouter.post('/create', authMiddleware.protect, orderController.createOrder);

OrderRouter.get('/get-all', authMiddleware.protect, authMiddleware.restrictTo('Admin'), orderController.getAllOrders);
OrderRouter.patch('/change-status/:orderId', authMiddleware.protect, authMiddleware.restrictTo('Admin'), orderController.changeOrderStatus);
OrderRouter.delete('/delete/:orderId', authMiddleware.protect, authMiddleware.restrictTo('Admin'), orderController.deleteOrder);

export default OrderRouter;
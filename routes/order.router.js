import { Router } from "express";
import orderController from "../controllers/order.controller.js";

const OrderRouter = Router();

OrderRouter.post('/create', orderController.createOrder);
OrderRouter.get('/count', orderController.countOrders);
OrderRouter.get('/get-all', orderController.getAllOrders);
OrderRouter.patch('/change-status/:orderId', orderController.changeOrderStatus);
OrderRouter.delete('/delete/:orderId', orderController.deleteOrder);
OrderRouter.get('/my-orders', orderController.getMyOrders);
OrderRouter.get('/details/:orderId', orderController.getOrderDetails);

export default OrderRouter;
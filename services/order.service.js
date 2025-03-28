import { sendCreateOrderEmail } from "../services/email.service.js";
import orderService from "../services/order.service.js";
import paymentService from "./payment.service.js";
import mongoose from "mongoose";
import cartService from "../services/cart.service.js";
import Order from "../models/order.model.js";

const orderController = {
    createOrder: async (req, res) => {
        const userId = req.user.id;
        const email = req.user.email;
        const { shippingInfo, paymentMethod } = req.body;

        if (!userId) {
            return res.status(401).json({
                message: "Account does not exist"
            });
        }
        try {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Lấy giỏ hàng hiện tại
                const cart = await cartService.getMyCart(userId);

                if (!cart || cart.products.length === 0) {
                    throw new Error("Cart is empty");
                }

                // Tạo đơn hàng mới
                const newOrder = new Order({
                    userId,
                    products: cart.products.map(item => ({
                        product: item.product._id,
                        quantity: item.quantity,
                        price: item.product.price
                    })),
                    shippingInfo,
                    shippingStatus: "Pending"
                });

                // Lưu đơn hàng mới
                await newOrder.save({ session });

                // Xóa giỏ hàng
                await cartService.clearCart(userId, session);

                // Khởi tạo thanh toán
                const paymentData = {
                    paymentMethod,
                    amountPaid: newOrder.totalPrice,
                    paymentStatus: paymentMethod === "COD" ? "Pending" : "Pending"
                };

                const payment = await paymentService.createPayment(newOrder._id, paymentData, session);

                await session.commitTransaction();
                await session.endSession();

                // Nếu thanh toán qua VNPay, tạo URL thanh toán
                let paymentUrl = null;
                if (paymentMethod === "VNPay") {
                    paymentUrl = await paymentService.createVNPayUrl(newOrder);
                }

                try {
                    await sendCreateOrderEmail(newOrder, email);
                }
                catch (error) {
                    console.log(error);
                }

                return res.status(200).json({
                    message: "Order created successfully",
                    paymentUrl: paymentUrl,
                    ...newOrder.toObject()
                });
            }
            catch (error) {
                await session.abortTransaction();
                await session.endSession();
                throw new Error(error.message);
            }
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Failed to create order",
                error: error.message
            });
        }
    },

    countOrders: async (req, res) => {
        try {
            const count = await orderService.countOrders();
            return res.status(200).json({
                count
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Failed to get the number of orders",
                error: error.message
            });
        }
    },
    getAllOrders: async (req, res) => {
        try {
            const data = await orderService.getAllOrders();

            return res.status(200).json({
                message: "Get all orders successfully",
                data
            })
        }
        catch (error) {
            return res.status(500).json({
                message: "Failed to get order information",
                error: error.message
            })
        }
    },
    getOrderDetails: async (req, res) => {
        const userId = req.user.id;
        const orderId = req.params.orderId;

        if (!userId) {
            return res.status(401).json({
                message: "Account does not exist"
            })
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Id of the order does not exist"
            })
        }

        try {
            const data = await orderService.getOrderDetails(userId, orderId);

            if (!data) {
                return res.status(404).json({
                    message: "Order not found"
                })
            }

            return res.status(200).json({
                message: "Get order details successfully",
                ...data
            })
        }
        catch (error) {
            return res.status(500).json({
                message: error.message
            })
        }
    },
    changeOrderStatus: async (req, res) => {
        const orderId = req.params.orderId;

        if (!orderId) {
            return res.status(400).json({
                message: "Id of the order does not exist"
            })
        }

        try {
            await orderService.changeOrderStatus(orderId, req.body);

            return res.status(200).json({
                message: "Change order status successfully"
            })
        }
        catch (error) {
            return res.status(500).json({
                message: error.message
            })
        }
    },
    deleteOrder: async (req, res) => {
        const orderId = req.params.orderId;
        if (!orderId) {
            return res.status(400).json({
                message: "Id of the order does not exist"
            })
        }

        try {
            await orderService.deleteOrder(orderId);

            return res.status(200).json({
                message: "Delete order successfully"
            })
        }
        catch (error) {
            return res.status(500).json({
                message: error.message
            })
        }
    },
    getMyOrders: async (req, res) => {
        const userId = req.user.id;
        if (!userId) {
            return res.status(401).json({
                message: "Account does not exist"
            })
        }

        try {
            const orders = await orderService.getMyOrders(userId);

            return res.status(200).json({
                message: "Get my orders successfully",
                orders
            })
        }
        catch (error) {
            return res.status(500).json({
                message: error.message
            })
        }
    },
}

export default orderController;

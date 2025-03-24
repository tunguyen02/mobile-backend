import { sendCreateOrderEmail } from "../services/email.service.js";
import orderService from "../services/order.service.js";

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
            const newData = await orderService.createOrder(userId, shippingInfo, paymentMethod);
            try {
                await sendCreateOrderEmail(newData.newOrder, email);
            }
            catch (error) {
                console.log(error);
            }
            if (paymentMethod === 'MoMo') {
                return res.status(200).json({
                    message: "Order created successfully, redirecting to MoMo payment",
                    paymentUrl: newData.paymentUrl,
                    ...newData
                });
            }

            return res.status(200).json({
                message: "Order created successfully",
                ...newData
            });
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

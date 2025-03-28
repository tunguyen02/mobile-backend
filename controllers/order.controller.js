import { sendCreateOrderEmail } from "../services/email.service.js";
import orderService from "../services/order.service.js";

const orderController = {
    createOrder: async (req, res) => {
        const userId = req.user.id;
        const email = req.user.email;
        const { shippingInfo, paymentMethod } = req.body;

        if (!userId) {
            return res.status(401).json({
                message: "Account not found"
            });
        }

        if (!['COD', 'VNPay'].includes(paymentMethod)) {
            return res.status(400).json({
                message: "Invalid payment method"
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

            if (paymentMethod === 'VNPay') {
                return res.status(200).json({
                    message: "Create order successfully, please pay with VNPay",
                    paymentUrl: newData.paymentUrl,
                    ...newData
                });
            }

            return res.status(200).json({
                message: "Create order successfully",
                ...newData
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Create order failed",
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
                message: "Count orders failed",
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
                message: 'Lấy thông tin các đơn hàng thất bại'
            })
        }
    },
    getOrderDetails: async (req, res) => {
        const userId = req.user.id;
        const orderId = req.params.orderId;

        if (!userId) {
            return res.status(401).json({
                message: "Account not found"
            })
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Id of order not found"
            })
        }

        try {
            const data = await orderService.getOrderDetails(userId, orderId);

            if (!data) {
                return res.status(404).json({
                    message: "Not found order"
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
                message: "Id of order not found"
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
                message: "Id of order not found"
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
                message: "Account not found"
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

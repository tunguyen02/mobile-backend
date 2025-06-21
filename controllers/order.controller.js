import { sendCreateOrderEmail } from "../services/email.service.js";
import orderService from "../services/order.service.js";
import refundService from "../services/refund.service.js";
import Refund from "../models/refund.model.js";

const orderController = {
    createOrder: async (req, res) => {
        const userId = req.user.id;
        const email = req.user.email;

        const { shippingInfo, paymentMethod, cartWithFlashSale } = req.body;

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
            const newData = await orderService.createOrder(userId, shippingInfo, paymentMethod, cartWithFlashSale);

            // Gửi email xác nhận đơn hàng
            try {
                console.log('Sending order confirmation email for order:', newData.newOrder._id);
                console.log('Order products:', JSON.stringify(newData.newOrder.products, null, 2));
                console.log('Customer email:', email);
                await sendCreateOrderEmail(newData.newOrder, email);
                console.log('Order confirmation email sent successfully');
            } catch (emailError) {
                console.error('Failed to send order confirmation email:', emailError);
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
            console.error('Create order error:', error);
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
                message: 'Lấy thông tin các đơn hàng thành công',
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
                message: 'Tài khoản không tồn tại'
            })
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Id của đơn hàng không tồn tại"
            })
        }

        try {
            const data = await orderService.getOrderDetails(userId, orderId);

            if (!data) {
                return res.status(404).json({
                    message: "Thông tin đơn hàng không tồn tại"
                })
            }

            return res.status(200).json({
                message: "Lấy thông tin đơn hàng thành công",
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
                message: "Id của đơn hàng không tồn tại"
            })
        }

        try {
            await orderService.changeOrderStatus(orderId, req.body);

            return res.status(200).json({
                message: "Cập nhật trạng thái đơn hàng thành công"
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
                message: "Id của đơn hàng không tồn tại"
            })
        }

        try {
            await orderService.deleteOrder(orderId);

            return res.status(200).json({
                message: "Xóa đơn hàng thành công"
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
                message: 'Tài khoản không tồn tại'
            })
        }

        try {
            const orders = await orderService.getMyOrders(userId);

            return res.status(200).json({
                message: "Lấy thông tin đơn hàng của tôi thành công",
                orders
            })
        }
        catch (error) {
            return res.status(500).json({
                message: error.message
            })
        }
    },
    getPublicOrderDetails: async (req, res) => {
        const orderId = req.params.orderId;

        if (!orderId) {
            return res.status(400).json({
                status: 'ERR',
                message: "Id của đơn hàng không tồn tại"
            });
        }

        try {
            const data = await orderService.getPublicOrderDetails(orderId);

            if (!data || !data.order) {
                return res.status(404).json({
                    status: 'ERR',
                    message: "Thông tin đơn hàng không tồn tại"
                });
            }

            return res.status(200).json({
                status: 'OK',
                message: "Lấy thông tin đơn hàng thành công",
                data
            });
        }
        catch (error) {
            console.error('Error getting public order details:', error);
            return res.status(500).json({
                status: 'ERR',
                message: error.message
            });
        }
    },
    changePaymentMethod: async (req, res) => {
        try {
            const { orderId } = req.params;
            const userId = req.user.id;
            const { paymentMethod } = req.body;

            if (!orderId) {
                return res.status(400).json({
                    status: 'ERR',
                    message: "Id của đơn hàng không tồn tại"
                });
            }

            if (!paymentMethod || !['COD'].includes(paymentMethod)) {
                return res.status(400).json({
                    status: 'ERR',
                    message: "Phương thức thanh toán không hợp lệ"
                });
            }

            // Kiểm tra đơn hàng có tồn tại và thuộc về người dùng không
            const orderDetails = await orderService.getOrderDetails(userId, orderId);
            if (!orderDetails || !orderDetails.order) {
                return res.status(404).json({
                    status: 'ERR',
                    message: "Không tìm thấy đơn hàng"
                });
            }

            // Kiểm tra đơn hàng có phải VNPay và đang ở trạng thái pending không
            if (orderDetails.payment?.paymentMethod !== 'VNPay' ||
                orderDetails.payment?.paymentStatus !== 'Pending') {
                return res.status(400).json({
                    status: 'ERR',
                    message: "Chỉ có thể chuyển đổi phương thức thanh toán cho đơn hàng VNPay chưa thanh toán"
                });
            }

            // Kiểm tra đơn hàng còn trong thời hạn 24h không
            const orderDate = new Date(orderDetails.order.createdAt);
            const expiryDate = new Date(orderDate.getTime() + 24 * 60 * 60 * 1000);
            const now = new Date();

            if (now > expiryDate) {
                return res.status(400).json({
                    status: 'ERR',
                    message: "Đơn hàng đã quá thời hạn 24h, không thể chuyển đổi phương thức thanh toán"
                });
            }

            // Cập nhật phương thức thanh toán
            const result = await orderService.changePaymentMethod(orderId, paymentMethod);

            return res.status(200).json({
                status: 'OK',
                message: "Chuyển đổi phương thức thanh toán thành công",
                data: result
            });
        } catch (error) {
            console.error('Error changing payment method:', error);
            return res.status(500).json({
                status: 'ERR',
                message: error.message
            });
        }
    },
    cancelOrder: async (req, res) => {
        const userId = req.user.id;
        const orderId = req.params.orderId;

        if (!userId) {
            return res.status(401).json({
                message: 'Tài khoản không tồn tại'
            })
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Id của đơn hàng không tồn tại"
            })
        }

        try {
            const result = await orderService.cancelOrderByUser(userId, orderId);

            // Kiểm tra nếu đơn hàng đã thanh toán qua VNPay, trả về thông tin hoàn tiền
            if (result.success) {
                // Tìm thông tin hoàn tiền nếu có
                const refundInfo = await Refund.findOne({ orderId }).lean();

                return res.status(200).json({
                    message: result.message,
                    success: result.success,
                    hasRefund: !!refundInfo,
                    refundInfo: refundInfo
                });
            } else {
                return res.status(200).json({
                    message: result.message,
                    success: result.success
                });
            }
        }
        catch (error) {
            return res.status(400).json({
                message: error.message,
                success: false
            })
        }
    }
}

export default orderController;

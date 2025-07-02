import paymentService from "../services/payment.service.js";
import orderService from "../services/order.service.js";

const paymentController = {
    vnpayReturn: async (req, res) => {
        const vnpParams = req.query;
        const orderIdFromRef = vnpParams['vnp_TxnRef'] ? vnpParams['vnp_TxnRef'].split('_')[0] : null;

        try {
            const result = await paymentService.processVNPayReturn(vnpParams);

            const redirectUrl = `${process.env.FRONTEND_URL}/order/details/${result.payment.orderId}`;

            if (result.success) {
                console.log('VNPay payment successful, redirecting to order details page');
                return res.redirect(redirectUrl);
            } else {
                console.log('VNPay payment not successful:', result.message);
                return res.redirect(redirectUrl);
            }
        } catch (error) {
            console.error("VNPay return error:", error);
            if (orderIdFromRef) {
                return res.redirect(`${process.env.FRONTEND_URL}/order/details/${orderIdFromRef}`);
            }
            return res.redirect(`${process.env.FRONTEND_URL}/`);
        }
    },

    vnpayIPN: async (req, res) => {
        try {
            const vnpParams = req.query;


            const result = await paymentService.processVNPayIPN(vnpParams);

            console.log('VNPay IPN response:', result);
            return res.status(200).json({
                RspCode: result.RspCode,
                Message: result.Message
            });
        } catch (error) {
            console.error("VNPay IPN error:", error);
            return res.status(500).json({
                RspCode: '99',
                Message: 'Unknown error'
            });
        }
    },

    repayVNPay: async (req, res) => {
        try {
            const { orderId } = req.params;
            const userId = req.user.id;

            if (!orderId) {
                return res.status(400).json({
                    message: "Mã đơn hàng không hợp lệ"
                });
            }

            const order = await orderService.getOrderDetails(userId, orderId);

            if (!order || !order.order) {
                return res.status(404).json({
                    message: "Không tìm thấy đơn hàng"
                });
            }

            if (order.payment?.paymentMethod !== 'VNPay' || order.payment?.paymentStatus === 'Completed') {
                return res.status(400).json({
                    message: "Đơn hàng không hợp lệ để thanh toán lại"
                });
            }

            const paymentUrl = await paymentService.createVNPayUrl(order.order);

            if (!paymentUrl) {
                return res.status(500).json({
                    message: "Không thể tạo URL thanh toán"
                });
            }

            return res.status(200).json({
                message: "Tạo URL thanh toán lại thành công",
                paymentUrl
            });
        } catch (error) {
            console.error("Lỗi khi tạo lại thanh toán:", error);
            return res.status(500).json({
                message: "Đã xảy ra lỗi khi tạo lại thanh toán",
                error: error.message
            });
        }
    }
};

export default paymentController; 
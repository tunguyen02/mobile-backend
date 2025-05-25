import paymentService from "../services/payment.service.js";
import orderService from "../services/order.service.js";

const paymentController = {
    vnpayReturn: async (req, res) => {
        try {
            const vnpParams = req.query;

            // Log thông tin tham số trả về từ VNPay để debug
            console.log('VNPay Return Parameters:', JSON.stringify(vnpParams, null, 2));
            console.log('VNPay Response Code:', vnpParams['vnp_ResponseCode']);
            console.log('VNPay Transaction No:', vnpParams['vnp_TransactionNo']);
            console.log('VNPay Transaction Reference:', vnpParams['vnp_TxnRef']);

            // Kiểm tra các mã lỗi đặc biệt từ VNPay
            if (vnpParams['vnp_ResponseCode'] === '97') {
                console.log('VNPay error 97: Invalid signature or transaction not found');
                return res.redirect(`${process.env.FRONTEND_URL}/order/failed?message=Giao%20dịch%20không%20hợp%20lệ`);
            }

            if (vnpParams['vnp_ResponseCode'] === '99') {
                console.log('VNPay error 99: Unknown error');
                return res.redirect(`${process.env.FRONTEND_URL}/order/failed?message=Lỗi%20không%20xác%20định`);
            }

            const result = await paymentService.processVNPayReturn(vnpParams);

            if (result.success) {
                // Redirect trực tiếp đến trang chi tiết đơn hàng thay vì trang thành công
                console.log('VNPay payment successful, redirecting to order details page');
                res.redirect(`${process.env.FRONTEND_URL}/order/details/${result.payment.orderId}`);
            } else {
                // Redirect về trang thất bại
                console.log('VNPay payment failed:', result.message);
                res.redirect(`${process.env.FRONTEND_URL}/order/failed?message=${encodeURIComponent(result.message)}`);
            }
        } catch (error) {
            console.error("VNPay return error:", error);
            res.redirect(`${process.env.FRONTEND_URL}/order/failed?message=${encodeURIComponent(error.message)}`);
        }
    },

    // Thêm endpoint IPN để VNPay gọi trực tiếp tới server
    vnpayIPN: async (req, res) => {
        try {
            const vnpParams = req.query;

            // Log thông tin IPN từ VNPay để debug
            console.log('VNPay IPN Parameters:', JSON.stringify(vnpParams, null, 2));
            console.log('VNPay IPN Response Code:', vnpParams['vnp_ResponseCode']);
            console.log('VNPay IPN Transaction No:', vnpParams['vnp_TransactionNo']);
            console.log('VNPay IPN Transaction Reference:', vnpParams['vnp_TxnRef']);

            const result = await paymentService.processVNPayIPN(vnpParams);

            // Trả về kết quả theo định dạng VNPay yêu cầu
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

    // Phương thức để thanh toán lại đơn hàng VNPay
    repayVNPay: async (req, res) => {
        try {
            const { orderId } = req.params;
            const userId = req.user.id;

            // Kiểm tra orderId hợp lệ
            if (!orderId) {
                return res.status(400).json({
                    message: "Mã đơn hàng không hợp lệ"
                });
            }

            // Kiểm tra đơn hàng tồn tại và thuộc về người dùng hiện tại
            const order = await orderService.getOrderDetails(userId, orderId);

            if (!order || !order.order) {
                return res.status(404).json({
                    message: "Không tìm thấy đơn hàng"
                });
            }

            // Kiểm tra đơn hàng sử dụng VNPay và chưa thanh toán
            if (order.payment?.paymentMethod !== 'VNPay' || order.payment?.paymentStatus === 'Completed') {
                return res.status(400).json({
                    message: "Đơn hàng không hợp lệ để thanh toán lại"
                });
            }

            // Tạo URL thanh toán mới
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
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
                // Trong môi trường thực tế, redirect về trang thành công của client
                console.log('VNPay payment successful, redirecting to success page');
                res.redirect(`${process.env.FRONTEND_URL}/order/success?orderId=${result.payment.orderId}`);
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
    }
};

export default paymentController; 
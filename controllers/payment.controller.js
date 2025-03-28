import paymentService from "../services/payment.service.js";
import orderService from "../services/order.service.js";

const paymentController = {
    vnpayReturn: async (req, res) => {
        try {
            const vnpParams = req.query;
            const result = await paymentService.processVNPayReturn(vnpParams);

            if (result.success) {
                // Trong môi trường thực tế, redirect về trang thành công của client
                res.redirect(`${process.env.FRONTEND_URL}/order/success?orderId=${result.payment.orderId}`);
            } else {
                // Redirect về trang thất bại
                res.redirect(`${process.env.FRONTEND_URL}/order/failed`);
            }
        } catch (error) {
            console.error("VNPay return error:", error);
            res.redirect(`${process.env.FRONTEND_URL}/order/failed`);
        }
    }
};

export default paymentController; 
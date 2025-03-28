import Payment from '../models/payment.model.js'
import vnpayService from './vnpay.service.js'

const paymentService = {
    createPayment: async (orderId, data, session) => {
        let { paymentMethod, amountPaid, transactionId, paymentStatus } = data;
        let paidAt = null;

        if (paymentStatus === "Completed") {
            paidAt = new Date();
        }

        const newPayment = new Payment({
            orderId,
            paymentMethod,
            amountPaid,
            transactionId,
            paymentStatus,
            paidAt
        });

        return await newPayment.save({ session });
    },

    createVNPayUrl: async (order) => {
        const orderInfo = `Thanh toan don hang #${order._id}`;
        const amount = order.totalPrice;

        return vnpayService.createPaymentUrl(order._id, amount, orderInfo);
    },

    processVNPayReturn: async (vnpParams) => {
        const result = vnpayService.verifyReturnUrl(vnpParams);

        if (result.success) {
            // Trích xuất orderId từ vnp_TxnRef (orderId-timestamp)
            const txnRef = vnpParams['vnp_TxnRef'];
            const orderId = txnRef.split('-')[0];

            // Cập nhật thanh toán thành công
            const payment = await Payment.findOneAndUpdate(
                { orderId: orderId },
                {
                    paymentStatus: 'Completed',
                    transactionId: vnpParams['vnp_TransactionNo'],
                    paymentDetails: vnpParams,
                    paidAt: new Date()
                },
                { new: true }
            );

            return {
                success: true,
                payment
            };
        }

        return {
            success: false,
            message: 'Payment verification failed'
        };
    }
}

export default paymentService;
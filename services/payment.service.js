import Payment from '../models/payment.model.js'
import vnpaySimpleService from './vnpay.simple.service.js'
import mongoose from 'mongoose'

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
        try {
            // Định dạng thông tin đơn hàng để gửi đến VNPay
            const orderInfo = `Thanh toan don hang ${order._id}`;
            const amount = Math.round(order.totalPrice); // Làm tròn số để tránh lỗi về số thập phân
            const ipAddr = '127.0.0.1'; // Trong môi trường thực tế lấy IP của người dùng
            const bankCode = 'NCB'; // Chỉ định ngân hàng NCB cho sandbox

            // Kiểm tra dữ liệu đầu vào
            if (!order._id) {
                console.error('Missing order ID for VNPay URL creation');
                throw new Error('Missing order ID');
            }

            if (!amount || amount <= 0) {
                console.error('Invalid amount for VNPay URL creation:', amount);
                throw new Error('Invalid amount');
            }

            // Thử lại tối đa 3 lần nếu có lỗi
            let paymentUrl = null;
            let attempts = 0;
            const maxAttempts = 3;

            while (!paymentUrl && attempts < maxAttempts) {
                try {
                    attempts++;
                    console.log(`VNPay URL creation attempt ${attempts}/${maxAttempts}`);
                    paymentUrl = vnpaySimpleService.createPaymentUrl(order._id, amount, orderInfo, ipAddr, bankCode);
                } catch (error) {
                    console.error(`Error in attempt ${attempts}:`, error);
                    if (attempts >= maxAttempts) {
                        throw error;
                    }
                    // Chờ 500ms trước khi thử lại
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // Kiểm tra URL được tạo
            if (!paymentUrl || !paymentUrl.includes('vnp_')) {
                console.error('Failed to generate valid VNPay URL');
                throw new Error('Invalid VNPay URL generated');
            }

            return paymentUrl;
        } catch (error) {
            console.error('Error creating VNPay URL:', error);
            throw new Error(`Failed to create VNPay URL: ${error.message}`);
        }
    },

    processVNPayReturn: async (vnpParams) => {
        const result = vnpaySimpleService.verifyReturnUrl(vnpParams);

        if (result.success) {
            // Trích xuất orderId từ vnp_TxnRef (orderId_timestamp)
            const txnRef = vnpParams['vnp_TxnRef'];
            const orderId = txnRef.split('_')[0];

            console.log('Processing VNPay return for order:', orderId);
            console.log('Transaction reference:', txnRef);

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

            if (!payment) {
                console.error('Payment not found for order ID:', orderId);
                return {
                    success: false,
                    message: 'Payment not found'
                };
            }

            return {
                success: true,
                payment
            };
        }

        return {
            success: false,
            message: 'Payment verification failed'
        };
    },

    // Thêm hàm xử lý IPN từ VNPay
    processVNPayIPN: async (vnpParams) => {
        const result = vnpaySimpleService.verifyIpnCall(vnpParams);

        if (result.success) {
            // Trích xuất orderId từ vnp_TxnRef (orderId_timestamp)
            const txnRef = vnpParams['vnp_TxnRef'];
            const orderId = txnRef.split('_')[0];

            console.log('Processing VNPay IPN for order:', orderId);
            console.log('Transaction reference:', txnRef);

            // Cập nhật thanh toán thành công
            const payment = await Payment.findOneAndUpdate(
                { orderId: orderId },
                {
                    paymentStatus: 'Completed',
                    transactionId: vnpParams['vnp_TransactionNo'],
                    paymentDetails: vnpParams,
                    paidAt: new Date()
                }
            );

            if (!payment) {
                console.error('Payment not found for order ID:', orderId);
                return {
                    RspCode: '01',
                    Message: 'Payment not found'
                };
            }
        }

        // Trả về kết quả theo định dạng VNPay yêu cầu
        return {
            RspCode: result.RspCode,
            Message: result.Message
        };
    }
}

export default paymentService;
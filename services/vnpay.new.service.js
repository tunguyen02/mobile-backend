import { VNPay, ProductCode, VnpLocale } from 'vnpay';
import dayjs, { formatVNPayDate } from '../config/dayjs.config.js';
import dotenv from 'dotenv';

dotenv.config();

// Khởi tạo đối tượng VNPay
const vnpay = new VNPay({
    tmnCode: process.env.VNPAY_TMN_CODE,
    secureSecret: process.env.VNPAY_HASH_SECRET,
    vnpayHost: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn',
    testMode: process.env.NODE_ENV !== 'production', // Sử dụng sandbox nếu không phải môi trường production
    hashAlgorithm: 'SHA512',
    enableLog: true,
});

const vnpayNewService = {
    /**
     * Tạo URL thanh toán VNPay
     * @param {string} orderId - Mã đơn hàng
     * @param {number} amount - Số tiền thanh toán (VND)
     * @param {string} orderInfo - Thông tin đơn hàng
     * @param {string} ipAddr - Địa chỉ IP của khách hàng
     * @returns {string} URL thanh toán VNPay
     */
    createPaymentUrl: (orderId, amount, orderInfo, ipAddr = '127.0.0.1') => {
        // Tạo ngày hết hạn (24 giờ sau khi tạo)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Tạo mã tham chiếu giao dịch duy nhất
        const txnRef = `${orderId}-${Date.now()}`;

        // Tạo URL thanh toán
        const paymentUrl = vnpay.buildPaymentUrl({
            vnp_Amount: amount, // Số tiền thanh toán (VND)
            vnp_IpAddr: ipAddr, // Địa chỉ IP của khách hàng
            vnp_TxnRef: txnRef, // Mã tham chiếu giao dịch
            vnp_OrderInfo: orderInfo, // Thông tin đơn hàng
            vnp_OrderType: ProductCode.Other, // Loại hàng hóa
            vnp_ReturnUrl: process.env.VNPAY_RETURN_URL, // URL trả về sau khi thanh toán
            vnp_Locale: VnpLocale.VN, // Ngôn ngữ
            vnp_CreateDate: formatVNPayDate(new Date()), // Thời gian tạo
            vnp_ExpireDate: formatVNPayDate(tomorrow), // Thời gian hết hạn
        });

        return paymentUrl;
    },

    /**
     * Xác thực URL trả về từ VNPay
     * @param {object} vnpParams - Các tham số trả về từ VNPay
     * @returns {object} Kết quả xác thực
     */
    verifyReturnUrl: (vnpParams) => {
        try {
            // Xác thực chữ ký
            const isValidSignature = vnpay.verifyReturnUrl(vnpParams);

            // Kiểm tra mã phản hồi
            const isSuccessTransaction = vnpParams['vnp_ResponseCode'] === '00';

            return {
                success: isValidSignature && isSuccessTransaction,
                message: isValidSignature
                    ? (isSuccessTransaction ? 'Thanh toán thành công' : 'Thanh toán thất bại')
                    : 'Chữ ký không hợp lệ',
                data: vnpParams
            };
        } catch (error) {
            console.error('Lỗi xác thực URL trả về:', error);
            return {
                success: false,
                message: 'Lỗi xác thực URL trả về',
                data: vnpParams,
                error: error.message
            };
        }
    },

    /**
     * Xác thực lời gọi IPN từ VNPay
     * @param {object} vnpParams - Các tham số IPN từ VNPay
     * @returns {object} Kết quả xác thực
     */
    verifyIpnCall: (vnpParams) => {
        try {
            // Xác thực chữ ký
            const isValidSignature = vnpay.verifyIpn(vnpParams);

            // Kiểm tra mã phản hồi
            const isSuccessTransaction = vnpParams['vnp_ResponseCode'] === '00';

            return {
                success: isValidSignature && isSuccessTransaction,
                message: isValidSignature
                    ? (isSuccessTransaction ? 'Thanh toán thành công' : 'Thanh toán thất bại')
                    : 'Chữ ký không hợp lệ',
                data: vnpParams,
                RspCode: isValidSignature ? '00' : '97',
                Message: isValidSignature ? 'Confirm Success' : 'Invalid Signature'
            };
        } catch (error) {
            console.error('Lỗi xác thực IPN:', error);
            return {
                success: false,
                message: 'Lỗi xác thực IPN',
                data: vnpParams,
                error: error.message,
                RspCode: '99',
                Message: 'Unknown error'
            };
        }
    },

    /**
     * Truy vấn kết quả giao dịch
     * @param {string} txnRef - Mã tham chiếu giao dịch
     * @param {Date} transactionDate - Ngày giao dịch
     * @returns {Promise<object>} Kết quả truy vấn
     */
    queryDr: async (txnRef, transactionDate) => {
        try {
            const result = await vnpay.queryDr({
                vnp_TxnRef: txnRef,
                vnp_TransactionDate: formatVNPayDate(transactionDate),
            });

            return result;
        } catch (error) {
            console.error('Lỗi truy vấn kết quả giao dịch:', error);
            throw error;
        }
    },

    /**
     * Hoàn tiền giao dịch
     * @param {string} txnRef - Mã tham chiếu giao dịch
     * @param {number} amount - Số tiền hoàn trả
     * @param {Date} transactionDate - Ngày giao dịch
     * @param {string} ipAddr - Địa chỉ IP của người thực hiện hoàn tiền
     * @returns {Promise<object>} Kết quả hoàn tiền
     */
    refund: async (txnRef, amount, transactionDate, ipAddr = '127.0.0.1') => {
        try {
            const result = await vnpay.refund({
                vnp_TxnRef: txnRef,
                vnp_Amount: amount,
                vnp_TransactionDate: formatVNPayDate(transactionDate),
                vnp_IpAddr: ipAddr,
                vnp_TransactionType: 2, // Hoàn tiền toàn phần
            });

            return result;
        } catch (error) {
            console.error('Lỗi hoàn tiền giao dịch:', error);
            throw error;
        }
    }
};

export default vnpayNewService; 
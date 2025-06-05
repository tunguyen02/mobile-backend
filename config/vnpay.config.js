// Cấu hình cho VNPay
export default {
    // Cấu hình chung
    tmnCode: process.env.VNPAY_TMN_CODE,
    hashSecret: process.env.VNPAY_HASH_SECRET,
    url: process.env.VNPAY_URL,
    returnUrl: process.env.VNPAY_RETURN_URL,
    ipnUrl: process.env.VNPAY_IPN_URL,

    // Phiên bản và các tham số cố định
    version: '2.1.0',
    command: 'pay',
    currCode: 'VND',
    locale: {
        vn: 'vn',
        en: 'en'
    },

    // Danh sách mã lỗi
    responseCode: {
        success: '00',            // Giao dịch thành công
        invalidSignature: '97',   // Chữ ký không hợp lệ
        unknownError: '99',       // Lỗi không xác định
        transactionTimeout: '15'  // Giao dịch hết hạn
    },

    // Các ngân hàng hỗ trợ
    bankCode: {
        NCB: 'NCB',               // Ngân hàng Quốc Dân (mặc định cho sandbox)
        VNPAYQR: 'VNPAYQR',       // Thanh toán qua QR Code
        VNBANK: 'VNBANK',         // Thẻ ATM/Tài khoản nội địa
        INTCARD: 'INTCARD'        // Thẻ quốc tế
    }
}; 
import crypto from 'crypto';
import querystring from 'querystring';
import moment from 'moment';

const vnpayService = {
    createPaymentUrl: (orderId, amount, orderInfo) => {
        const date = new Date();
        const createDate = moment(date).format('YYYYMMDDHHmmss');

        const ipAddr = '127.0.0.1'; // Trong môi trường thực tế, lấy IP của người dùng

        const tmnCode = process.env.VNPAY_TMN_CODE;
        const secretKey = process.env.VNPAY_HASH_SECRET;
        const returnUrl = process.env.VNPAY_RETURN_URL;
        const vnpUrl = process.env.VNPAY_URL;

        const locale = 'vn';
        const currCode = 'VND';

        let vnpParams = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Locale: locale,
            vnp_CurrCode: currCode,
            vnp_TxnRef: `${orderId}-${Date.now()}`, // Mã đơn hàng kết hợp timestamp để tránh trùng lặp
            vnp_OrderInfo: orderInfo,
            vnp_OrderType: 'billpayment',
            vnp_Amount: amount * 100, // VNPay yêu cầu nhân với 100
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: createDate
        };

        // Sắp xếp tham số theo thứ tự a-z
        vnpParams = sortObject(vnpParams);

        // Tạo chuỗi hash data
        const signData = querystring.stringify(vnpParams, { encode: false });
        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        vnpParams['vnp_SecureHash'] = signed;

        const paymentUrl = vnpUrl + '?' + querystring.stringify(vnpParams, { encode: false });

        return paymentUrl;
    },

    verifyReturnUrl: (vnpParams) => {
        // Lấy thông tin từ VNPay trả về
        const secureHash = vnpParams['vnp_SecureHash'];

        // Xóa tham số hash để tạo chuỗi hash mới
        delete vnpParams['vnp_SecureHash'];
        delete vnpParams['vnp_SecureHashType'];

        // Sắp xếp tham số theo thứ tự a-z
        vnpParams = sortObject(vnpParams);

        // Tạo chuỗi hash data
        const secretKey = process.env.VNPAY_HASH_SECRET;
        const signData = querystring.stringify(vnpParams, { encode: false });
        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        // So sánh hai chuỗi hash
        const paymentSuccess = secureHash === signed && vnpParams['vnp_ResponseCode'] === '00';

        return {
            success: paymentSuccess,
            message: paymentSuccess ? 'Payment successful' : 'Payment failed',
            data: vnpParams
        };
    }
};

// Hàm hỗ trợ sắp xếp các tham số theo thứ tự a-z
function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;

    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(key);
        }
    }

    str.sort();

    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = obj[str[key]];
    }

    return sorted;
}

export default vnpayService; 
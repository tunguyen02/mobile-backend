import crypto from 'crypto';
import querystring from 'querystring';
import dotenv from 'dotenv';
import vnpayConfig from '../config/vnpay.config.js';

dotenv.config();

const VNP_VERSION = vnpayConfig.version;
const VNP_COMMAND = vnpayConfig.command;
const VNP_CURR_CODE = vnpayConfig.currCode;
const VNP_LOCALE = vnpayConfig.locale;

const formatDate = (date) => {
    const d = new Date(date);

    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const vietnamTime = new Date(utc + (3600000 * 7));

    const year = vietnamTime.getFullYear();
    const month = String(vietnamTime.getMonth() + 1).padStart(2, '0');
    const day = String(vietnamTime.getDate()).padStart(2, '0');
    const hours = String(vietnamTime.getHours()).padStart(2, '0');
    const minutes = String(vietnamTime.getMinutes()).padStart(2, '0');
    const seconds = String(vietnamTime.getSeconds()).padStart(2, '0');

    const formattedDate = `${year}${month}${day}${hours}${minutes}${seconds}`;
    console.log('Formatted date for VNPay:', formattedDate);
    return formattedDate;
};

const sortObject = (obj) => {
    const sorted = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
        if (obj[key] !== '' && obj[key] !== null && obj[key] !== undefined) {
            let value = obj[key];
            if (typeof value === 'object') {
                value = JSON.stringify(value);
            }

            if (key === 'vnp_OrderInfo' && typeof value === 'string') {
                sorted[key] = value.replace(/ /g, '+');
            } else {
                sorted[key] = value;
            }
        }
    }

    return sorted;
};

const removeAccent = (str) => {
    if (!str) return '';
    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
    str = str.replace(/đ/g, 'd');
    str = str.replace(/[^a-z0-9\s]/g, '');
    str = str.replace(/\s+/g, '+');
    return str;
};

// Hàm tạo chữ ký cho VNPay
const createSecureHash = (params, secretKey) => {
    const sortedParams = {};
    Object.keys(params)
        .sort()
        .forEach(key => {
            if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType' && params[key] !== undefined) {
                sortedParams[key] = params[key];
            }
        });

    const signData = new URLSearchParams(sortedParams).toString();

    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return signed;
};

const vnpaySimpleService = {
    /**
     * Tạo URL thanh toán VNPay
     * @param {string} orderId - Mã đơn hàng
     * @param {number} amount - Số tiền thanh toán (VND)
     * @param {string} orderInfo - Thông tin đơn hàng
     * @param {string} ipAddr - Địa chỉ IP của khách hàng
     * @param {string} bankCode - Mã ngân hàng trực tiếp
     * @returns {string} URL thanh toán VNPay
     */
    createPaymentUrl: (orderId, amount, orderInfo, ipAddr = '127.0.0.1', bankCode = 'NCB') => {
        if (!process.env.VNPAY_HASH_SECRET) {
            throw new Error('VNPAY_HASH_SECRET chưa được cấu hình trong .env');
        }

        const tmnCode = process.env.VNPAY_TMN_CODE;
        const secretKey = process.env.VNPAY_HASH_SECRET;
        const vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        const returnUrl = process.env.VNPAY_RETURN_URL;

        const createDate = formatDate(new Date());
        const expireDate = formatDate(new Date(Date.now() + 15 * 60 * 1000));

        // Tạo mã tham chiếu giao dịch duy nhất
        const txnRef = `${orderId}_${new Date().getTime()}`;

        const sanitizedOrderInfo = removeAccent(orderInfo);

        const vnpParams = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Amount: Math.floor(amount) * 100,
            vnp_CurrCode: 'VND',
            vnp_TxnRef: txnRef,
            vnp_OrderInfo: sanitizedOrderInfo,
            vnp_OrderType: 'other',
            vnp_Locale: 'vn',
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: createDate,
            vnp_ExpireDate: expireDate,
            vnp_BankCode: bankCode
        };


        const secureHash = createSecureHash(vnpParams, secretKey);

        const finalParams = { ...vnpParams, vnp_SecureHash: secureHash };
        const paymentUrl = `${vnpUrl}?${new URLSearchParams(finalParams).toString()}`;
        return paymentUrl;
    },

    /**
     * Xác thực URL trả về từ VNPay
     * @param {object} vnpParams - Các tham số trả về từ VNPay
     * @returns {object} Kết quả xác thực
     */
    verifyReturnUrl: (vnpParams) => {
        try {
            const secretKey = process.env.VNPAY_HASH_SECRET;

            const secureHash = vnpParams['vnp_SecureHash'];

            const cloneParams = { ...vnpParams };
            delete cloneParams['vnp_SecureHash'];
            delete cloneParams['vnp_SecureHashType'];

            const signed = createSecureHash(cloneParams, secretKey);

            const isValidSignature = secureHash === signed;
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
            const secretKey = process.env.VNPAY_HASH_SECRET;

            const secureHash = vnpParams['vnp_SecureHash'];

            const cloneParams = { ...vnpParams };
            delete cloneParams['vnp_SecureHash'];
            delete cloneParams['vnp_SecureHashType'];

            const signed = createSecureHash(cloneParams, secretKey);

            const isValidSignature = secureHash === signed;
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
    }
};

export default vnpaySimpleService; 
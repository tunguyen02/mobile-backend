import crypto from 'crypto';
import querystring from 'querystring';
import dotenv from 'dotenv';
import vnpayConfig from '../config/vnpay.config.js';

dotenv.config();

// Sử dụng các hằng số từ cấu hình
const VNP_VERSION = vnpayConfig.version;
const VNP_COMMAND = vnpayConfig.command;
const VNP_CURR_CODE = vnpayConfig.currCode;
const VNP_LOCALE = vnpayConfig.locale;

// Hàm định dạng ngày tháng theo yêu cầu của VNPay
const formatDate = (date) => {
    // Đảm bảo date là đối tượng Date
    const d = new Date(date);

    // Điều chỉnh timezone để đảm bảo giờ Việt Nam (UTC+7)
    // VNPay yêu cầu thời gian theo giờ Việt Nam
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const vietnamTime = new Date(utc + (3600000 * 7)); // UTC+7 (Vietnam timezone)

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

// Hàm sắp xếp các tham số theo thứ tự a-z
const sortObject = (obj) => {
    const sorted = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
        if (obj[key] !== '' && obj[key] !== null && obj[key] !== undefined) {
            // Đảm bảo tất cả các giá trị đều là chuỗi
            let value = obj[key];
            if (typeof value === 'object') {
                value = JSON.stringify(value);
            }

            // Chỉ chuyển đổi khoảng trắng thành dấu + trong orderInfo
            if (key === 'vnp_OrderInfo' && typeof value === 'string') {
                sorted[key] = value.replace(/ /g, '+');
            } else {
                sorted[key] = value;
            }
        }
    }

    return sorted;
};

// Hàm loại bỏ dấu tiếng Việt và ký tự đặc biệt
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
    // Loại bỏ ký tự đặc biệt
    str = str.replace(/[^a-z0-9\s]/g, '');
    // Thay thế khoảng trắng thành dấu +
    str = str.replace(/\s+/g, '+');
    return str;
};

// Hàm tạo chữ ký cho VNPay
const createSecureHash = (params, secretKey) => {
    // 1. Sắp xếp tham số theo thứ tự A-Z (bỏ qua các trường hash)
    const sortedParams = {};
    Object.keys(params)
        .sort()
        .forEach(key => {
            if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType' && params[key] !== undefined) {
                sortedParams[key] = params[key];
            }
        });

    // 2. Tạo chuỗi query string (không encode)
    const signData = new URLSearchParams(sortedParams).toString();

    // 3. Tạo chữ ký SHA512
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    console.log('Chuỗi ký tự để hash:', signData); // Log để debug
    console.log('Chữ ký tạo ra:', signed); // Log để debug

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
        // Validate input
        if (!process.env.VNPAY_HASH_SECRET) {
            throw new Error('VNPAY_HASH_SECRET chưa được cấu hình trong .env');
        }

        // 1. Chuẩn bị tham số
        const tmnCode = process.env.VNPAY_TMN_CODE;
        const secretKey = process.env.VNPAY_HASH_SECRET;
        const vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        const returnUrl = process.env.VNPAY_RETURN_URL;

        // Tạo ngày hiện tại
        const createDate = formatDate(new Date());

        // Tạo ngày hết hạn (15 phút sau)
        const expireDate = formatDate(new Date(Date.now() + 15 * 60 * 1000));
        console.log('Create Date:', createDate);
        console.log('Expire Date:', expireDate);

        // Tạo mã tham chiếu giao dịch duy nhất
        const txnRef = `${orderId}_${new Date().getTime()}`;

        // Chuẩn hóa orderInfo theo yêu cầu của VNPay
        const sanitizedOrderInfo = removeAccent(orderInfo);
        console.log('Sanitized Order Info:', sanitizedOrderInfo);

        // Tạo các tham số cho URL thanh toán
        const vnpParams = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Amount: Math.floor(amount) * 100, // Nhân 100 và làm tròn
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

        // 2. Log toàn bộ tham số để debug
        console.log('VNPay Parameters:');
        for (const key in vnpParams) {
            console.log(`- ${key}: ${vnpParams[key]}`);
        }

        // Kiểm tra đặc biệt cho số tiền
        console.log(`Original amount: ${amount}`);
        console.log(`VNPay amount (after * 100): ${vnpParams.vnp_Amount}`);

        // 3. Tạo chữ ký
        const secureHash = createSecureHash(vnpParams, secretKey);
        console.log('Secret Key (masked):', secretKey ? '*****' + secretKey.slice(-4) : 'Missing');
        console.log('Calculated signature:', secureHash);

        // 4. Tạo URL
        const finalParams = { ...vnpParams, vnp_SecureHash: secureHash };
        const paymentUrl = `${vnpUrl}?${new URLSearchParams(finalParams).toString()}`;

        // Log URL thanh toán để debug
        console.log('Generated VNPay URL:', paymentUrl);
        console.log('VNPay Transaction Reference:', txnRef);
        console.log('VNPay Secure Hash:', secureHash);

        return paymentUrl;
    },

    /**
     * Xác thực URL trả về từ VNPay
     * @param {object} vnpParams - Các tham số trả về từ VNPay
     * @returns {object} Kết quả xác thực
     */
    verifyReturnUrl: (vnpParams) => {
        try {
            // Lấy thông tin cấu hình từ biến môi trường
            const secretKey = process.env.VNPAY_HASH_SECRET;

            // Log thông tin nhận được từ VNPay để debug
            console.log('VNPay Return Parameters:', JSON.stringify(vnpParams, null, 2));

            // Lấy chữ ký từ tham số
            const secureHash = vnpParams['vnp_SecureHash'];

            // Xóa tham số chữ ký để tạo chuỗi hash mới
            const cloneParams = { ...vnpParams };
            delete cloneParams['vnp_SecureHash'];
            delete cloneParams['vnp_SecureHashType'];

            // Tạo chữ ký sử dụng hàm createSecureHash
            const signed = createSecureHash(cloneParams, secretKey);

            console.log('Expected hash:', signed);
            console.log('Received hash:', secureHash);

            // So sánh hai chuỗi hash
            const isValidSignature = secureHash === signed;
            const isSuccessTransaction = vnpParams['vnp_ResponseCode'] === '00';

            console.log('Signature valid:', isValidSignature);
            console.log('Transaction success:', isSuccessTransaction);

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
            // Lấy thông tin cấu hình từ biến môi trường
            const secretKey = process.env.VNPAY_HASH_SECRET;

            // Log thông tin IPN từ VNPay để debug
            console.log('VNPay IPN Parameters:', JSON.stringify(vnpParams, null, 2));

            // Lấy chữ ký từ tham số
            const secureHash = vnpParams['vnp_SecureHash'];

            // Xóa tham số chữ ký để tạo chuỗi hash mới
            const cloneParams = { ...vnpParams };
            delete cloneParams['vnp_SecureHash'];
            delete cloneParams['vnp_SecureHashType'];

            // Tạo chữ ký sử dụng hàm createSecureHash
            const signed = createSecureHash(cloneParams, secretKey);

            console.log('Expected IPN hash:', signed);
            console.log('Received IPN hash:', secureHash);

            // So sánh hai chuỗi hash
            const isValidSignature = secureHash === signed;
            const isSuccessTransaction = vnpParams['vnp_ResponseCode'] === '00';

            console.log('IPN Signature valid:', isValidSignature);
            console.log('IPN Transaction success:', isSuccessTransaction);

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
import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Payment from "../models/payment.model.js";
import Refund from "../models/refund.model.js";
import crypto from "crypto";
import axios from "axios";
import qs from "qs";
import dayjs from "dayjs";

const refundService = {
    // Tạo yêu cầu hoàn tiền
    createRefundRequest: async (orderId, userId, reason) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Kiểm tra đơn hàng tồn tại và thuộc về người dùng
            const order = await Order.findById(orderId);
            if (!order) {
                throw new Error("Đơn hàng không tồn tại");
            }

            if (order.userId.toString() !== userId) {
                throw new Error("Bạn không có quyền yêu cầu hoàn tiền cho đơn hàng này");
            }

            // Kiểm tra thanh toán
            const payment = await Payment.findOne({ orderId });
            if (!payment) {
                throw new Error("Không tìm thấy thông tin thanh toán");
            }

            // Chỉ hoàn tiền cho đơn hàng VNPay đã thanh toán
            if (payment.paymentMethod !== "VNPay" || payment.paymentStatus !== "Completed") {
                throw new Error("Chỉ hỗ trợ hoàn tiền cho đơn hàng đã thanh toán qua VNPay");
            }

            // Kiểm tra trạng thái đơn hàng (chỉ hoàn tiền cho đơn hàng bị hủy)
            if (order.shippingStatus !== "Cancelled") {
                throw new Error("Chỉ hỗ trợ hoàn tiền cho đơn hàng đã hủy");
            }

            // Kiểm tra xem đã có yêu cầu hoàn tiền chưa
            const existingRefund = await Refund.findOne({ orderId });
            if (existingRefund) {
                throw new Error("Đã tồn tại yêu cầu hoàn tiền cho đơn hàng này");
            }

            // Tạo yêu cầu hoàn tiền mới
            const refund = new Refund({
                orderId,
                paymentId: payment._id,
                amount: payment.amountPaid,
                reason,
                status: "Pending",
            });

            // Cập nhật trạng thái thanh toán
            payment.paymentStatus = "Refund_Pending";

            // Lưu thông tin
            await refund.save({ session });
            await payment.save({ session });

            await session.commitTransaction();
            session.endSession();

            return refund;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    },

    // Lấy danh sách yêu cầu hoàn tiền
    getRefunds: async (filters = {}) => {
        try {
            const query = { ...filters };
            const refunds = await Refund.find(query)
                .populate("orderId", "userId shippingInfo.name")
                .populate("paymentId", "paymentMethod amountPaid paymentStatus")
                .sort({ createdAt: -1 });

            return refunds;
        } catch (error) {
            throw new Error(`Lỗi khi lấy danh sách hoàn tiền: ${error.message}`);
        }
    },

    // Lấy chi tiết yêu cầu hoàn tiền
    getRefundDetails: async (refundId) => {
        try {
            const refund = await Refund.findById(refundId)
                .populate("orderId")
                .populate("paymentId");

            if (!refund) {
                throw new Error("Không tìm thấy yêu cầu hoàn tiền");
            }

            return refund;
        } catch (error) {
            throw new Error(`Lỗi khi lấy chi tiết hoàn tiền: ${error.message}`);
        }
    },

    // Admin phê duyệt yêu cầu hoàn tiền
    approveRefund: async (refundId, adminNote) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const refund = await Refund.findById(refundId);
            if (!refund) {
                throw new Error("Không tìm thấy yêu cầu hoàn tiền");
            }

            if (refund.status !== "Pending") {
                throw new Error("Yêu cầu hoàn tiền đã được xử lý");
            }

            // Cập nhật trạng thái
            refund.status = "Approved";
            refund.adminNote = adminNote;

            await refund.save({ session });

            // Xử lý hoàn tiền với VNPay (trong thực tế sẽ gọi API VNPay)
            const result = await processVNPayRefund(refund);

            if (result.success) {
                // Cập nhật thông tin hoàn tiền
                refund.status = "Processed";
                refund.processedAt = new Date();
                refund.transactionRef = result.transactionRef;

                // Cập nhật payment
                const payment = await Payment.findById(refund.paymentId);
                payment.paymentStatus = "Refunded";
                payment.refundInfo = {
                    refundAt: new Date(),
                    refundAmount: refund.amount,
                    refundTransactionId: result.transactionRef,
                    refundNote: adminNote
                };

                await payment.save({ session });
            } else {
                // Nếu xử lý hoàn tiền thất bại
                refund.status = "Failed";
                refund.adminNote = `${adminNote} | Lỗi xử lý: ${result.message}`;

                // Cập nhật payment
                const payment = await Payment.findById(refund.paymentId);
                payment.paymentStatus = "Refund_Failed";

                await payment.save({ session });
            }

            await refund.save({ session });

            await session.commitTransaction();
            session.endSession();

            return refund;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    },

    // Admin từ chối yêu cầu hoàn tiền
    rejectRefund: async (refundId, reason) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const refund = await Refund.findById(refundId);
            if (!refund) {
                throw new Error("Không tìm thấy yêu cầu hoàn tiền");
            }

            if (refund.status !== "Pending") {
                throw new Error("Yêu cầu hoàn tiền đã được xử lý");
            }

            // Cập nhật trạng thái
            refund.status = "Rejected";
            refund.adminNote = reason;

            // Cập nhật payment
            const payment = await Payment.findById(refund.paymentId);
            payment.paymentStatus = "Completed"; // Chuyển về trạng thái đã thanh toán

            await refund.save({ session });
            await payment.save({ session });

            await session.commitTransaction();
            session.endSession();

            return refund;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    },

    // Tự động tạo yêu cầu hoàn tiền khi hủy đơn hàng đã thanh toán
    createRefundOnOrderCancel: async (orderId, payment, session) => {
        try {
            // Kiểm tra xem đã có yêu cầu hoàn tiền chưa
            const existingRefund = await Refund.findOne({ orderId });
            if (existingRefund) {
                return { success: false, message: "Đã tồn tại yêu cầu hoàn tiền" };
            }

            // Tạo yêu cầu hoàn tiền mới
            const refund = new Refund({
                orderId,
                paymentId: payment._id,
                amount: payment.amountPaid,
                reason: "Người dùng hủy đơn hàng",
                status: "Pending"
            });

            // Cập nhật trạng thái thanh toán
            payment.paymentStatus = "Refund_Pending";

            // Lưu thông tin
            await refund.save({ session });
            await payment.save({ session });

            return { success: true, refund };
        } catch (error) {
            console.error("Lỗi khi tạo yêu cầu hoàn tiền tự động:", error);
            throw error;
        }
    }
};

// Hàm giả lập gọi API VNPay để hoàn tiền
// Trong thực tế, cần triển khai theo tài liệu API của VNPay
async function processVNPayRefund(refund) {
    try {
        // Giả lập xử lý hoàn tiền thành công
        // Trong thực tế, cần gọi API VNPay để hoàn tiền
        const transactionRef = `RF${Date.now()}${Math.floor(Math.random() * 1000)}`;

        return {
            success: true,
            transactionRef,
            message: "Hoàn tiền thành công"
        };

        /* 
        // Code mẫu để tích hợp với VNPay (cần điều chỉnh theo tài liệu API của VNPay)
        const payment = await Payment.findById(refund.paymentId).populate("orderId");
        const order = payment.orderId;
        
        // Chuẩn bị dữ liệu hoàn tiền
        const vnpParams = {
          vnp_Version: '2.1.0',
          vnp_Command: 'refund',
          vnp_TmnCode: process.env.VNPAY_TMN_CODE,
          vnp_TransactionType: '02', // Hoàn tiền
          vnp_TxnRef: payment.transactionId, // Mã giao dịch gốc
          vnp_Amount: refund.amount * 100, // Số tiền * 100
          vnp_OrderInfo: `Hoàn tiền cho đơn hàng ${order._id}`,
          vnp_TransactionDate: dayjs(payment.paidAt).format('YYYYMMDDHHmmss'),
          vnp_CreateDate: dayjs().format('YYYYMMDDHHmmss'),
          vnp_IpAddr: '127.0.0.1',
          vnp_CreateBy: 'Admin'
        };
        
        // Tạo chữ ký
        const secureHash = createSignature(vnpParams);
        vnpParams.vnp_SecureHash = secureHash;
        
        // Gọi API VNPay
        const result = await axios.post(
          'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
          qs.stringify(vnpParams)
        );
        
        if (result.data.vnp_ResponseCode === '00') {
          return {
            success: true,
            transactionRef: result.data.vnp_TransactionNo,
            message: "Hoàn tiền thành công"
          };
        } else {
          return {
            success: false,
            message: `Lỗi từ VNPay: ${result.data.vnp_Message}`
          };
        }
        */
    } catch (error) {
        console.error("Lỗi khi xử lý hoàn tiền:", error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Hàm tạo chữ ký cho VNPay
function createSignature(vnpParams) {
    const secretKey = process.env.VNPAY_HASH_SECRET;
    const signData = Object.keys(vnpParams)
        .sort()
        .map(key => `${key}=${vnpParams[key]}`)
        .join('&');

    return crypto
        .createHmac('sha512', secretKey)
        .update(signData)
        .digest('hex');
}

export default refundService; 
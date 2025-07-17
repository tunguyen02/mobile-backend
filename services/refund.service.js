import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Payment from "../models/payment.model.js";
import Refund from "../models/refund.model.js";
import crypto from "crypto";
import axios from "axios";
import qs from "qs";
import dayjs from "dayjs";

const refundService = {
    createRefundRequest: async (orderId, userId, reason) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.findById(orderId);
            if (!order) {
                throw new Error("Đơn hàng không tồn tại");
            }

            if (order.userId.toString() !== userId) {
                throw new Error("Bạn không có quyền yêu cầu hoàn tiền cho đơn hàng này");
            }

            const payment = await Payment.findOne({ orderId });
            if (!payment) {
                throw new Error("Không tìm thấy thông tin thanh toán");
            }

            if (payment.paymentMethod !== "VNPay" || payment.paymentStatus !== "Completed") {
                throw new Error("Chỉ hỗ trợ hoàn tiền cho đơn hàng đã thanh toán qua VNPay");
            }

            if (order.shippingStatus !== "Cancelled") {
                throw new Error("Chỉ hỗ trợ hoàn tiền cho đơn hàng đã hủy");
            }

            const existingRefund = await Refund.findOne({ orderId });
            if (existingRefund) {
                throw new Error("Đã tồn tại yêu cầu hoàn tiền cho đơn hàng này");
            }

            const refund = new Refund({
                orderId,
                paymentId: payment._id,
                amount: payment.amountPaid,
                reason,
                status: "Pending",
            });

            payment.paymentStatus = "Refund_Pending";

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

            refund.status = "Approved";
            refund.adminNote = adminNote;

            await refund.save({ session });

            const result = await processVNPayRefund(refund);

            if (result.success) {
                refund.status = "Processed";
                refund.processedAt = new Date();
                refund.transactionRef = result.transactionRef;

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
                refund.status = "Failed";
                refund.adminNote = `${adminNote} | Lỗi xử lý: ${result.message}`;

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

            refund.status = "Rejected";
            refund.adminNote = reason;

            const payment = await Payment.findById(refund.paymentId);
            payment.paymentStatus = "Completed";

            const order = await Order.findById(refund.orderId);
            if (order && order.shippingStatus === "Cancelled") {
                order.shippingStatus = "Processing";
                await order.save({ session });
            }

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

    createRefundOnOrderCancel: async (orderId, payment, session) => {
        try {
            const existingRefund = await Refund.findOne({ orderId });
            if (existingRefund) {
                return { success: false, message: "Đã tồn tại yêu cầu hoàn tiền" };
            }

            const refund = new Refund({
                orderId,
                paymentId: payment._id,
                amount: payment.amountPaid,
                reason: "Người dùng hủy đơn hàng",
                status: "Pending"
            });

            payment.paymentStatus = "Refund_Pending";

            await refund.save({ session });
            await payment.save({ session });

            return { success: true, refund };
        } catch (error) {
            console.error("Lỗi khi tạo yêu cầu hoàn tiền tự động:", error);
            throw error;
        }
    }
};


async function processVNPayRefund(refund) {
    try {
        const transactionRef = `RF${Date.now()}${Math.floor(Math.random() * 1000)}`;

        return {
            success: true,
            transactionRef,
            message: "Hoàn tiền thành công"
        };

    } catch (error) {
        console.error("Lỗi khi xử lý hoàn tiền:", error);
        return {
            success: false,
            message: error.message
        };
    }
}
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
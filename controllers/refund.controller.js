import refundService from "../services/refund.service.js";
import Order from "../models/order.model.js";

const refundController = {
    // Người dùng tạo yêu cầu hoàn tiền
    createRefundRequest: async (req, res) => {
        try {
            const { orderId, reason } = req.body;
            const userId = req.user.id;

            if (!orderId) {
                return res.status(400).json({
                    message: "Vui lòng cung cấp mã đơn hàng"
                });
            }

            if (!reason) {
                return res.status(400).json({
                    message: "Vui lòng cung cấp lý do hoàn tiền"
                });
            }

            const refund = await refundService.createRefundRequest(orderId, userId, reason);

            return res.status(200).json({
                success: true,
                message: "Đã tạo yêu cầu hoàn tiền thành công",
                refund
            });
        } catch (error) {
            console.error("Lỗi khi tạo yêu cầu hoàn tiền:", error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // Người dùng xem các yêu cầu hoàn tiền của họ
    getUserRefunds: async (req, res) => {
        try {
            const userId = req.user.id;

            // Lấy danh sách đơn hàng của người dùng
            const userOrders = await Order.find({ userId }).select("_id");
            const orderIds = userOrders.map(order => order._id);

            // Lấy danh sách yêu cầu hoàn tiền dựa trên đơn hàng
            const refunds = await refundService.getRefunds({ orderId: { $in: orderIds } });

            return res.status(200).json({
                success: true,
                refunds
            });
        } catch (error) {
            console.error("Lỗi khi lấy danh sách hoàn tiền của người dùng:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Admin lấy tất cả yêu cầu hoàn tiền
    getAllRefunds: async (req, res) => {
        try {
            const refunds = await refundService.getRefunds();

            return res.status(200).json({
                success: true,
                refunds
            });
        } catch (error) {
            console.error("Lỗi khi lấy danh sách hoàn tiền:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Xem chi tiết yêu cầu hoàn tiền
    getRefundDetails: async (req, res) => {
        try {
            const { refundId } = req.params;

            const refund = await refundService.getRefundDetails(refundId);

            return res.status(200).json({
                success: true,
                refund
            });
        } catch (error) {
            console.error("Lỗi khi lấy chi tiết hoàn tiền:", error);
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
    },

    // Admin phê duyệt yêu cầu hoàn tiền
    approveRefund: async (req, res) => {
        try {
            const { refundId } = req.params;
            const { adminNote } = req.body;

            const refund = await refundService.approveRefund(refundId, adminNote || "Đã phê duyệt");

            return res.status(200).json({
                success: true,
                message: "Đã phê duyệt yêu cầu hoàn tiền",
                refund
            });
        } catch (error) {
            console.error("Lỗi khi phê duyệt hoàn tiền:", error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // Admin từ chối yêu cầu hoàn tiền
    rejectRefund: async (req, res) => {
        try {
            const { refundId } = req.params;
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: "Vui lòng cung cấp lý do từ chối"
                });
            }

            const refund = await refundService.rejectRefund(refundId, reason);

            return res.status(200).json({
                success: true,
                message: "Đã từ chối yêu cầu hoàn tiền",
                refund
            });
        } catch (error) {
            console.error("Lỗi khi từ chối hoàn tiền:", error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
};

export default refundController; 
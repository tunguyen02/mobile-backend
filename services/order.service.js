import mongoose from "mongoose";
import Order from "../models/order.model.js";
import cartService from "./cart.service.js";
import paymentService from "./payment.service.js";
import Payment from "../models/payment.model.js";
import flashSaleService from "./flashSale.service.js";

const orderService = {
    createOrder: async (userId, shippingInfo, paymentMethod, cartWithFlashSale) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Get current cart
            const cart = cartWithFlashSale || await cartService.getMyCart(userId);

            if (!cart || cart.products.length === 0) {
                throw new Error("Cart is empty");
            }

            // Xử lý dữ liệu Flash Sale
            const flashSaleProducts = cartWithFlashSale?.flashSaleProducts || {};

            // Lấy phí vận chuyển (mặc định 30000 nếu không có)
            const shippingFee = cartWithFlashSale?.shippingFee || 30000;

            // Log để debug thông tin Flash Sale
            console.log("Flash Sale Products received:", flashSaleProducts);
            console.log("Cart products:", cart.products.map(p => ({
                id: p.product._id.toString(),
                name: p.product.name,
                price: p.product.price
            })));
            console.log("Shipping fee:", shippingFee);

            // Create new order
            const newOrder = new Order({
                userId,
                products: cart.products.map(item => {
                    const productId = item.product._id.toString();
                    // Sử dụng giá Flash Sale nếu có, nếu không thì dùng giá gốc
                    const price = flashSaleProducts[productId]
                        ? flashSaleProducts[productId].discountPrice
                        : item.product.price;

                    // Lấy giá gốc từ sản phẩm - ưu tiên lấy originalPrice nếu có, không thì lấy price
                    let originalPrice = item.product.originalPrice || item.product.price;

                    // Fix cứng giá gốc cho iPhone 16 để đảm bảo hiển thị đúng
                    if (item.product.name && item.product.name.includes('iPhone 16') && item.isFlashSale) {
                        originalPrice = 19990000; // Giá gốc của iPhone 16
                    }

                    console.log(`Product ${productId} (${item.product.name}): isFlashSale=${!!flashSaleProducts[productId]}, price=${price}, originalPrice=${originalPrice}`);

                    return {
                        product: item.product._id,
                        quantity: item.quantity,
                        price: price,
                        originalPrice: originalPrice,
                        isFlashSale: !!flashSaleProducts[productId]
                    };
                }),
                shippingInfo,
                shippingPrice: shippingFee,
                shippingStatus: "Pending"
            });

            // Save new order
            await newOrder.save({ session });

            // Clear cart
            await cartService.clearCart(userId, session);

            // Initialize payment
            const paymentData = {
                paymentMethod,
                amountPaid: newOrder.totalPrice,
                paymentStatus: paymentMethod === "COD" ? "Pending" : "Pending"
            };

            const payment = await paymentService.createPayment(newOrder._id, paymentData, session);

            await session.commitTransaction();
            await session.endSession();

            // If payment via VNPay, create payment URL
            let paymentUrl = null;
            if (paymentMethod === "VNPay") {
                paymentUrl = await paymentService.createVNPayUrl(newOrder);
            }

            // Cập nhật soldCount cho các sản phẩm Flash Sale
            try {
                for (const item of newOrder.products) {
                    const productId = item.product.toString();
                    if (item.isFlashSale && flashSaleProducts[productId]) {
                        const flashSaleId = flashSaleProducts[productId].flashSaleId;
                        await flashSaleService.updateSoldCount(flashSaleId, productId, item.quantity);
                    }
                }
            } catch (error) {
                console.error('Error updating flash sale sold count:', error);
                // Không throw lỗi ở đây vì đơn hàng đã được tạo thành công
            }

            return {
                newOrder: newOrder.toObject(),
                payment: payment.toObject(),
                paymentUrl
            };
        }
        catch (error) {
            await session.abortTransaction();
            await session.endSession();
            throw new Error(error.message);
        }
    },

    countOrders: async () => {
        try {
            return await Order.countDocuments();
        } catch (error) {
            throw new Error('Failed to count orders: ' + error.message);
        }
    },

    getAllOrders: async () => {
        try {
            const payments = await Payment.find().select('orderId paymentMethod paymentStatus');

            const orders = await Order.find().select("userId shippingInfo.name totalPrice shippingStatus createdAt").populate("userId", "email").sort({ createdAt: -1 });

            const paymentsMap = payments.reduce((map, payment) => {
                map[payment.orderId] = payment;
                return map;
            }, {});

            const ordersInfo = orders.map(order => ({
                order,
                payment: paymentsMap[order._id]
            }));

            return ordersInfo;
        } catch (error) {
            console.error("Error in getAllOrders:", error);
            throw new Error("Lấy thông tin các đơn hàng thất bại");
        }
    },
    getOrderDetails: async (userId, orderId) => {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new Error("OrderId không hợp lệ")
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("UserId không hợp lệ");
        }

        try {
            const order = await Order.findOne({ userId, _id: orderId }).populate("products.product", "id name imageUrl color price originalPrice");
            if (order.userId.toString() !== userId) {
                throw new Error("Đơn hàng không phải của bạn");
            }

            const payment = await Payment.findOne({ orderId });

            return {
                order,
                payment
            };
        }
        catch (error) {
            throw new Error("Lấy thông tin đơn hàng thất bại");
        }
    },

    changeOrderStatus: async (orderId, data) => {
        const { shippingStatus, paymentStatus } = data;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new Error("Orderid không hợp lệ");
        }

        if (!["Pending", "Processing", "Shipping", "Completed", "Cancelled"].includes(shippingStatus)) {
            throw new Error("Trạng thái vận chuyển đơn hàng không hợp lệ");
        }

        if (!["Pending", "Completed", "Expired"].includes(paymentStatus)) {
            throw new Error("Trạng thái thanh toán đơn hàng không hợp lệ");
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            await Order.findByIdAndUpdate(orderId, { shippingStatus }, { session });

            const payment = await Payment.findOne({ orderId });
            payment.paymentStatus = paymentStatus;

            await payment.save({ session });

            await session.commitTransaction();
            await session.endSession();
        }
        catch (error) {
            await session.abortTransaction();
            await session.endSession();
            throw new Error("Cập nhật thông tin đơn hàng thất bại");
        }
    },

    deleteOrder: async (orderId) => {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new Error("OrderId không hợp lệ");
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            await Payment.deleteOne({ orderId }, { session });

            await Order.findByIdAndDelete(orderId, { session });

            await session.commitTransaction();
            await session.endSession();
        }
        catch (error) {
            await session.abortTransaction();
            await session.endSession();
            throw new Error("Xóa đơn hàng thất bại");
        }
    },
    getMyOrders: async (userId) => {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("UserId không hợp lệ");
        }

        try {
            const orders = await Order.find({ userId }).populate("products.product", "id name imageUrl color price originalPrice")
                .sort({ createdAt: -1 });

            return orders;
        }
        catch (error) {
            throw new Error("Lấy thông tin các đơn hàng thất bại");
        }
    },

    // Lấy thông tin đơn hàng công khai cho trang thành công sau khi thanh toán
    getPublicOrderDetails: async (orderId) => {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new Error("OrderId không hợp lệ");
        }

        try {
            const order = await Order.findById(orderId).populate("products.product", "id name imageUrl color price originalPrice");

            if (!order) {
                throw new Error("Đơn hàng không tồn tại");
            }

            const payment = await Payment.findOne({ orderId });

            return {
                order,
                payment
            };
        }
        catch (error) {
            console.error("Lỗi khi lấy thông tin đơn hàng công khai:", error);
            throw error;
        }
    },

    // Chuyển đổi phương thức thanh toán từ VNPay sang COD
    changePaymentMethod: async (orderId, newPaymentMethod) => {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new Error("OrderId không hợp lệ");
        }

        if (newPaymentMethod !== 'COD') {
            throw new Error("Chỉ hỗ trợ chuyển sang phương thức thanh toán COD");
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const payment = await Payment.findOne({ orderId });

            if (!payment) {
                throw new Error("Không tìm thấy thông tin thanh toán");
            }

            if (payment.paymentMethod !== 'VNPay') {
                throw new Error("Chỉ có thể chuyển đổi từ VNPay sang COD");
            }

            if (payment.paymentStatus !== 'Pending') {
                throw new Error("Chỉ có thể chuyển đổi đơn hàng chưa thanh toán");
            }

            // Cập nhật phương thức thanh toán
            payment.paymentMethod = newPaymentMethod;
            await payment.save({ session });

            await session.commitTransaction();
            await session.endSession();

            return {
                message: "Chuyển đổi phương thức thanh toán thành công",
                payment: payment.toObject()
            };
        } catch (error) {
            await session.abortTransaction();
            await session.endSession();
            throw new Error(error.message);
        }
    },

    // Tự động hủy đơn hàng VNPay quá hạn 24h
    autoExpireOrders: async () => {
        try {
            const expiryTime = new Date();
            expiryTime.setHours(expiryTime.getHours() - 24); // 24h trước thời điểm hiện tại

            // Tìm tất cả đơn hàng VNPay chưa thanh toán và được tạo trước thời điểm hết hạn
            const payments = await Payment.find({
                paymentMethod: 'VNPay',
                paymentStatus: 'Pending',
                createdAt: { $lt: expiryTime }
            });

            if (!payments || payments.length === 0) {
                console.log('Không có đơn hàng VNPay nào quá hạn');
                return { count: 0 };
            }

            console.log(`Tìm thấy ${payments.length} đơn hàng VNPay quá hạn`);

            let cancelledCount = 0;
            for (const payment of payments) {
                const session = await mongoose.startSession();
                session.startTransaction();

                try {
                    const order = await Order.findById(payment.orderId);
                    if (!order) {
                        console.log(`Không tìm thấy đơn hàng cho payment ID: ${payment._id}`);
                        continue;
                    }

                    // Cập nhật trạng thái đơn hàng thành "Cancelled"
                    order.shippingStatus = "Cancelled";
                    await order.save({ session });

                    // Không xóa thông tin thanh toán, chỉ đánh dấu là hết hạn
                    payment.paymentStatus = "Expired";
                    await payment.save({ session });

                    await session.commitTransaction();

                    console.log(`Đã hủy đơn hàng ${order._id} do quá hạn thanh toán`);
                    cancelledCount++;
                } catch (error) {
                    await session.abortTransaction();
                    console.error(`Lỗi khi hủy đơn hàng ${payment.orderId}:`, error);
                } finally {
                    session.endSession();
                }
            }

            return {
                count: cancelledCount,
                message: `Đã hủy ${cancelledCount} đơn hàng VNPay quá hạn`
            };
        } catch (error) {
            console.error('Lỗi khi tự động hủy đơn hàng quá hạn:', error);
            throw new Error('Không thể hủy đơn hàng quá hạn: ' + error.message);
        }
    },

    // Hàm cho phép người dùng hủy đơn hàng của họ
    cancelOrderByUser: async (userId, orderId) => {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new Error("OrderId không hợp lệ");
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const order = await Order.findById(orderId);

            if (!order) {
                throw new Error("Đơn hàng không tồn tại");
            }

            // Kiểm tra xem đơn hàng có thuộc về người dùng không
            if (order.userId.toString() !== userId) {
                throw new Error("Bạn không có quyền hủy đơn hàng này");
            }

            // Chỉ cho phép hủy đơn hàng ở trạng thái Pending
            if (order.shippingStatus !== "Pending") {
                throw new Error("Đơn hàng đã được xử lý, không thể hủy");
            }

            // Cập nhật trạng thái đơn hàng thành Cancelled
            order.shippingStatus = "Cancelled";
            await order.save({ session });

            // Cập nhật trạng thái thanh toán nếu đơn hàng là VNPay
            const payment = await Payment.findOne({ orderId });
            if (payment && payment.paymentMethod === "VNPay" && payment.paymentStatus === "Pending") {
                payment.paymentStatus = "Expired";
                await payment.save({ session });
            }

            await session.commitTransaction();
            await session.endSession();

            return {
                success: true,
                message: "Hủy đơn hàng thành công"
            };
        }
        catch (error) {
            await session.abortTransaction();
            await session.endSession();
            throw new Error(`Hủy đơn hàng thất bại: ${error.message}`);
        }
    }
};

export default orderService;

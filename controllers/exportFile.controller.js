import iconv from "iconv-lite";
import { Parser } from "json2csv";
import Brand from "../models/brand.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import Payment from "../models/payment.model.js";

const exportFileController = {
    exportProductCSV: async (req, res) => {
        try {
            const brands = await Brand.find();
            const productsByBrand = [];
            let totalProductCount = 0;
            let totalOrderCount = 0;
            let totalOrderValue = 0;

            for (const brand of brands) {
                const productCount = await Product.countDocuments({ brand: brand._id });
                totalProductCount += productCount;

                productsByBrand.push({
                    Brand: brand.name,
                    ProductCount: productCount,
                });
            }

            const orders = await Order.find();
            totalOrderCount = orders.length;
            orders.forEach(order => {
                totalOrderValue += order.totalPrice;
            });

            productsByBrand.push({
                Brand: "Total Products",
                ProductCount: totalProductCount,
            });
            productsByBrand.push({
                Brand: "Total Orders",
                ProductCount: totalOrderCount,
            });
            productsByBrand.push({
                Brand: "Total Revenue",
                ProductCount: totalOrderValue.toFixed(2),
            });

            const payments = await Payment.find()
                .populate("orderId", "userId products totalPrice shippingStatus")
                .populate({
                    path: "orderId",
                    populate: {
                        path: "products.product",
                        select: "name",
                    },
                })
                .populate({
                    path: "orderId",
                    populate: {
                        path: "userId",
                        select: "name email phoneNumber",
                    },
                });

            const orderDetails = payments.map((payment) => {
                const order = payment.orderId;
                const user = order?.userId || {};

                const productsList = order?.products
                    .map((item) => `${item.product?.name || "Unknown"} (x${item.quantity})`)
                    .join(", ") || "No Products";

                return {
                    orderId: order?._id || "N/A",
                    userName: user.name || "No Name",
                    userEmail: user.email || "No Email",
                    userPhone: user.phoneNumber || "No Phone",
                    totalPrice: order?.totalPrice || 0,
                    productsList,
                    paymentMethod: payment.paymentMethod || "N/A",
                    paymentStatus: payment.paymentStatus || "N/A",
                    shippingStatus: order?.shippingStatus || "N/A",
                };
            });

            const fieldsBrandOverview = ["Brand", "ProductCount"];
            const fieldsOrderDetails = [
                "orderId",
                "userName",
                "userEmail",
                "userPhone",
                "productsList",
                "totalPrice",
                "paymentMethod",
                "paymentStatus",
                "shippingStatus"
            ];

            const json2csvParserBrand = new Parser({ fields: fieldsBrandOverview });
            const csvBrandOverview = json2csvParserBrand.parse(productsByBrand);

            const json2csvParserOrder = new Parser({ fields: fieldsOrderDetails });
            const csvOrderDetails = json2csvParserOrder.parse(orderDetails);

            const BOM = "\uFEFF";
            const finalCSV = `Bang Tong Quan San Pham Va Nguoi Dung\n${csvBrandOverview}\n\nBang Thong Tin Don Hang\n${csvOrderDetails}`;

            const csvBuffer = iconv.encode(BOM + finalCSV, "windows-1252");

            res.header("Content-Type", "text/csv; charset=windows-1252");
            res.header("Content-Disposition", "attachment; filename=product_report.csv");
            res.status(200).send(csvBuffer);
        } catch (error) {
            console.error("Error exporting CSV:", error);
            res.status(400).json({
                message: "Failed to export CSV.",
            });
        }
    },
};

export default exportFileController;
